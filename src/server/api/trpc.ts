/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";

import { db } from "~/server/db";
import {
  type SessionData,
  type UserRole,
  sessionOptions,
} from "~/lib/session";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  ownerId: string | null;
};

export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Obtener la sesión del usuario desde las cookies
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // Resuelve el usuario autenticado contra la base (no confiar en el payload de
  // la cookie para autorización: puede tener hasta 7 días de antigüedad). Se
  // memoiza porque createTRPCContext corre una sola vez por request HTTP, así
  // que un batch de tRPC comparte esta misma promesa.
  let authUserPromise: Promise<AuthUser | null> | undefined;
  const getAuthUser = (): Promise<AuthUser | null> => {
    authUserPromise ??= session.user
      ? db.user
          .findUnique({
            where: { id: session.user.id },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              ownerId: true,
            },
          })
          .then((u) => (u ? { ...u, role: u.role as UserRole } : null))
      : Promise.resolve(null);
    return authUserPromise;
  };

  return {
    db,
    session,
    getAuthUser,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Tenant middleware - verifica que el usuario esté autenticado (revalidando
 * contra la base) e inyecta ctx.tenantId = ownerId ?? id.
 */
const tenantMiddleware = t.middleware(async ({ ctx, next }) => {
  const user = await ctx.getAuthUser();

  if (!user) {
    // OJO: no llamar ctx.session.destroy() acá. Este middleware también corre
    // bajo el caller RSC (src/trpc/server.ts), donde mutar cookies durante el
    // render de un Server Component tira excepción. El cliente redirige a
    // /login solo (ver src/components/app-shell.tsx) al ver user === null.
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Debes iniciar sesión para realizar esta acción",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
      tenantId: user.ownerId ?? user.id,
    },
  });
});

/**
 * Protected procedure - requiere autenticación. Expone ctx.user y ctx.tenantId
 * (string no-nullable) a toda procedure que la use.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(tenantMiddleware);

/**
 * Admin procedure - requiere rol de admin dentro del tenant. El middleware se
 * declara inline (no vía t.middleware() standalone) para que TypeScript infiera
 * ctx.user/ctx.tenantId ya acumulados por protectedProcedure.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes permisos para realizar esta acción",
    });
  }

  return next({ ctx });
});

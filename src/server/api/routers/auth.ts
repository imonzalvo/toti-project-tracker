import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import { tenantUserFilter } from "~/server/api/tenant";
import { env } from "~/env";

export const UserRole = {
  ADMIN: "ADMIN",
  GUEST: "GUEST",
} as const;

function codigoValido(codigo: string): boolean {
  const a = Buffer.from(codigo);
  const b = Buffer.from(env.REGISTRO_CODIGO);
  // Comparación en tiempo constante para no filtrar el código carácter a carácter.
  return a.length === b.length && timingSafeEqual(a, b);
}

export const authRouter = createTRPCRouter({
  // Registrar una organización nueva: crea un usuario ADMIN raíz de un tenant
  // nuevo (ownerId: null) y loguea automáticamente. Requiere código de invitación.
  registro: publicProcedure
    .input(
      z.object({
        nombre: z.string().min(1, "Nombre requerido"),
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        codigo: z.string().min(1, "Código de invitación requerido"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!codigoValido(input.codigo)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Código de invitación inválido",
        });
      }

      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe una cuenta con ese email",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.nombre,
          role: "ADMIN",
          ownerId: null, // raíz de un tenant nuevo
        },
      });

      // Login automático
      ctx.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "ADMIN" | "GUEST",
      };
      await ctx.session.save();

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Contraseña requerida"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Global: el email es único en toda la base, el tenant se deriva de la
      // fila encontrada (ownerId ?? id). No requiere estar scopeado.
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales inválidas",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales inválidas",
        });
      }

      // Guardar sesión
      ctx.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "ADMIN" | "GUEST",
      };
      await ctx.session.save();

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Logout
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.session.destroy();
    return { success: true };
  }),

  // Obtener usuario actual (revalida contra la base, no solo la cookie)
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    const user = await ctx.getAuthUser();
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }),

  // Crear usuario dentro del propio tenant (solo admin)
  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        name: z.string().min(1, "Nombre requerido"),
        role: z.enum(["ADMIN", "GUEST"]).default("GUEST"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // El email es único a nivel global (un usuario pertenece a un solo tenant)
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe una cuenta con ese email",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: input.role,
          ownerId: ctx.tenantId,
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Listar usuarios del tenant (solo admin)
  getUsers: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: tenantUserFilter(ctx.tenantId),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return users;
  }),

  // Eliminar usuario del tenant (solo admin, no puede eliminarse a sí mismo
  // ni al propietario de la cuenta)
  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No puedes eliminar tu propio usuario",
        });
      }

      if (input.id === ctx.tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede eliminar al propietario de la cuenta",
        });
      }

      const { count } = await ctx.db.user.deleteMany({
        where: { id: input.id, ownerId: ctx.tenantId },
      });

      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      return { success: true };
    }),

  // Actualizar contraseña de un usuario del tenant (solo admin)
  updateUserPassword: adminProcedure
    .input(
      z.object({
        id: z.string(),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const { count } = await ctx.db.user.updateMany({
        where: { AND: [{ id: input.id }, tenantUserFilter(ctx.tenantId)] },
        data: { password: hashedPassword },
      });

      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      return { success: true };
    }),
});

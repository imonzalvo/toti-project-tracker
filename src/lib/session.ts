import type { SessionOptions } from "iron-session";
import { env } from "~/env";

export type UserRole = "ADMIN" | "GUEST";

// Solo `id` se usa para autorización (se revalida contra la base en cada request
// vía tRPC context). email/name/role son hints de display únicamente: pueden estar
// desactualizados hasta 7 días (duración de la cookie) y no deben usarse para
// decidir permisos ni tenant en el servidor.
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SessionData {
  user?: SessionUser;
}

export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "toti-session",
  cookieOptions: {
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 semana
  },
};

export const defaultSession: SessionData = {
  user: undefined,
};

import type { SessionOptions } from "iron-session";
import { env } from "~/env";

export type UserRole = "ADMIN" | "GUEST";

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

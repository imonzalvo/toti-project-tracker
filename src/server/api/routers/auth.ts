import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const UserRole = {
  ADMIN: "ADMIN",
  GUEST: "GUEST",
} as const;

export const authRouter = createTRPCRouter({
  // Verificar si ya existe un admin (para setup inicial)
  checkSetup: publicProcedure.query(async ({ ctx }) => {
    const adminCount = await ctx.db.user.count({
      where: { role: "ADMIN" },
    });
    return {
      needsSetup: adminCount === 0,
    };
  }),

  // Crear el primer admin (solo si no existe ninguno)
  setupAdmin: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        name: z.string().min(1, "Nombre requerido"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar que no exista ningún admin
      const adminCount = await ctx.db.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ya existe un administrador registrado",
        });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Crear el admin
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: "ADMIN",
        },
      });

      // Guardar sesión
      ctx.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "ADMIN" | "GUEST",
      };
      await ctx.session.save();
      console.log("[AUTH] Session saved for setupAdmin:", ctx.session.user.email);

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
      console.log("[AUTH] Session saved for login:", ctx.session.user.email);

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

  // Obtener usuario actual
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    return ctx.user;
  }),

  // Crear usuario guest (solo admin)
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
      // Verificar si el email ya existe
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un usuario con ese email",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: input.role,
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

  // Listar usuarios (solo admin)
  getUsers: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
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

  // Eliminar usuario (solo admin, no puede eliminarse a sí mismo)
  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No puedes eliminar tu propio usuario",
        });
      }

      await ctx.db.user.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Actualizar contraseña de usuario (solo admin)
  updateUserPassword: adminProcedure
    .input(
      z.object({
        id: z.string(),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);

      await ctx.db.user.update({
        where: { id: input.id },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),
});

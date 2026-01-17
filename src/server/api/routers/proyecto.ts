import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

// Enums para estados
export const EstadoProyecto = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
} as const;

// Enums para moneda
export const Moneda = {
  UYU: "UYU",
  USD: "USD",
} as const;

export const proyectoRouter = createTRPCRouter({
  // Obtener todos los proyectos (filtrado por moneda) - sin paginación
  getAll: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const proyectos = await ctx.db.proyecto.findMany({
        where: {
          moneda: input.moneda,
        },
        include: {
          facturaciones: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calcular porcentajes facturados y cobrados para cada proyecto
      return proyectos.map((proyecto) => {
        const totalFacturado = proyecto.facturaciones.reduce(
          (sum, f) => sum + f.porcentaje,
          0
        );
        const totalCobrado = proyecto.facturaciones
          .filter((f) => f.estado === "COBRADA")
          .reduce((sum, f) => sum + f.porcentaje, 0);

        return {
          ...proyecto,
          porcentajeFacturado: totalFacturado,
          porcentajeCobrado: totalCobrado,
        };
      });
    }),

  // Obtener proyectos paginados con filtros
  getPaginated: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        estado: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]).optional(),
        nombre: z.string().optional(),
        identificador: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { moneda, page, pageSize, estado, nombre, identificador } = input;
      const skip = (page - 1) * pageSize;

      // Construir el where clause
      const where = {
        moneda,
        ...(estado && { estado }),
        ...(nombre && {
          nombre: {
            contains: nombre,
          },
        }),
        ...(identificador && {
          identificador: {
            contains: identificador,
          },
        }),
      };

      // Obtener total para paginación
      const total = await ctx.db.proyecto.count({ where });

      // Obtener proyectos paginados
      const proyectos = await ctx.db.proyecto.findMany({
        where,
        include: {
          facturaciones: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      });

      // Calcular porcentajes facturados y cobrados para cada proyecto
      const proyectosConPorcentajes = proyectos.map((proyecto) => {
        const totalFacturado = proyecto.facturaciones.reduce(
          (sum, f) => sum + f.porcentaje,
          0
        );
        const totalCobrado = proyecto.facturaciones
          .filter((f) => f.estado === "COBRADA")
          .reduce((sum, f) => sum + f.porcentaje, 0);

        return {
          ...proyecto,
          porcentajeFacturado: totalFacturado,
          porcentajeCobrado: totalCobrado,
        };
      });

      return {
        proyectos: proyectosConPorcentajes,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Obtener un proyecto por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const proyecto = await ctx.db.proyecto.findUnique({
        where: { id: input.id },
        include: {
          facturaciones: {
            orderBy: {
              fechaFacturacion: "desc",
            },
          },
        },
      });

      if (!proyecto) {
        throw new Error("Proyecto no encontrado");
      }

      const totalFacturado = proyecto.facturaciones.reduce(
        (sum, f) => sum + f.porcentaje,
        0
      );
      const totalCobrado = proyecto.facturaciones
        .filter((f) => f.estado === "COBRADA")
        .reduce((sum, f) => sum + f.porcentaje, 0);

      const montoFacturado = proyecto.facturaciones.reduce(
        (sum, f) => sum + f.monto,
        0
      );
      const montoCobrado = proyecto.facturaciones
        .filter((f) => f.estado === "COBRADA")
        .reduce((sum, f) => sum + f.monto, 0);

      return {
        ...proyecto,
        porcentajeFacturado: totalFacturado,
        porcentajeCobrado: totalCobrado,
        montoFacturado,
        montoCobrado,
      };
    }),

  // Crear proyecto (solo admin)
  create: adminProcedure
    .input(
      z.object({
        identificador: z.string().min(1, "Identificador requerido"),
        nombre: z.string().min(1, "Nombre requerido"),
        montoTotal: z.number().positive("El monto debe ser positivo"),
        comisionPct: z
          .number()
          .min(0, "Comisión mínima 0%")
          .max(100, "Comisión máxima 100%"),
        moneda: z.enum(["UYU", "USD"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.proyecto.create({
        data: {
          identificador: input.identificador,
          nombre: input.nombre,
          montoTotal: input.montoTotal,
          comisionPct: input.comisionPct,
          estado: EstadoProyecto.NOT_STARTED,
          moneda: input.moneda,
        },
      });
    }),

  // Actualizar proyecto (solo admin)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        nombre: z.string().min(1).optional(),
        comisionPct: z.number().min(0).max(100).optional(),
        estado: z
          .enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.proyecto.update({
        where: { id },
        data,
      });
    }),

  // Eliminar proyecto (solo admin)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.proyecto.delete({
        where: { id: input.id },
      });
    }),

  // Obtener estadísticas generales para el dashboard (filtrado por moneda)
  getStats: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const proyectos = await ctx.db.proyecto.findMany({
        where: {
          moneda: input.moneda,
        },
        include: {
          facturaciones: true,
        },
      });

      const totalProyectos = proyectos.length;
      const proyectosActivos = proyectos.filter(
        (p) => p.estado === "IN_PROGRESS"
      ).length;

      let totalFacturado = 0;
      let totalCobrado = 0;
      let totalPendiente = 0;

      proyectos.forEach((proyecto) => {
        proyecto.facturaciones.forEach((f) => {
          totalFacturado += f.monto;
          if (f.estado === "COBRADA") {
            totalCobrado += f.monto;
          } else {
            totalPendiente += f.monto;
          }
        });
      });

      return {
        totalProyectos,
        proyectosActivos,
        totalFacturado,
        totalCobrado,
        totalPendiente,
        moneda: input.moneda,
      };
    }),
});

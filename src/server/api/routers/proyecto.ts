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
          identifier_num: "desc",
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
          identifier_num: "desc",
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
        project_approved_at: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const identifier_num = parseInt(input.identificador, 10);
      if (isNaN(identifier_num)) {
        throw new Error("El identificador debe ser un número entero");
      }

      return ctx.db.proyecto.create({
        data: {
          identificador: input.identificador,
          identifier_num,
          nombre: input.nombre,
          montoTotal: input.montoTotal,
          comisionPct: input.comisionPct,
          estado: EstadoProyecto.NOT_STARTED,
          moneda: input.moneda,
          project_approved_at: input.project_approved_at ?? new Date(),
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
        project_approved_at: z.date().optional(),
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

  // Obtener métricas para un rango de fechas
  getMetrics: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
        fechaDesde: z.date(),
        fechaHasta: z.date(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { moneda, fechaDesde, fechaHasta, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      const whereProyecto = {
        moneda,
        project_approved_at: { gte: fechaDesde, lte: fechaHasta },
      };

      const [
        presupuestoAggregate,
        totalProyectos,
        todosLosProyectos,
        proyectosPagina,
      ] = await Promise.all([
        ctx.db.proyecto.aggregate({
          where: whereProyecto,
          _sum: { montoTotal: true },
        }),
        ctx.db.proyecto.count({ where: whereProyecto }),
        // Todos los proyectos del rango (sin paginar) para la gráfica por mes
        ctx.db.proyecto.findMany({
          where: whereProyecto,
          select: { project_approved_at: true, montoTotal: true },
        }),
        // Proyectos paginados con sus facturaciones
        ctx.db.proyecto.findMany({
          where: whereProyecto,
          include: { facturaciones: true },
          orderBy: { identifier_num: "desc" },
          skip,
          take: pageSize,
        }),
      ]);

      // Totales de facturaciones de los proyectos en el rango
      const proyectoIds = proyectosPagina.map((p) => p.id);
      const [facturadoAggregate, cobradoAggregate] = await Promise.all([
        ctx.db.facturacion.aggregate({
          where: { proyectoId: { in: proyectoIds } },
          _sum: { monto: true },
        }),
        ctx.db.facturacion.aggregate({
          where: { proyectoId: { in: proyectoIds }, estado: "COBRADA" },
          _sum: { monto: true },
        }),
      ]);

      // Agrupar por mes para la gráfica
      const porMesMap = new Map<string, { mes: number; anio: number; total: number }>();
      todosLosProyectos.forEach(({ project_approved_at, montoTotal }) => {
        const mes = project_approved_at.getUTCMonth() + 1;
        const anio = project_approved_at.getUTCFullYear();
        const key = `${anio}-${mes}`;
        const existing = porMesMap.get(key);
        if (existing) {
          existing.total += montoTotal;
        } else {
          porMesMap.set(key, { mes, anio, total: montoTotal });
        }
      });
      const porMes = Array.from(porMesMap.values()).sort(
        (a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes
      );

      // Proyectos con montos calculados
      const proyectosConMontos = proyectosPagina.map((proyecto) => {
        const montoFacturado = proyecto.facturaciones.reduce((sum, f) => sum + f.monto, 0);
        const montoCobrado = proyecto.facturaciones
          .filter((f) => f.estado === "COBRADA")
          .reduce((sum, f) => sum + f.monto, 0);
        const { facturaciones: _, ...rest } = proyecto;
        return { ...rest, montoFacturado, montoCobrado };
      });

      return {
        totales: {
          presupuesto: presupuestoAggregate._sum.montoTotal ?? 0,
          facturado: facturadoAggregate._sum.monto ?? 0,
          cobrado: cobradoAggregate._sum.monto ?? 0,
          proyectos: totalProyectos,
        },
        porMes,
        proyectos: proyectosConMontos,
        pagination: {
          page,
          pageSize,
          total: totalProyectos,
          totalPages: Math.ceil(totalProyectos / pageSize),
        },
      };
    }),

  // Obtener estadísticas generales para el dashboard (filtrado por moneda)
  getStats: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear + 1, 0, 1);

      const [
        totalProyectos,
        proyectosActivos,
        facturacionPorEstado,
        presupuestoAggregate,
      ] = await Promise.all([
        ctx.db.proyecto.count({ where: { moneda: input.moneda } }),
        ctx.db.proyecto.count({ where: { moneda: input.moneda, estado: "IN_PROGRESS" } }),
        ctx.db.facturacion.groupBy({
          by: ["estado"],
          where: { proyecto: { moneda: input.moneda } },
          _sum: { monto: true },
        }),
        ctx.db.proyecto.aggregate({
          where: {
            moneda: input.moneda,
            project_approved_at: { gte: yearStart, lt: yearEnd },
          },
          _sum: { montoTotal: true },
        }),
      ]);

      const totalFacturado = facturacionPorEstado.reduce((sum, g) => sum + (g._sum.monto ?? 0), 0);
      const totalCobrado = facturacionPorEstado.find((g) => g.estado === "COBRADA")?._sum.monto ?? 0;

      return {
        totalProyectos,
        proyectosActivos,
        totalFacturado,
        totalCobrado,
        totalPendiente: totalFacturado - totalCobrado,
        presupuestoAnioActual: presupuestoAggregate._sum.montoTotal ?? 0,
        anioActual: currentYear,
        moneda: input.moneda,
      };
    }),
});

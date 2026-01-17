import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

// Enums para estados y tipos
export const EstadoFacturacion = {
  EMITIDA: "EMITIDA",
  COBRADA: "COBRADA",
} as const;

export const TipoFacturacion = {
  APROBACION: "APROBACION",
  ENTREGA_PARCIAL: "ENTREGA_PARCIAL",
  ENTREGA_TOTAL: "ENTREGA_TOTAL",
} as const;

// Helper para obtener el trimestre de una fecha
function getTrimestre(fecha: Date): { year: number; quarter: number } {
  const month = fecha.getMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1; // 1-4
  return { year: fecha.getFullYear(), quarter };
}

// Helper para obtener rango de fechas de un trimestre
function getTrimestreDates(year: number, quarter: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

export const facturacionRouter = createTRPCRouter({
  // Obtener todas las facturaciones (filtrado por moneda del proyecto) - sin paginación
  getAll: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
        proyectoId: z.string().optional(),
        estado: z.enum(["EMITIDA", "COBRADA"]).optional(),
        year: z.number().optional(),
        quarter: z.number().min(1).max(4).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        proyecto: {
          moneda: input.moneda,
        },
      };

      if (input.proyectoId) {
        where.proyectoId = input.proyectoId;
      }

      if (input.estado) {
        where.estado = input.estado;
      }

      if (input.year && input.quarter) {
        const { start, end } = getTrimestreDates(input.year, input.quarter);
        where.fechaCobro = {
          gte: start,
          lte: end,
        };
      }

      return ctx.db.facturacion.findMany({
        where,
        include: {
          proyecto: true,
        },
        orderBy: {
          fechaFacturacion: "desc",
        },
      });
    }),

  // Obtener facturaciones paginadas con filtros (para vista global)
  getPaginated: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        proyectoId: z.string().optional(),
        estado: z.enum(["EMITIDA", "COBRADA"]).optional(),
        fechaDesde: z.date().optional(),
        fechaHasta: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { moneda, page, pageSize, proyectoId, estado, fechaDesde, fechaHasta } = input;
      const skip = (page - 1) * pageSize;

      // Construir el where clause
      const where: Record<string, unknown> = {
        proyecto: {
          moneda,
        },
      };

      if (proyectoId) {
        where.proyectoId = proyectoId;
      }

      if (estado) {
        where.estado = estado;
      }

      // Filtro por rango de fechas de facturación
      if (fechaDesde || fechaHasta) {
        where.fechaFacturacion = {
          ...(fechaDesde && { gte: fechaDesde }),
          ...(fechaHasta && { lte: new Date(fechaHasta.getTime() + 24 * 60 * 60 * 1000 - 1) }), // Incluir todo el día
        };
      }

      // Obtener total y totales para paginación y resumen
      const [total, facturaciones, totales] = await Promise.all([
        ctx.db.facturacion.count({ where }),
        ctx.db.facturacion.findMany({
          where,
          include: {
            proyecto: true,
          },
          orderBy: {
            fechaFacturacion: "desc",
          },
          skip,
          take: pageSize,
        }),
        // Calcular totales de todas las facturaciones filtradas (no solo la página actual)
        ctx.db.facturacion.aggregate({
          where,
          _sum: {
            monto: true,
          },
        }),
      ]);

      // Calcular totales por estado
      const [totalCobrado, totalPendiente] = await Promise.all([
        ctx.db.facturacion.aggregate({
          where: { ...where, estado: "COBRADA" },
          _sum: { monto: true },
        }),
        ctx.db.facturacion.aggregate({
          where: { ...where, estado: "EMITIDA" },
          _sum: { monto: true },
        }),
      ]);

      return {
        facturaciones,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        totales: {
          total: totales._sum.monto ?? 0,
          cobrado: totalCobrado._sum.monto ?? 0,
          pendiente: totalPendiente._sum.monto ?? 0,
        },
      };
    }),

  // Obtener facturaciones pendientes (no cobradas, filtrado por moneda)
  getPendientes: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.facturacion.findMany({
        where: {
          estado: "EMITIDA",
          proyecto: {
            moneda: input.moneda,
          },
        },
        include: {
          proyecto: true,
        },
        orderBy: {
          fechaFacturacion: "asc",
        },
      });
    }),

  // Obtener últimas facturaciones cobradas (filtrado por moneda)
  getUltimasCobradas: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
        limit: z.number().default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.facturacion.findMany({
        where: {
          estado: "COBRADA",
          proyecto: {
            moneda: input.moneda,
          },
        },
        include: {
          proyecto: true,
        },
        orderBy: {
          fechaCobro: "desc",
        },
        take: input.limit,
      });
    }),

  // Crear facturación (solo admin)
  create: adminProcedure
    .input(
      z.object({
        proyectoId: z.string(),
        descripcion: z.enum(["APROBACION", "ENTREGA_PARCIAL", "ENTREGA_TOTAL"]),
        porcentaje: z.number().positive().max(100),
        fechaFacturacion: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Obtener el proyecto para calcular el monto
      const proyecto = await ctx.db.proyecto.findUnique({
        where: { id: input.proyectoId },
        include: { facturaciones: true },
      });

      if (!proyecto) {
        throw new Error("Proyecto no encontrado");
      }

      const tieneAprobacion = proyecto.facturaciones.some(
        (f) => f.descripcion === "APROBACION"
      );
      const tieneEntregaTotal = proyecto.facturaciones.some(
        (f) => f.descripcion === "ENTREGA_TOTAL"
      );

      // Regla: Si ya existe ENTREGA_TOTAL, no se pueden crear más facturas
      if (tieneEntregaTotal) {
        throw new Error(
          "No se pueden crear más facturaciones. El proyecto ya tiene una Entrega Total."
        );
      }

      // Regla: La primera factura SIEMPRE debe ser APROBACION
      if (proyecto.facturaciones.length === 0 && input.descripcion !== "APROBACION") {
        throw new Error(
          "La primera facturación de un proyecto debe ser de tipo Aprobación."
        );
      }

      // Regla: Solo puede existir UNA factura de tipo APROBACION
      if (input.descripcion === "APROBACION" && tieneAprobacion) {
        throw new Error(
          "El proyecto ya tiene una facturación de Aprobación. Solo se permite una."
        );
      }

      // Validar que no se supere el 100% de facturación
      const totalFacturado = proyecto.facturaciones.reduce(
        (sum, f) => sum + f.porcentaje,
        0
      );

      if (totalFacturado + input.porcentaje > 100) {
        throw new Error(
          `No se puede facturar más del 100%. Actualmente facturado: ${totalFacturado}%`
        );
      }

      // Regla: ENTREGA_TOTAL debe usar exactamente el saldo restante
      const porcentajeDisponible = 100 - totalFacturado;
      if (input.descripcion === "ENTREGA_TOTAL" && input.porcentaje !== porcentajeDisponible) {
        throw new Error(
          `La Entrega Total debe ser exactamente el saldo restante: ${porcentajeDisponible}%`
        );
      }

      // Calcular el monto
      const monto = (proyecto.montoTotal * input.porcentaje) / 100;

      return ctx.db.facturacion.create({
        data: {
          proyectoId: input.proyectoId,
          descripcion: input.descripcion,
          porcentaje: input.porcentaje,
          monto,
          fechaFacturacion: input.fechaFacturacion,
          estado: "EMITIDA",
        },
      });
    }),

  // Marcar facturación como cobrada (solo admin)
  marcarCobrada: adminProcedure
    .input(
      z.object({
        id: z.string(),
        fechaCobro: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.facturacion.update({
        where: { id: input.id },
        data: {
          estado: "COBRADA",
          fechaCobro: input.fechaCobro,
        },
      });
    }),

  // Marcar facturación como no cobrada (revertir cobro, solo admin)
  marcarNoCobrada: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.facturacion.update({
        where: { id: input.id },
        data: {
          estado: "EMITIDA",
          fechaCobro: null,
        },
      });
    }),

  // Eliminar facturación (solo admin)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Obtener la facturación para verificar si es APROBACION
      const facturacion = await ctx.db.facturacion.findUnique({
        where: { id: input.id },
      });

      if (!facturacion) {
        throw new Error("Facturación no encontrada");
      }

      // Regla: No se puede eliminar la factura de APROBACION
      if (facturacion.descripcion === "APROBACION") {
        throw new Error(
          "No se puede eliminar la facturación de Aprobación. Solo se puede modificar su porcentaje."
        );
      }

      return ctx.db.facturacion.delete({
        where: { id: input.id },
      });
    }),

  // Editar porcentaje de una facturación (solo admin)
  updatePorcentaje: adminProcedure
    .input(
      z.object({
        id: z.string(),
        porcentaje: z.number().positive().max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Obtener la facturación con su proyecto
      const facturacion = await ctx.db.facturacion.findUnique({
        where: { id: input.id },
        include: {
          proyecto: {
            include: { facturaciones: true },
          },
        },
      });

      if (!facturacion) {
        throw new Error("Facturación no encontrada");
      }

      // Calcular el total facturado excluyendo esta facturación
      const totalFacturadoOtras = facturacion.proyecto.facturaciones
        .filter((f) => f.id !== input.id)
        .reduce((sum, f) => sum + f.porcentaje, 0);

      // Validar que no se supere el 100%
      if (totalFacturadoOtras + input.porcentaje > 100) {
        throw new Error(
          `No se puede facturar más del 100%. Máximo disponible: ${100 - totalFacturadoOtras}%`
        );
      }

      // Regla: Si es ENTREGA_TOTAL, debe usar exactamente el saldo restante
      const porcentajeDisponible = 100 - totalFacturadoOtras;
      if (facturacion.descripcion === "ENTREGA_TOTAL" && input.porcentaje !== porcentajeDisponible) {
        throw new Error(
          `La Entrega Total debe ser exactamente el saldo restante: ${porcentajeDisponible}%`
        );
      }

      // Calcular el nuevo monto
      const monto = (facturacion.proyecto.montoTotal * input.porcentaje) / 100;

      return ctx.db.facturacion.update({
        where: { id: input.id },
        data: {
          porcentaje: input.porcentaje,
          monto,
        },
      });
    }),

  // Obtener cobros trimestrales (caso principal, filtrado por moneda)
  getCobrosTrimestre: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
        year: z.number(),
        quarter: z.number().min(1).max(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getTrimestreDates(input.year, input.quarter);

      // Obtener todas las facturaciones cobradas en el periodo (filtrado por moneda)
      const facturaciones = await ctx.db.facturacion.findMany({
        where: {
          estado: "COBRADA",
          fechaCobro: {
            gte: start,
            lte: end,
          },
          proyecto: {
            moneda: input.moneda,
          },
        },
        include: {
          proyecto: true,
        },
        orderBy: {
          fechaCobro: "asc",
        },
      });

      // Agrupar por proyecto
      const proyectosMap = new Map<
        string,
        {
          proyecto: {
            id: string;
            identificador: string;
            nombre: string;
            comisionPct: number;
          };
          facturaciones: typeof facturaciones;
          totalCobrado: number;
          comision: number;
        }
      >();

      facturaciones.forEach((f) => {
        const key = f.proyectoId;
        if (!proyectosMap.has(key)) {
          proyectosMap.set(key, {
            proyecto: {
              id: f.proyecto.id,
              identificador: f.proyecto.identificador,
              nombre: f.proyecto.nombre,
              comisionPct: f.proyecto.comisionPct,
            },
            facturaciones: [],
            totalCobrado: 0,
            comision: 0,
          });
        }
        const entry = proyectosMap.get(key)!;
        entry.facturaciones.push(f);
        entry.totalCobrado += f.monto;
        entry.comision += (f.monto * f.proyecto.comisionPct) / 100;
      });

      const proyectos = Array.from(proyectosMap.values());
      const totalGeneral = proyectos.reduce((sum, p) => sum + p.totalCobrado, 0);
      const comisionTotal = proyectos.reduce((sum, p) => sum + p.comision, 0);

      return {
        year: input.year,
        quarter: input.quarter,
        periodo: {
          inicio: start,
          fin: end,
        },
        proyectos,
        totalGeneral,
        comisionTotal,
      };
    }),

  // Obtener lista de trimestres disponibles (filtrado por moneda)
  getTrimestresDisponibles: protectedProcedure
    .input(
      z.object({
        moneda: z.enum(["UYU", "USD"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const facturaciones = await ctx.db.facturacion.findMany({
        where: {
          estado: "COBRADA",
          fechaCobro: { not: null },
          proyecto: {
            moneda: input.moneda,
          },
        },
        select: {
          fechaCobro: true,
        },
      });

      const trimestres = new Set<string>();
      const currentDate = new Date();
      const currentTrimestre = getTrimestre(currentDate);

      // Agregar trimestre actual
      trimestres.add(`${currentTrimestre.year}-Q${currentTrimestre.quarter}`);

      // Agregar trimestres con cobros
      facturaciones.forEach((f) => {
        if (f.fechaCobro) {
          const t = getTrimestre(f.fechaCobro);
          trimestres.add(`${t.year}-Q${t.quarter}`);
        }
      });

      return Array.from(trimestres)
        .map((t) => {
          const [year, q] = t.split("-Q");
          return { year: parseInt(year!), quarter: parseInt(q!) };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.quarter - a.quarter;
        });
    }),
});

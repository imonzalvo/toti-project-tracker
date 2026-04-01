"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { formatCurrency } from "~/lib/formatters";
import { useCuenta } from "~/lib/cuenta-context";
import {
  FolderKanban,
  PlayCircle,
  FileText,
  CheckCircle2,
  Clock,
  CalendarCheck,
} from "lucide-react";

export function DashboardStats() {
  const { moneda } = useCuenta();
  const { data: stats } = api.proyecto.getStats.useQuery({ moneda });

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Proyectos",
      value: stats.totalProyectos.toString(),
      description: "Proyectos registrados",
      icon: FolderKanban,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      accentColor: "from-blue-500/20 via-blue-500/5 to-transparent",
      featured: false,
    },
    {
      title: "Proyectos Activos",
      value: stats.proyectosActivos.toString(),
      description: "En progreso",
      icon: PlayCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      accentColor: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      featured: false,
    },
    {
      title: `Aprobado ${stats.anioActual}`,
      value: formatCurrency(stats.presupuestoAnioActual, moneda),
      description: `Presupuesto aprobado en ${stats.anioActual}`,
      icon: CalendarCheck,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      accentColor: "from-orange-500/25 via-orange-500/10 to-transparent",
      featured: true,
    },
    {
      title: "Total Facturado",
      value: formatCurrency(stats.totalFacturado, moneda),
      description: "Monto total emitido",
      icon: FileText,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      accentColor: "from-violet-500/20 via-violet-500/5 to-transparent",
      featured: false,
    },
    {
      title: "Total Cobrado",
      value: formatCurrency(stats.totalCobrado, moneda),
      description: "Pagos recibidos",
      icon: CheckCircle2,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
      accentColor: "from-teal-500/20 via-teal-500/5 to-transparent",
      featured: false,
    },
    {
      title: "Pendiente de Cobro",
      value: formatCurrency(stats.totalPendiente, moneda),
      description: "Por cobrar",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      accentColor: "from-amber-500/20 via-amber-500/5 to-transparent",
      featured: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {statCards.map((stat) => (
        <Card
          key={stat.title}
          className={`group relative overflow-hidden border-0 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            stat.featured
              ? "bg-gradient-to-br from-orange-50 via-background to-background"
              : "bg-gradient-to-br from-background via-background to-muted/20"
          }`}
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accentColor}`} />
          <div
            className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${
              stat.featured ? "bg-orange-200/50" : "bg-white/0"
            }`}
          />
          <CardHeader className="flex flex-row items-start justify-between p-4 pb-2 sm:p-6 sm:pb-3">
            <div className="space-y-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 sm:text-sm">
                {stat.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground sm:text-sm">{stat.description}</p>
            </div>
            <div
              className={`rounded-2xl p-2.5 shadow-sm ring-1 ring-black/5 sm:p-3 ${
                stat.bgColor
              } ${stat.featured ? "scale-105" : ""}`}
            >
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div
              className={`tracking-tight ${
                stat.featured
                  ? "text-2xl font-semibold sm:text-4xl"
                  : "text-xl font-semibold sm:text-3xl"
              }`}
            >
              {stat.value}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${stat.bgColor}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {stat.featured ? "Objetivo anual" : "Resumen del dashboard"}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

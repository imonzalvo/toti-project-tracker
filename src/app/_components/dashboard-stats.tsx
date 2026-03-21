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
    },
    {
      title: "Proyectos Activos",
      value: stats.proyectosActivos.toString(),
      description: "En progreso",
      icon: PlayCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Total Facturado",
      value: formatCurrency(stats.totalFacturado, moneda),
      description: "Monto total emitido",
      icon: FileText,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
    {
      title: "Total Cobrado",
      value: formatCurrency(stats.totalCobrado, moneda),
      description: "Pagos recibidos",
      icon: CheckCircle2,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
    },
    {
      title: "Pendiente de Cobro",
      value: formatCurrency(stats.totalPendiente, moneda),
      description: "Por cobrar",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: `Aprobado ${stats.anioActual}`,
      value: formatCurrency(stats.presupuestoAnioActual, moneda),
      description: `Presupuesto aprobado en ${stats.anioActual}`,
      icon: CalendarCheck,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-6">
      {statCards.map((stat) => (
        <Card key={stat.title} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {stat.title}
            </CardTitle>
            <div className={`rounded-lg p-1.5 sm:p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg font-bold tracking-tight sm:text-2xl">{stat.value}</div>
            <p className="hidden text-xs text-muted-foreground mt-1 sm:block">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { formatCurrency, formatPercentage } from "~/lib/formatters";
import { FileText, CheckCircle2, Percent, DollarSign } from "lucide-react";

interface ProyectoStatsProps {
  id: string;
}

export function ProyectoStats({ id }: ProyectoStatsProps) {
  const { data: proyecto } = api.proyecto.getById.useQuery({ id });

  if (!proyecto) return null;

  const moneda = proyecto.moneda as "UYU" | "USD";

  const statCards = [
    {
      title: "% Facturado",
      value: formatPercentage(proyecto.porcentajeFacturado),
      description: `${formatCurrency(proyecto.montoFacturado, moneda)} de ${formatCurrency(proyecto.montoTotal, moneda)}`,
      icon: Percent,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
    {
      title: "% Cobrado",
      value: formatPercentage(proyecto.porcentajeCobrado),
      description: `${formatCurrency(proyecto.montoCobrado, moneda)} cobrado`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Total Facturaciones",
      value: proyecto.facturaciones.length.toString(),
      description: "Facturas emitidas",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Comisión Estimada",
      value: formatCurrency((proyecto.montoTotal * proyecto.comisionPct) / 100, moneda),
      description: `${formatPercentage(proyecto.comisionPct)} del presupuesto`,
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
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

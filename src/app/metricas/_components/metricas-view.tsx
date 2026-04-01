"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "~/trpc/react";
import { useCuenta } from "~/lib/cuenta-context";
import {
  formatCurrency,
  formatPercentage,
  getEstadoProyectoLabel,
} from "~/lib/formatters";

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return formatPercentage((num / den) * 100);
}
import {
  DollarSign,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const PAGE_SIZE = 20;

function getDefaultDates() {
  const year = new Date().getFullYear();
  return {
    desde: `${year}-01-01`,
    hasta: new Date().toISOString().split("T")[0]!,
  };
}

const chartConfig = {
  total: {
    label: "Presupuesto aprobado",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const getEstadoBadgeClass = (estado: string) => {
  switch (estado) {
    case "NOT_STARTED": return "bg-slate-100 text-slate-700";
    case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
    case "FINISHED": return "bg-emerald-100 text-emerald-700";
    default: return "";
  }
};

export function MetricasView() {
  const { moneda } = useCuenta();
  const defaults = getDefaultDates();
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [page, setPage] = useState(1);

  const { data, isLoading } = api.proyecto.getMetrics.useQuery({
    moneda,
    fechaDesde: new Date(desde),
    fechaHasta: new Date(hasta + "T23:59:59"),
    page,
    pageSize: PAGE_SIZE,
  });

  const chartData = data?.porMes.map((item) => ({
    mes: `${MESES[item.mes - 1]} ${item.anio !== new Date().getFullYear() ? item.anio : ""}`.trim(),
    total: item.total,
  })) ?? [];

  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input
            id="desde"
            type="date"
            value={desde}
            onChange={(e) => { setDesde(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input
            id="hasta"
            type="date"
            value={hasta}
            onChange={(e) => { setHasta(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />}
      </div>

      {/* Cards resumen */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto Aprobado
            </CardTitle>
            <div className="rounded-lg p-2 bg-blue-100">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totales.presupuesto ?? 0, moneda)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.totales.proyectos ?? 0} proyectos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Facturado
            </CardTitle>
            <div className="rounded-lg p-2 bg-violet-100">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totales.facturado ?? 0, moneda)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pct(data?.totales.facturado ?? 0, data?.totales.presupuesto ?? 0)} del presupuesto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cobrado
            </CardTitle>
            <div className="rounded-lg p-2 bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totales.cobrado ?? 0, moneda)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pct(data?.totales.cobrado ?? 0, data?.totales.facturado ?? 0)} de lo facturado
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="proyectos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="proyectos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Proyectos en el rango
                {pagination && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({pagination.total} total)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !data?.proyectos.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sin proyectos para el rango seleccionado
                </p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {data.proyectos.map((p) => (
                      <Link key={p.id} href={`/proyectos/${p.id}`} className="block">
                        <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{p.identificador}</span>
                            <Badge className={getEstadoBadgeClass(p.estado)}>
                              {getEstadoProyectoLabel(p.estado)}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate font-medium">{p.nombre}</p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="block text-muted-foreground">Presupuesto</span>
                              <span className="font-medium">{formatCurrency(p.montoTotal, moneda)}</span>
                            </div>
                            <div>
                              <span className="block text-muted-foreground">Facturado</span>
                              <span className="font-medium text-violet-600">{formatCurrency(p.montoFacturado, moneda)}</span>
                              <span className="block text-violet-400">{pct(p.montoFacturado, p.montoTotal)}</span>
                            </div>
                            <div>
                              <span className="block text-muted-foreground">Cobrado</span>
                              <span className="font-medium text-emerald-600">{formatCurrency(p.montoCobrado, moneda)}</span>
                              <span className="block text-emerald-400">{pct(p.montoCobrado, p.montoFacturado)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Presupuesto</TableHead>
                        <TableHead className="text-right">Facturado</TableHead>
                        <TableHead className="text-right">% Fact.</TableHead>
                        <TableHead className="text-right">Cobrado</TableHead>
                        <TableHead className="text-right">% Cob.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.proyectos.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-medium">
                            <Link href={`/proyectos/${p.id}`} className="hover:underline">
                              {p.identificador}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium">{p.nombre}</TableCell>
                          <TableCell>
                            <Badge className={getEstadoBadgeClass(p.estado)}>
                              {getEstadoProyectoLabel(p.estado)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(p.montoTotal, moneda)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-violet-600">
                            {formatCurrency(p.montoFacturado, moneda)}
                          </TableCell>
                          <TableCell className="text-right text-violet-500">
                            {pct(p.montoFacturado, p.montoTotal)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {formatCurrency(p.montoCobrado, moneda)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-500">
                            {pct(p.montoCobrado, p.montoFacturado)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {pagination.page} de {pagination.totalPages}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages}>
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumen">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aprobaciones por mes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Evolución del presupuesto aprobado dentro del rango seleccionado.
              </p>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Sin datos para el rango seleccionado
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatCurrency(value as number, moneda)
                          }
                        />
                      }
                    />
                    <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

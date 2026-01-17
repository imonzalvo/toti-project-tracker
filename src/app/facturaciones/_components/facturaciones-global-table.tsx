"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  getTipoFacturacionLabel,
  getEstadoFacturacionLabel,
} from "~/lib/formatters";
import { useCuenta } from "~/lib/cuenta-context";
import { useAuth } from "~/lib/auth-context";
import {
  Receipt,
  ExternalLink,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Calendar,
  ArrowRight,
} from "lucide-react";

const PAGE_SIZE = 10;

export function FacturacionesGlobalTable() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const initialEstado = searchParams.get("estado") ?? "ALL";
  const { moneda } = useCuenta();

  const [estadoFilter, setEstadoFilter] = useState(initialEstado);
  const [proyectoFilter, setProyectoFilter] = useState("ALL");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [estadoFilter, proyectoFilter, fechaDesde, fechaHasta, moneda]);

  const utils = api.useUtils();

  // Query para obtener proyectos (para el selector de filtro)
  const { data: proyectos } = api.proyecto.getAll.useQuery({ moneda });

  // Query paginada para facturaciones
  const { data, isLoading, isFetching } = api.facturacion.getPaginated.useQuery(
    {
      moneda,
      page,
      pageSize: PAGE_SIZE,
      estado:
        estadoFilter !== "ALL"
          ? (estadoFilter as "EMITIDA" | "COBRADA")
          : undefined,
      proyectoId: proyectoFilter !== "ALL" ? proyectoFilter : undefined,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    }
  );

  const facturaciones = data?.facturaciones ?? [];
  const pagination = data?.pagination;
  const totales = data?.totales;

  const marcarCobrada = api.facturacion.marcarCobrada.useMutation({
    onSuccess: () => {
      toast.success("Factura marcada como cobrada");
      void utils.facturacion.getPaginated.invalidate();
      void utils.facturacion.getPendientes.invalidate();
    },
    onError: (error) => {
      toast.error("Error al marcar como cobrada", {
        description: error.message,
      });
    },
  });

  const handleMarcarCobrada = (facturaId: string) => {
    marcarCobrada.mutate({
      id: facturaId,
      fechaCobro: new Date(),
    });
  };

  const hasFilters =
    estadoFilter !== "ALL" ||
    proyectoFilter !== "ALL" ||
    fechaDesde !== "" ||
    fechaHasta !== "";

  const clearFilters = () => {
    setEstadoFilter("ALL");
    setProyectoFilter("ALL");
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters - Responsive */}
      <div className="space-y-3">
        {/* Primera fila de filtros */}
        <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-end">
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="EMITIDA">Emitidas (Pendientes)</SelectItem>
              <SelectItem value="COBRADA">Cobradas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los proyectos</SelectItem>
              {proyectos?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.identificador} - {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rango de fechas - oculto en mobile para simplificar */}
        <div className="hidden items-end gap-2 md:flex">
          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Desde
            </Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Hasta
            </Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-36"
            />
          </div>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Summary cards */}
      {totales && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Filtrado</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totales.total, moneda)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Cobrado</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totales.cobrado, moneda)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pendiente</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(totales.pendiente, moneda)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturaciones
            {pagination && (
              <Badge variant="secondary" className="ml-2">
                {pagination.total}
              </Badge>
            )}
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading state */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Cargando facturaciones...
              </p>
            </div>
          ) : facturaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">Sin facturaciones</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "No hay facturaciones con los filtros seleccionados"
                  : "Las facturaciones aparecerán aquí"}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Contador de resultados */}
              {pagination && (
                <p className="text-sm text-muted-foreground mb-4">
                  Mostrando {facturaciones.length} de {pagination.total}{" "}
                  facturaciones
                </p>
              )}

              {/* Vista Mobile - Cards */}
              <div className="space-y-3 md:hidden">
                {facturaciones.map((factura) => (
                  <div
                    key={factura.id}
                    className={`rounded-lg border p-4 ${
                      factura.estado === "EMITIDA" ? "bg-amber-50/50" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/proyectos/${factura.proyectoId}`}
                            className="font-mono text-sm font-medium hover:underline"
                          >
                            {factura.proyecto.identificador}
                          </Link>
                          <Badge
                            className={`text-xs ${
                              factura.estado === "COBRADA"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {getEstadoFacturacionLabel(factura.estado)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {factura.proyecto.nombre}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(factura.monto, moneda)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(factura.porcentaje)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{getTipoFacturacionLabel(factura.descripcion)}</span>
                        <span>•</span>
                        <span>{formatDate(factura.fechaFacturacion)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {factura.estado === "EMITIDA" && isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 flex-1 gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800"
                          onClick={() => handleMarcarCobrada(factura.id)}
                          disabled={marcarCobrada.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Cobrar
                        </Button>
                      )}
                      <Link
                        href={`/proyectos/${factura.proyectoId}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full gap-1"
                        >
                          Ver proyecto
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista Desktop - Tabla */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Cobro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturaciones.map((factura) => (
                    <TableRow
                      key={factura.id}
                      className={
                        factura.estado === "EMITIDA"
                          ? "bg-amber-50/50"
                          : undefined
                      }
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/proyectos/${factura.proyectoId}`}
                          className="hover:underline"
                        >
                          {factura.proyecto.identificador}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {factura.proyecto.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Presupuesto:{" "}
                          {formatCurrency(factura.proyecto.montoTotal, moneda)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {getTipoFacturacionLabel(factura.descripcion)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(factura.porcentaje)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(factura.monto, moneda)}
                      </TableCell>
                      <TableCell>
                        {formatDate(factura.fechaFacturacion)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            factura.estado === "COBRADA"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }
                        >
                          {getEstadoFacturacionLabel(factura.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {factura.fechaCobro
                          ? formatDate(factura.fechaCobro)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {factura.estado === "EMITIDA" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 bg-emerald-100 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-200 disabled:bg-muted disabled:text-muted-foreground"
                              onClick={() => handleMarcarCobrada(factura.id)}
                              disabled={marcarCobrada.isPending || !isAdmin}
                              title={!isAdmin ? "Solo administradores" : "Marcar como cobrada"}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Cobrar
                            </Button>
                          )}
                          <Link href={`/proyectos/${factura.proyectoId}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <ExternalLink className="h-4 w-4" />
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={page === pagination.totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

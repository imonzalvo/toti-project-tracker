"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import {
  formatCurrency,
  formatPercentage,
  getEstadoProyectoLabel,
} from "~/lib/formatters";
import { useCuenta } from "~/lib/cuenta-context";
import {
  Eye,
  FolderKanban,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ChevronDown,
} from "lucide-react";

type EstadoFilter = "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";

const PAGE_SIZE = 10;

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function ProyectosTable() {
  const { moneda } = useCuenta();

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("ALL");
  const [nombreFilter, setNombreFilter] = useState("");
  const [identificadorFilter, setIdentificadorFilter] = useState("");
  const [page, setPage] = useState(1);

  // Debounce para los filtros de texto (300ms)
  const debouncedNombre = useDebounce(nombreFilter, 300);
  const debouncedIdentificador = useDebounce(identificadorFilter, 300);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [debouncedNombre, debouncedIdentificador, estadoFilter, moneda]);

  // Query con paginación y filtros server-side
  const { data, isLoading, isFetching } = api.proyecto.getPaginated.useQuery({
    moneda,
    page,
    pageSize: PAGE_SIZE,
    estado: estadoFilter === "ALL" ? undefined : estadoFilter,
    nombre: debouncedNombre || undefined,
    identificador: debouncedIdentificador || undefined,
  });

  const proyectos = data?.proyectos ?? [];
  const pagination = data?.pagination;

  const hasActiveFilters =
    estadoFilter !== "ALL" || nombreFilter !== "" || identificadorFilter !== "";

  const clearFilters = () => {
    setEstadoFilter("ALL");
    setNombreFilter("");
    setIdentificadorFilter("");
    setPage(1);
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "NOT_STARTED":
        return "secondary";
      case "IN_PROGRESS":
        return "default";
      case "FINISHED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case "NOT_STARTED":
        return "bg-slate-100 text-slate-700 hover:bg-slate-100";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "FINISHED":
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Listado de Proyectos
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros - Layout adaptativo */}
        <div className="space-y-3">
          {/* Buscador por nombre - full width en mobile */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={nombreFilter}
              onChange={(e) => setNombreFilter(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Filtros secundarios - grid en mobile, flex en desktop */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Buscador por identificador - oculto en mobile por simplicidad */}
            <div className="relative hidden min-w-[160px] max-w-[200px] md:block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Identificador..."
                value={identificadorFilter}
                onChange={(e) => setIdentificadorFilter(e.target.value)}
                className="pl-8 font-mono"
              />
            </div>

            {/* Filtro por estado */}
            <Select
              value={estadoFilter}
              onValueChange={(value) => setEstadoFilter(value as EstadoFilter)}
            >
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="NOT_STARTED">No comenzó</SelectItem>
                <SelectItem value="IN_PROGRESS">En progreso</SelectItem>
                <SelectItem value="FINISHED">Finalizado</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón para limpiar filtros */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Contador de resultados */}
        {pagination && (
          <p className="text-sm text-muted-foreground">
            Mostrando {proyectos.length} de {pagination.total} proyectos
          </p>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Cargando proyectos...
            </p>
          </div>
        ) : pagination?.total === 0 && !hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">Sin proyectos</p>
            <p className="text-sm text-muted-foreground">
              Crea tu primer proyecto para comenzar
            </p>
          </div>
        ) : proyectos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">Sin resultados</p>
            <p className="text-sm text-muted-foreground">
              No se encontraron proyectos con los filtros aplicados
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-4"
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <>
            {/* Vista Mobile - Cards */}
            <div className="space-y-3 md:hidden">
              {proyectos.map((proyecto) => (
                <Link
                  key={proyecto.id}
                  href={`/proyectos/${proyecto.id}`}
                  className="block"
                >
                  <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {proyecto.identificador}
                          </span>
                          <Badge
                            variant={getEstadoBadgeVariant(proyecto.estado)}
                            className={`text-xs ${getEstadoBadgeClass(proyecto.estado)}`}
                          >
                            {getEstadoProyectoLabel(proyecto.estado)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate font-medium">
                          {proyecto.nombre}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Presupuesto: </span>
                        <span className="font-medium">
                          {formatCurrency(proyecto.montoTotal, moneda)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Facturado:</span>
                        <span
                          className={
                            proyecto.porcentajeFacturado > 0
                              ? "font-medium text-violet-600"
                              : "text-muted-foreground"
                          }
                        >
                          {formatPercentage(proyecto.porcentajeFacturado)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Cobrado:</span>
                        <span
                          className={
                            proyecto.porcentajeCobrado > 0
                              ? "font-medium text-emerald-600"
                              : "text-muted-foreground"
                          }
                        >
                          {formatPercentage(proyecto.porcentajeCobrado)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Vista Desktop - Tabla */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">% Facturado</TableHead>
                  <TableHead className="text-right">% Cobrado</TableHead>
                  <TableHead className="text-right">Presupuesto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectos.map((proyecto) => (
                  <TableRow key={proyecto.id}>
                    <TableCell className="font-mono font-medium">
                      {proyecto.identificador}
                    </TableCell>
                    <TableCell className="font-medium">
                      {proyecto.nombre}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getEstadoBadgeVariant(proyecto.estado)}
                        className={getEstadoBadgeClass(proyecto.estado)}
                      >
                        {getEstadoProyectoLabel(proyecto.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          proyecto.porcentajeFacturado > 0
                            ? "text-violet-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {formatPercentage(proyecto.porcentajeFacturado)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          proyecto.porcentajeCobrado > 0
                            ? "text-emerald-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {formatPercentage(proyecto.porcentajeCobrado)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(proyecto.montoTotal, moneda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/proyectos/${proyecto.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
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
  );
}

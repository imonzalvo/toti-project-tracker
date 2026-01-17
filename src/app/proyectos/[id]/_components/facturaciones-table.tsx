"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  getTipoFacturacionLabel,
  getEstadoFacturacionLabel,
} from "~/lib/formatters";
import { useAuth } from "~/lib/auth-context";
import { FileText, CheckCircle2, Trash2, Loader2, XCircle, Pencil } from "lucide-react";

interface FacturacionesTableProps {
  proyectoId: string;
}

export function FacturacionesTable({ proyectoId }: FacturacionesTableProps) {
  const { isAdmin } = useAuth();
  const { data: proyecto } = api.proyecto.getById.useQuery({ id: proyectoId });
  const utils = api.useUtils();

  const [cobrarDialog, setCobrarDialog] = useState<{
    open: boolean;
    facturacionId: string | null;
  }>({ open: false, facturacionId: null });
  const [fechaCobro, setFechaCobro] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    facturacionId: string | null;
    descripcion: string;
    porcentajeActual: number;
  }>({ open: false, facturacionId: null, descripcion: "", porcentajeActual: 0 });
  const [nuevoPorcentaje, setNuevoPorcentaje] = useState("");

  const marcarCobradaMutation = api.facturacion.marcarCobrada.useMutation({
    onSuccess: () => {
      toast.success("Factura marcada como cobrada");
      setCobrarDialog({ open: false, facturacionId: null });
      void utils.proyecto.getById.invalidate({ id: proyectoId });
      void utils.proyecto.getStats.invalidate();
      void utils.facturacion.getPendientes.invalidate();
      void utils.facturacion.getUltimasCobradas.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al marcar como cobrada");
    },
  });

  const deleteMutation = api.facturacion.delete.useMutation({
    onSuccess: () => {
      toast.success("Factura eliminada");
      void utils.proyecto.getById.invalidate({ id: proyectoId });
      void utils.proyecto.getStats.invalidate();
      void utils.facturacion.getPendientes.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar");
    },
  });

  const marcarNoCobradaMutation = api.facturacion.marcarNoCobrada.useMutation({
    onSuccess: () => {
      toast.success("Factura marcada como pendiente");
      void utils.proyecto.getById.invalidate({ id: proyectoId });
      void utils.proyecto.getStats.invalidate();
      void utils.facturacion.getPendientes.invalidate();
      void utils.facturacion.getUltimasCobradas.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al revertir cobro");
    },
  });

  const updatePorcentajeMutation = api.facturacion.updatePorcentaje.useMutation({
    onSuccess: () => {
      toast.success("Porcentaje actualizado");
      setEditDialog({ open: false, facturacionId: null, descripcion: "", porcentajeActual: 0 });
      void utils.proyecto.getById.invalidate({ id: proyectoId });
      void utils.proyecto.getStats.invalidate();
      void utils.facturacion.getPendientes.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar porcentaje");
    },
  });

  const moneda = proyecto?.moneda as "UYU" | "USD" | undefined;

  if (!proyecto || proyecto.facturaciones.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">Sin facturaciones</p>
            <p className="text-sm text-muted-foreground">
              Agrega la primera facturación a este proyecto
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleMarcarCobrada = () => {
    if (!cobrarDialog.facturacionId) return;

    marcarCobradaMutation.mutate({
      id: cobrarDialog.facturacionId,
      fechaCobro: new Date(fechaCobro + "T12:00:00"),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta facturación?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleUpdatePorcentaje = () => {
    if (!editDialog.facturacionId) return;

    const porcentaje = parseFloat(nuevoPorcentaje);
    if (isNaN(porcentaje) || porcentaje <= 0) {
      toast.error("El porcentaje debe ser un número positivo");
      return;
    }

    updatePorcentajeMutation.mutate({
      id: editDialog.facturacionId,
      porcentaje,
    });
  };

  const openEditDialog = (factura: {
    id: string;
    descripcion: string;
    porcentaje: number;
  }) => {
    setNuevoPorcentaje(factura.porcentaje.toString());
    setEditDialog({
      open: true,
      facturacionId: factura.id,
      descripcion: factura.descripcion,
      porcentajeActual: factura.porcentaje,
    });
  };

  // Calculate max porcentaje available for editing
  const getMaxPorcentajeForEdit = () => {
    if (!proyecto) return 100;
    const totalOtras = proyecto.facturaciones
      .filter((f) => f.id !== editDialog.facturacionId)
      .reduce((sum, f) => sum + f.porcentaje, 0);
    return 100 - totalOtras;
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {/* Vista Mobile - Cards */}
          <div className="space-y-2 p-3 sm:hidden">
            {proyecto.facturaciones.map((factura) => (
              <div
                key={factura.id}
                className={`rounded-lg border p-3 ${
                  factura.estado === "EMITIDA" ? "bg-amber-50/50" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getTipoFacturacionLabel(factura.descripcion)}
                      </span>
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(factura.fechaFacturacion)}
                      {factura.fechaCobro && ` → ${formatDate(factura.fechaCobro)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(factura.monto, moneda ?? "USD")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(factura.porcentaje)}
                    </p>
                  </div>
                </div>
                {/* Acciones Mobile */}
                {isAdmin && (
                  <div className="mt-3 flex items-center gap-2 border-t pt-3">
                    {factura.estado === "EMITIDA" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFechaCobro(new Date().toISOString().split("T")[0] ?? "");
                          setCobrarDialog({
                            open: true,
                            facturacionId: factura.id,
                          });
                        }}
                        className="h-8 flex-1 gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Cobrar
                      </Button>
                    )}
                    {factura.estado === "COBRADA" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("¿Revertir cobro?")) {
                            marcarNoCobradaMutation.mutate({ id: factura.id });
                          }
                        }}
                        disabled={marcarNoCobradaMutation.isPending}
                        className="h-8 flex-1 gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200"
                      >
                        <XCircle className="h-4 w-4" />
                        Revertir
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(factura)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {factura.descripcion !== "APROBACION" && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(factura.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Vista Desktop - Tabla */}
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">% Presupuesto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha Facturación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Cobro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyecto.facturaciones.map((factura) => (
                <TableRow key={factura.id}>
                  <TableCell className="font-medium">
                    {getTipoFacturacionLabel(factura.descripcion)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(factura.porcentaje)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(factura.monto, moneda ?? "USD")}
                  </TableCell>
                  <TableCell>
                    {formatDate(factura.fechaFacturacion)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        factura.estado === "COBRADA" ? "default" : "secondary"
                      }
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
                          onClick={() => {
                            setFechaCobro(new Date().toISOString().split("T")[0] ?? "");
                            setCobrarDialog({
                              open: true,
                              facturacionId: factura.id,
                            });
                          }}
                          disabled={!isAdmin}
                          className="gap-1 text-emerald-600 hover:text-emerald-700 disabled:text-muted-foreground"
                          title={!isAdmin ? "Solo administradores" : "Marcar como cobrada"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Cobrar
                        </Button>
                      )}
                      {factura.estado === "COBRADA" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("¿Estás seguro de que deseas marcar esta factura como no cobrada?")) {
                              marcarNoCobradaMutation.mutate({ id: factura.id });
                            }
                          }}
                          disabled={marcarNoCobradaMutation.isPending || !isAdmin}
                          className="gap-1 text-amber-600 hover:text-amber-700 disabled:text-muted-foreground"
                          title={!isAdmin ? "Solo administradores" : "Revertir cobro"}
                        >
                          {marcarNoCobradaMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Revertir
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(factura)}
                        disabled={!isAdmin}
                        className="text-muted-foreground hover:text-blue-600 disabled:text-muted-foreground/50"
                        title={!isAdmin ? "Solo administradores" : "Editar porcentaje"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* Solo mostrar eliminar si NO es APROBACION */}
                      {factura.descripcion !== "APROBACION" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(factura.id)}
                          disabled={!isAdmin}
                          className="text-muted-foreground hover:text-destructive disabled:text-muted-foreground/50"
                          title={!isAdmin ? "Solo administradores" : "Eliminar facturación"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para marcar como cobrada */}
      <Dialog
        open={cobrarDialog.open}
        onOpenChange={(open) =>
          setCobrarDialog({ open, facturacionId: open ? cobrarDialog.facturacionId : null })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como Cobrada</DialogTitle>
            <DialogDescription>
              Ingresa la fecha en que se recibió el pago
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fechaCobro">Fecha de Cobro</Label>
              <Input
                id="fechaCobro"
                type="date"
                value={fechaCobro}
                onChange={(e) => setFechaCobro(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCobrarDialog({ open: false, facturacionId: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarcarCobrada}
              disabled={marcarCobradaMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {marcarCobradaMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar porcentaje */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          setEditDialog({
            open,
            facturacionId: open ? editDialog.facturacionId : null,
            descripcion: open ? editDialog.descripcion : "",
            porcentajeActual: open ? editDialog.porcentajeActual : 0,
          })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Porcentaje</DialogTitle>
            <DialogDescription>
              {getTipoFacturacionLabel(editDialog.descripcion)} - Porcentaje actual:{" "}
              {formatPercentage(editDialog.porcentajeActual)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nuevoPorcentaje">Nuevo Porcentaje (%)</Label>
              <Input
                id="nuevoPorcentaje"
                type="number"
                placeholder={`Máximo: ${getMaxPorcentajeForEdit()}`}
                value={nuevoPorcentaje}
                onChange={(e) => setNuevoPorcentaje(e.target.value)}
                required
                min="0.1"
                max={getMaxPorcentajeForEdit()}
                step="0.1"
              />
              {nuevoPorcentaje && !isNaN(parseFloat(nuevoPorcentaje)) && proyecto && (
                <p className="text-sm text-muted-foreground">
                  Nuevo monto:{" "}
                  <span className="font-medium">
                    {formatCurrency(
                      (proyecto.montoTotal * parseFloat(nuevoPorcentaje)) / 100,
                      moneda ?? "USD"
                    )}
                  </span>
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({
                  open: false,
                  facturacionId: null,
                  descripcion: "",
                  porcentajeActual: 0,
                })
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePorcentaje}
              disabled={updatePorcentajeMutation.isPending}
            >
              {updatePorcentajeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

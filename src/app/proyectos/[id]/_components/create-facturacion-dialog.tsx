"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { formatCurrency, formatPercentage } from "~/lib/formatters";
import { useAuth } from "~/lib/auth-context";
import { Plus, Loader2 } from "lucide-react";

interface CreateFacturacionDialogProps {
  proyectoId: string;
}

export function CreateFacturacionDialog({
  proyectoId,
}: CreateFacturacionDialogProps) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: "",
    porcentaje: "",
    fechaFacturacion: new Date().toISOString().split("T")[0],
  });

  const { data: proyecto } = api.proyecto.getById.useQuery({ id: proyectoId });
  const utils = api.useUtils();

  const createMutation = api.facturacion.create.useMutation({
    onSuccess: () => {
      toast.success("Facturación creada exitosamente");
      setOpen(false);
      resetForm();
      void utils.proyecto.getById.invalidate({ id: proyectoId });
      void utils.proyecto.getStats.invalidate();
      void utils.facturacion.getPendientes.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear la facturación");
    },
  });

  // Calculate remaining percentage
  const porcentajeFacturado = proyecto?.facturaciones.reduce(
    (sum, f) => sum + f.porcentaje,
    0
  ) ?? 0;
  const porcentajeDisponible = 100 - porcentajeFacturado;

  // Determine if this is the first invoice (must be APROBACION)
  const esPrimeraFactura = proyecto?.facturaciones.length === 0;
  
  // Check if ENTREGA_TOTAL already exists (block new invoices)
  const tieneEntregaTotal = proyecto?.facturaciones.some(
    (f) => f.descripcion === "ENTREGA_TOTAL"
  );

  // Reset form with correct defaults based on project state
  const resetForm = () => {
    setFormData({
      descripcion: esPrimeraFactura ? "APROBACION" : "",
      porcentaje: "",
      fechaFacturacion: new Date().toISOString().split("T")[0],
    });
  };

  // Set default values when dialog opens
  useEffect(() => {
    if (open && proyecto) {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proyecto?.facturaciones.length]);

  // Auto-set porcentaje when ENTREGA_TOTAL is selected
  useEffect(() => {
    if (formData.descripcion === "ENTREGA_TOTAL") {
      setFormData((prev) => ({
        ...prev,
        porcentaje: porcentajeDisponible.toString(),
      }));
    }
  }, [formData.descripcion, porcentajeDisponible]);

  if (!proyecto) return null;

  const moneda = proyecto.moneda as "UYU" | "USD";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const porcentaje = parseFloat(formData.porcentaje);

    if (isNaN(porcentaje) || porcentaje <= 0) {
      toast.error("El porcentaje debe ser positivo");
      return;
    }

    if (porcentaje > porcentajeDisponible) {
      toast.error(
        `El porcentaje máximo disponible es ${formatPercentage(porcentajeDisponible)}`
      );
      return;
    }

    if (!formData.descripcion) {
      toast.error("Selecciona el tipo de facturación");
      return;
    }

    createMutation.mutate({
      proyectoId,
      descripcion: formData.descripcion as
        | "APROBACION"
        | "ENTREGA_PARCIAL"
        | "ENTREGA_TOTAL",
      porcentaje,
      fechaFacturacion: new Date(formData.fechaFacturacion + "T12:00:00"),
    });
  };

  const montoEstimado = formData.porcentaje
    ? (proyecto.montoTotal * parseFloat(formData.porcentaje)) / 100
    : 0;

  // Check if porcentaje input should be disabled (ENTREGA_TOTAL)
  const porcentajeDisabled = formData.descripcion === "ENTREGA_TOTAL";

  // Si no es admin, mostrar botón deshabilitado
  if (!isAdmin) {
    return (
      <Button className="gap-2" disabled title="Solo administradores pueden crear facturaciones">
        <Plus className="h-4 w-4" />
        Nueva Facturación
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="gap-2"
          disabled={porcentajeDisponible <= 0 || tieneEntregaTotal}
        >
          <Plus className="h-4 w-4" />
          Nueva Facturación
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar Facturación</DialogTitle>
            <DialogDescription>
              Proyecto: {proyecto.nombre} ({proyecto.identificador})
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Info de disponibilidad */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">
                  Disponible para facturar:{" "}
                </span>
                <span className="font-semibold">
                  {formatPercentage(porcentajeDisponible)}
                </span>
                <span className="text-muted-foreground"> = </span>
                <span className="font-semibold">
                  {formatCurrency(
                    (proyecto.montoTotal * porcentajeDisponible) / 100,
                    moneda
                  )}
                </span>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">Tipo de Facturación</Label>
              <Select
                value={formData.descripcion}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, descripcion: value }))
                }
                disabled={esPrimeraFactura}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {esPrimeraFactura ? (
                    <SelectItem value="APROBACION">Aprobación</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="ENTREGA_PARCIAL">
                        Entrega Parcial
                      </SelectItem>
                      <SelectItem value="ENTREGA_TOTAL">Entrega Total</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {esPrimeraFactura && (
                <p className="text-sm text-muted-foreground">
                  La primera facturación siempre es de tipo Aprobación
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="porcentaje">Porcentaje del Presupuesto (%)</Label>
              <Input
                id="porcentaje"
                type="number"
                placeholder={`Máximo: ${porcentajeDisponible}`}
                value={formData.porcentaje}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, porcentaje: e.target.value }))
                }
                required
                min="0.1"
                max={porcentajeDisponible}
                step="0.1"
                disabled={porcentajeDisabled}
                className={porcentajeDisabled ? "bg-muted" : ""}
              />
              {porcentajeDisabled && (
                <p className="text-sm text-muted-foreground">
                  La Entrega Total usa el saldo restante automáticamente
                </p>
              )}
              {formData.porcentaje && !isNaN(parseFloat(formData.porcentaje)) && (
                <p className="text-sm text-muted-foreground">
                  Monto: <span className="font-medium">{formatCurrency(montoEstimado, moneda)}</span>
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fechaFacturacion">Fecha de Facturación</Label>
              <Input
                id="fechaFacturacion"
                type="date"
                value={formData.fechaFacturacion}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    fechaFacturacion: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Facturación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { api } from "~/trpc/react";
import { useCuenta } from "~/lib/cuenta-context";
import { useAuth } from "~/lib/auth-context";
import { Plus, Loader2 } from "lucide-react";

export function CreateProyectoDialog() {
  const router = useRouter();
  const { moneda, monedaLabel } = useCuenta();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0]!;
  const [formData, setFormData] = useState({
    identificador: "",
    nombre: "",
    montoTotal: "",
    comisionPct: "",
    project_approved_at: today,
  });

  const utils = api.useUtils();

  const createMutation = api.proyecto.create.useMutation({
    onSuccess: (proyecto) => {
      toast.success("Proyecto creado exitosamente");
      setOpen(false);
      setFormData({
        identificador: "",
        nombre: "",
        montoTotal: "",
        comisionPct: "",
        project_approved_at: today,
      });
      void utils.proyecto.getAll.invalidate();
      void utils.proyecto.getStats.invalidate();
      router.push(`/proyectos/${proyecto.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear el proyecto");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const montoTotal = parseFloat(formData.montoTotal);
    const comisionPct = parseFloat(formData.comisionPct);

    if (isNaN(montoTotal) || montoTotal <= 0) {
      toast.error("El monto debe ser un número positivo");
      return;
    }

    if (isNaN(comisionPct) || comisionPct < 0 || comisionPct > 100) {
      toast.error("La comisión debe estar entre 0 y 100");
      return;
    }

    createMutation.mutate({
      identificador: formData.identificador.trim(),
      nombre: formData.nombre.trim(),
      montoTotal,
      comisionPct,
      moneda,
      project_approved_at: formData.project_approved_at
        ? new Date(formData.project_approved_at)
        : undefined,
    });
  };

  // Si no es admin, mostrar botón deshabilitado
  if (!isAdmin) {
    return (
      <Button className="gap-2" disabled title="Solo administradores pueden crear proyectos">
        <Plus className="h-4 w-4" />
        Nuevo Proyecto
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Proyecto</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo proyecto en {monedaLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="identificador">Identificador</Label>
              <Input
                id="identificador"
                type="number"
                placeholder="Ej: 26001"
                value={formData.identificador}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    identificador: e.target.value,
                  }))
                }
                required
                min="1"
                step="1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre del Proyecto</Label>
              <Input
                id="nombre"
                placeholder="Ej: Rediseño sitio web"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="montoTotal">Presupuesto Total ($)</Label>
              <Input
                id="montoTotal"
                type="number"
                placeholder="Ej: 150000"
                value={formData.montoTotal}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    montoTotal: e.target.value,
                  }))
                }
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comisionPct">Porcentaje de Comisión (%)</Label>
              <Input
                id="comisionPct"
                type="number"
                placeholder="Ej: 15.625"
                value={formData.comisionPct}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    comisionPct: e.target.value,
                  }))
                }
                required
                min="0"
                max="100"
                step="0.001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project_approved_at">Fecha de Aprobación</Label>
              <Input
                id="project_approved_at"
                type="date"
                value={formData.project_approved_at}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project_approved_at: e.target.value,
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
              Crear Proyecto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

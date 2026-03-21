"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import {
  formatCurrency,
  formatPercentage,
  getEstadoProyectoLabel,
} from "~/lib/formatters";
import { useAuth } from "~/lib/auth-context";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  CheckCircle2,
  Trash2,
  Loader2,
} from "lucide-react";

interface ProyectoHeaderProps {
  id: string;
}

export function ProyectoHeader({ id }: ProyectoHeaderProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: proyecto } = api.proyecto.getById.useQuery({ id });
  const utils = api.useUtils();

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    nombre: "",
    comisionPct: "",
    project_approved_at: "",
  });

  const updateMutation = api.proyecto.update.useMutation({
    onSuccess: () => {
      toast.success("Proyecto actualizado");
      setEditOpen(false);
      void utils.proyecto.getById.invalidate({ id });
      void utils.proyecto.getAll.invalidate();
      void utils.proyecto.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const deleteMutation = api.proyecto.delete.useMutation({
    onSuccess: () => {
      toast.success("Proyecto eliminado");
      router.push("/proyectos");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar");
    },
  });

  if (!proyecto) return null;

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case "NOT_STARTED":
        return "bg-slate-100 text-slate-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "FINISHED":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "";
    }
  };

  const handleChangeEstado = (nuevoEstado: string) => {
    updateMutation.mutate({ id, estado: nuevoEstado as "NOT_STARTED" | "IN_PROGRESS" | "FINISHED" });
  };

  const handleDelete = () => {
    if (confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenEdit = () => {
    if (!proyecto) return;
    setEditData({
      nombre: proyecto.nombre,
      comisionPct: proyecto.comisionPct.toString(),
      project_approved_at: proyecto.project_approved_at
        .toISOString()
        .split("T")[0]!,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const comisionPct = parseFloat(editData.comisionPct);
    if (isNaN(comisionPct) || comisionPct < 0 || comisionPct > 100) {
      toast.error("La comisión debe estar entre 0 y 100");
      return;
    }
    updateMutation.mutate({
      id,
      nombre: editData.nombre.trim(),
      comisionPct,
      project_approved_at: editData.project_approved_at
        ? new Date(editData.project_approved_at)
        : undefined,
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Dialog de edición */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Proyecto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nombre">Nombre del Proyecto</Label>
                <Input
                  id="edit-nombre"
                  value={editData.nombre}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-comision">Porcentaje de Comisión (%)</Label>
                <Input
                  id="edit-comision"
                  type="number"
                  value={editData.comisionPct}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, comisionPct: e.target.value }))
                  }
                  required
                  min="0"
                  max="100"
                  step="0.001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-approved-at">Fecha de Aprobación</Label>
                <Input
                  id="edit-approved-at"
                  type="date"
                  value={editData.project_approved_at}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      project_approved_at: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/proyectos" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Proyectos</span>
        </Link>
        <span>/</span>
        <span className="text-foreground">{proyecto.identificador}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
              {proyecto.nombre}
            </h1>
            <Badge className={getEstadoBadgeClass(proyecto.estado)}>
              {getEstadoProyectoLabel(proyecto.estado)}
            </Badge>
          </div>
          {/* Info - Stack en mobile, inline en desktop */}
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <span className="font-mono">{proyecto.identificador}</span>
            <span className="hidden sm:inline">•</span>
            <span>Presupuesto: {formatCurrency(proyecto.montoTotal, proyecto.moneda as "UYU" | "USD")}</span>
            <span className="hidden sm:inline">•</span>
            <span>Comisión: {formatPercentage(proyecto.comisionPct)}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={!isAdmin} title={!isAdmin ? "Solo administradores" : "Opciones"}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleOpenEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar proyecto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleChangeEstado("IN_PROGRESS")}
              disabled={proyecto.estado === "IN_PROGRESS"}
            >
              <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
              Marcar en progreso
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleChangeEstado("FINISHED")}
              disabled={proyecto.estado === "FINISHED"}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
              Marcar finalizado
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar proyecto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

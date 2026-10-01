"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { formatDate, getTipoFacturacionLabel } from "~/lib/formatters";
import { Loader2, Pencil } from "lucide-react";

const MAX_COMENTARIO = 5000;

export interface FacturaComentario {
  id: string;
  descripcion: string;
  fechaFacturacion: Date;
  comentario: string | null;
}

interface ComentarioDialogProps {
  proyectoId: string;
  factura: FacturaComentario | null;
  isAdmin: boolean;
  onClose: () => void;
}

// Muestra el comentario completo de una factura y, para admins, permite editarlo.
// Si la factura no tiene comentario y es admin, abre directamente en modo edición.
export function ComentarioDialog({
  proyectoId,
  factura,
  isAdmin,
  onClose,
}: ComentarioDialogProps) {
  const utils = api.useUtils();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (!factura) return;
    setTexto(factura.comentario ?? "");
    setEditing(isAdmin && !factura.comentario);
  }, [factura, isAdmin]);

  const updateComentarioMutation = api.facturacion.updateComentario.useMutation({
    onSuccess: () => {
      toast.success("Comentario guardado");
      void utils.proyecto.getById.invalidate({ id: proyectoId });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Error al guardar comentario");
    },
  });

  const handleGuardar = () => {
    if (!factura) return;
    updateComentarioMutation.mutate({ id: factura.id, comentario: texto });
  };

  return (
    <Dialog open={!!factura} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comentario</DialogTitle>
          {factura && (
            <DialogDescription>
              {getTipoFacturacionLabel(factura.descripcion)} -{" "}
              {formatDate(factura.fechaFacturacion)}
            </DialogDescription>
          )}
        </DialogHeader>

        {editing ? (
          <div className="grid gap-2 py-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_COMENTARIO}
              rows={8}
              autoFocus
              placeholder="Escribí un comentario..."
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 min-h-32 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
            />
            <p className="text-right text-xs text-muted-foreground">
              {texto.length}/{MAX_COMENTARIO}
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap break-words">
            {factura?.comentario ?? "Sin comentario"}
          </div>
        )}

        <DialogFooter>
          {editing ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={updateComentarioMutation.isPending}
              >
                {updateComentarioMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {isAdmin && (
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

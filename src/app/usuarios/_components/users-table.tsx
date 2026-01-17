"use client";

import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Shield, User } from "lucide-react";
import { useAuth } from "~/lib/auth-context";

export function UsersTable() {
  const { user: currentUser } = useAuth();
  const utils = api.useUtils();

  const { data: users, isLoading } = api.auth.getUsers.useQuery();

  const deleteMutation = api.auth.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario eliminado");
      void utils.auth.getUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">
          Cargando usuarios...
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No hay usuarios registrados
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead className="w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {user.role === "ADMIN" ? (
                    <Shield className="h-4 w-4 text-amber-500" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  {user.name}
                  {user.id === currentUser?.id && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Tú
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "ADMIN" ? "default" : "secondary"}
                >
                  {user.role === "ADMIN" ? "Admin" : "Guest"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString("es-UY", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={user.id === currentUser?.id || deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`¿Eliminar usuario "${user.name}"?`)) {
                      deleteMutation.mutate({ id: user.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

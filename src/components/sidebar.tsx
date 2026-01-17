"use client";

import { Navigation } from "./navigation";
import { Separator } from "~/components/ui/separator";
import { CuentaSelector } from "./cuenta-selector";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useAuth } from "~/lib/auth-context";
import { LogOut, Shield, User } from "lucide-react";

export function Sidebar() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo / Header */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">PT</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            Project Tracker
          </span>
          <span className="text-xs text-muted-foreground">
            Gestión de Facturación
          </span>
        </div>
      </div>

      <Separator />

      {/* Selector de Cuenta */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-2">Cuenta</p>
        <CuentaSelector />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Navigation />
      </div>

      {/* User Info & Logout */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            {isAdmin ? (
              <Shield className="h-4 w-4 text-amber-500" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
              {isAdmin ? "Admin" : "Guest"}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}

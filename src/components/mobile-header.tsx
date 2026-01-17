"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Shield, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Separator } from "~/components/ui/separator";
import { Navigation } from "./navigation";
import { CuentaSelector } from "./cuenta-selector";
import { useAuth } from "~/lib/auth-context";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  // Obtener el título de la página actual
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/proyectos")) return "Proyectos";
    if (pathname.startsWith("/facturaciones")) return "Facturaciones";
    if (pathname.startsWith("/cobros")) return "Cobros";
    if (pathname.startsWith("/usuarios")) return "Usuarios";
    return "Project Tracker";
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      {/* Logo y título */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">PT</span>
        </div>
        <span className="font-semibold">{getPageTitle()}</span>
      </div>

      {/* Menu hamburguesa */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-left">Menú</SheetTitle>
          </SheetHeader>

          {/* Selector de cuenta */}
          <div className="border-b bg-muted/30 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Cuenta
            </p>
            <CuentaSelector />
          </div>

          {/* Navegación */}
          <div className="flex-1 px-4 py-4" onClick={() => setOpen(false)}>
            <Navigation />
          </div>

          {/* Usuario y logout */}
          <div className="mt-auto border-t p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-amber-500" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <Badge
                  variant={isAdmin ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isAdmin ? "Admin" : "Guest"}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

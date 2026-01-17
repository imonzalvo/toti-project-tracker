"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "~/lib/auth-context";
import { api } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import { MobileHeader } from "~/components/mobile-header";
import { MobileNav } from "~/components/mobile-nav";
import { CuentaProvider } from "~/lib/cuenta-context";

// Rutas que no requieren autenticación ni sidebar
const publicRoutes = ["/login", "/setup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.includes(pathname);

  const { data: setupStatus, isLoading: checkingSetup } =
    api.auth.checkSetup.useQuery();

  useEffect(() => {
    if (checkingSetup || isLoading) return;

    // Lógica de redirección para rutas protegidas
    if (!isPublicRoute) {
      if (setupStatus?.needsSetup) {
        router.push("/setup");
        return;
      }
      if (!user) {
        router.push("/login");
        return;
      }
    }

    // Si está en login/setup pero ya está autenticado, redirigir a home
    if (isPublicRoute && user && !setupStatus?.needsSetup) {
      router.push("/");
    }
  }, [user, isLoading, setupStatus, checkingSetup, router, pathname, isPublicRoute]);

  // Rutas públicas: mostrar sin sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Mostrar loading mientras se verifica autenticación
  if (isLoading || checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si necesita setup o no hay usuario, mostrar loading (se está redirigiendo)
  if (setupStatus?.needsSetup || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Usuario autenticado: mostrar app completa
  return (
    <CuentaProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar - solo visible en desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Header móvil - solo visible en mobile */}
        <MobileHeader />

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto md:ml-64">
          <div className="container mx-auto px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8">
            {children}
          </div>
        </main>

        {/* Bottom navigation - solo visible en mobile */}
        <MobileNav />
      </div>
    </CuentaProvider>
  );
}

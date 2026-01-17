import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";
import { AuthProvider } from "~/lib/auth-context";
import { AppShell } from "~/components/app-shell";

export const metadata: Metadata = {
  title: "Project Tracker - Gestión de Facturación",
  description: "Sistema de tracking de proyectos y cobros",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable}`}>
      <body className="min-h-screen bg-background antialiased">
        <TRPCReactProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { api } from "~/trpc/react";
import type { SessionUser } from "./session";

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = api.auth.getCurrentUser.useQuery();
  const logoutMutation = api.auth.logout.useMutation();

  const logout = () => {
    void (async () => {
      try {
        await logoutMutation.mutateAsync();
      } finally {
        // Navegación completa (no router.push) para descartar el cache de tRPC.
        window.location.href = "/login";
      }
    })();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAdmin: user?.role === "ADMIN",
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

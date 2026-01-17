"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Moneda = "UYU" | "USD";

interface CuentaContextType {
  moneda: Moneda;
  setMoneda: (moneda: Moneda) => void;
  monedaLabel: string;
  monedaSymbol: string;
}

const CuentaContext = createContext<CuentaContextType | undefined>(undefined);

const STORAGE_KEY = "cuenta-moneda-seleccionada";

export function CuentaProvider({ children }: { children: ReactNode }) {
  const [moneda, setMonedaState] = useState<Moneda>("USD");
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar la moneda guardada en localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "UYU" || stored === "USD") {
      setMonedaState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Guardar en localStorage cuando cambie
  const setMoneda = (newMoneda: Moneda) => {
    setMonedaState(newMoneda);
    localStorage.setItem(STORAGE_KEY, newMoneda);
  };

  const monedaLabel = moneda === "UYU" ? "Pesos (UYU)" : "Dólares (USD)";
  const monedaSymbol = moneda === "UYU" ? "$U" : "US$";

  // Evitar hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <CuentaContext.Provider
      value={{ moneda, setMoneda, monedaLabel, monedaSymbol }}
    >
      {children}
    </CuentaContext.Provider>
  );
}

export function useCuenta() {
  const context = useContext(CuentaContext);
  if (context === undefined) {
    throw new Error("useCuenta debe usarse dentro de un CuentaProvider");
  }
  return context;
}

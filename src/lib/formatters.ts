// Formatear moneda (UYU o USD)
export function formatCurrency(amount: number, moneda: "UYU" | "USD" = "USD"): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Obtener símbolo de moneda
export function getMonedaSymbol(moneda: "UYU" | "USD"): string {
  return moneda === "UYU" ? "$U" : "US$";
}

// Obtener label de moneda
export function getMonedaLabel(moneda: "UYU" | "USD"): string {
  return moneda === "UYU" ? "Pesos (UYU)" : "Dólares (USD)";
}

// Formatear porcentaje (hasta 3 decimales, eliminando ceros innecesarios)
export function formatPercentage(value: number): string {
  // Usar hasta 3 decimales y eliminar ceros al final
  const formatted = value.toFixed(3).replace(/\.?0+$/, "");
  return `${formatted}%`;
}

// Formatear fecha
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// Formatear fecha corta
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d);
}

// Obtener nombre del estado del proyecto
export function getEstadoProyectoLabel(estado: string): string {
  const labels: Record<string, string> = {
    NOT_STARTED: "No comenzó",
    IN_PROGRESS: "En progreso",
    FINISHED: "Finalizado",
  };
  return labels[estado] ?? estado;
}

// Obtener nombre del tipo de facturación
export function getTipoFacturacionLabel(tipo: string): string {
  const labels: Record<string, string> = {
    APROBACION: "Aprobación",
    ENTREGA_PARCIAL: "Entrega Parcial",
    ENTREGA_TOTAL: "Entrega Total",
  };
  return labels[tipo] ?? tipo;
}

// Obtener nombre del estado de facturación
export function getEstadoFacturacionLabel(estado: string): string {
  const labels: Record<string, string> = {
    EMITIDA: "Emitida",
    COBRADA: "Cobrada",
  };
  return labels[estado] ?? estado;
}

// Obtener nombre del trimestre
export function getTrimestreLabel(quarter: number): string {
  const labels: Record<number, string> = {
    1: "Ene – Mar",
    2: "Abr – Jun",
    3: "Jul – Sep",
    4: "Oct – Dic",
  };
  return labels[quarter] ?? `Q${quarter}`;
}

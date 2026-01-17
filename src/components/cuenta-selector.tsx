"use client";

import { useCuenta, type Moneda } from "~/lib/cuenta-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DollarSign } from "lucide-react";

export function CuentaSelector() {
  const { moneda, setMoneda } = useCuenta();

  return (
    <div className="flex items-center gap-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <Select value={moneda} onValueChange={(value) => setMoneda(value as Moneda)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Seleccionar cuenta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USD">
            <span className="flex items-center gap-2">
              <span className="font-medium">USD</span>
              <span className="text-muted-foreground text-xs">Dólares</span>
            </span>
          </SelectItem>
          <SelectItem value="UYU">
            <span className="flex items-center gap-2">
              <span className="font-medium">UYU</span>
              <span className="text-muted-foreground text-xs">Pesos</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

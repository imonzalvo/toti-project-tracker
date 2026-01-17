import { Suspense } from "react";
import { CobrosTrimestre } from "./_components/cobros-trimestre";

export default function CobrosPage() {
  // Get current quarter for initial load
  const currentDate = new Date();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
  const currentYear = currentDate.getFullYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Cobros Trimestrales
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Cálculo de comisiones por periodo
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<CobrosSkeleton />}>
        <CobrosTrimestre
          initialYear={currentYear}
          initialQuarter={currentQuarter}
        />
      </Suspense>
    </div>
  );
}

function CobrosSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl border bg-card" />
        <div className="h-32 animate-pulse rounded-xl border bg-card" />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

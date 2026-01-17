import { Suspense } from "react";
import { FacturacionesGlobalTable } from "./_components/facturaciones-global-table";

export default function FacturacionesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Facturaciones</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Vista global de todas las facturaciones
        </p>
      </div>

      {/* Table with Filters */}
      <Suspense fallback={<TableSkeleton />}>
        <FacturacionesGlobalTable />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

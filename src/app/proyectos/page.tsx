import { Suspense } from "react";
import { ProyectosTable } from "./_components/proyectos-table";
import { CreateProyectoDialog } from "./_components/create-proyecto-dialog";

export default function ProyectosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proyectos</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gestiona tus proyectos y su facturación
          </p>
        </div>
        <CreateProyectoDialog />
      </div>

      {/* Table */}
      <Suspense fallback={<TableSkeleton />}>
        <ProyectosTable />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

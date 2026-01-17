import { Suspense } from "react";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { ProyectoHeader } from "./_components/proyecto-header";
import { ProyectoStats } from "./_components/proyecto-stats";
import { FacturacionesTable } from "./_components/facturaciones-table";
import { CreateFacturacionDialog } from "./_components/create-facturacion-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProyectoDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Check if proyecto exists
  const proyecto = await api.proyecto.getById({ id }).catch(() => null);

  if (!proyecto) {
    notFound();
  }

  return (
    <>
      <div className="space-y-6">
        <Suspense fallback={<HeaderSkeleton />}>
          <ProyectoHeader id={id} />
        </Suspense>

        <Suspense fallback={<StatsSkeleton />}>
          <ProyectoStats id={id} />
        </Suspense>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Facturaciones</h2>
          <Suspense fallback={null}>
            <CreateFacturacionDialog proyectoId={id} />
          </Suspense>
        </div>

        <Suspense fallback={<TableSkeleton />}>
          <FacturacionesTable proyectoId={id} />
        </Suspense>
      </div>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-6 w-64 animate-pulse rounded bg-muted" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

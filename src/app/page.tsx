import { Suspense } from "react";
import { DashboardStats } from "./_components/dashboard-stats";
import { PendingInvoices } from "./_components/pending-invoices";
import { RecentPayments } from "./_components/recent-payments";

export default function DashboardPage() {
  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Resumen general de proyectos y facturación
          </p>
        </div>

        {/* KPI Cards */}
        <Suspense fallback={<StatsSkeletons />}>
          <DashboardStats />
        </Suspense>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Invoices */}
          <Suspense fallback={<TableSkeleton title="Facturas Pendientes" />}>
            <PendingInvoices />
          </Suspense>

          {/* Recent Payments */}
          <Suspense fallback={<TableSkeleton title="Últimos Cobros" />}>
            <RecentPayments />
          </Suspense>
        </div>
      </div>
    </>
  );
}

function StatsSkeletons() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border bg-card sm:h-32"
        />
      ))}
    </div>
  );
}

function TableSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

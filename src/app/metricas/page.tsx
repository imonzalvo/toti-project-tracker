import { MetricasView } from "./_components/metricas-view";

export default function MetricasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas</h1>
        <p className="text-muted-foreground text-sm">
          Análisis de proyectos aprobados por rango de fechas
        </p>
      </div>
      <MetricasView />
    </div>
  );
}

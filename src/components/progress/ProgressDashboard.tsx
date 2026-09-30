"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RangeTabs } from "@/components/progress/RangeTabs";
import { WeightCard } from "@/components/progress/WeightCard";
import { WeeklyVolumeChart, CaloriesChart } from "@/components/progress/Charts";
import { WeightChart } from "@/components/progress/WeightChart";
import type { Range } from "@/lib/utils/dates";
import { formatRelative } from "@/lib/utils/format";
import { formatDateLong } from "@/lib/utils/dates";

type Summary = {
  range: Range;
  sessionsCount: number;
  totalVolume: number;
  totalSets: number;
  prCount: number;
  weeklyVolume: Array<{ week: string; volume: number }>;
  frequency: Array<{ day: string; sessions: number }>;
  calories: { consumed: number; target: number; daysLogged: number };
  protein: { consumed: number; target: number; daysLogged: number };
  bodyWeight: { current: number | null; delta: number | null; series: Array<{ date: string; kg: number }> };
};

export function ProgressDashboard({
  range,
  summary,
  weight,
  workouts,
}: {
  range: Range;
  summary: Summary;
  weight: { current: number | null; delta7: number | null; delta30: number | null; movingAvg7: number | null };
  workouts: Array<{ id: string; name: string; date: string; status: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  function setRange(r: Range) {
    const sp = new URLSearchParams(params);
    sp.set("r", r);
    router.push(`/progreso?${sp.toString()}`);
  }

  const calPct = summary.calories.target > 0 ? (summary.calories.consumed / summary.calories.target) * 100 : 0;
  void calPct;
  const proteinPct = summary.protein.target > 0 ? (summary.protein.consumed / summary.protein.target) * 100 : 0;

  return (
    <div className="flex flex-col gap-space-md px-margin pb-space-xl">
      <RangeTabs current={range} onChange={setRange} />

      <div className="grid grid-cols-2 gap-space-sm">
        <StatCard label="Sesiones" value={String(summary.sessionsCount)} />
        <StatCard label="PRs" value={String(summary.prCount)} />
        <StatCard label="Volumen total" value={`${Math.round(summary.totalVolume).toLocaleString("es-AR")} kg`} />
        <StatCard label="Series" value={String(summary.totalSets)} />
      </div>

      <WeightCard weight={weight} />

      <Card className="gap-space-sm">
        <h3 className="font-headline-sm text-headline-sm">Volumen semanal</h3>
        <WeeklyVolumeChart data={summary.weeklyVolume} />
      </Card>

      <Card className="gap-space-sm">
        <h3 className="font-headline-sm text-headline-sm">Calorías y proteína</h3>
        <CaloriesChart consumed={summary.calories.consumed} target={summary.calories.target} />
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm">Proteína</span>
          <ProgressBar value={proteinPct} tone="secondary" />
          <span className="font-caption text-caption text-on-surface-variant">{Math.round(summary.protein.consumed)} / {Math.round(summary.protein.target)} g</span>
        </div>
      </Card>

      <Card className="gap-space-sm">
        <h3 className="font-headline-sm text-headline-sm">Peso corporal</h3>
        <WeightChart series={summary.bodyWeight.series} />
      </Card>

      <section className="flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-headline-sm">Historial</h3>
        {workouts.length === 0 ? (
          <Card>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">Sin entrenamientos aún.</p>
          </Card>
        ) : (
          workouts.map((w) => (
            <Link key={w.id} href={`/progreso/workouts/${w.id}`}>
              <Card className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-fixed">
                  <MaterialSymbol name="fitness_center" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-headline-sm text-headline-sm truncate">{w.name}</span>
                  <span className="font-caption text-caption text-on-surface-variant">
                    {formatDateLong(new Date(w.date))} · {formatRelative(w.date)}
                  </span>
                </div>
                <span className={"px-2 py-0.5 rounded text-caption font-caption uppercase " + (w.status === "COMPLETED" ? "bg-primary-fixed/10 text-primary-fixed" : "bg-error-container/20 text-error")}>
                  {w.status === "COMPLETED" ? "Listo" : w.status === "ACTIVE" ? "Activo" : "Aband."}
                </span>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
      <span className="font-headline-md text-headline-md text-on-surface font-bold">{value}</span>
    </Card>
  );
}
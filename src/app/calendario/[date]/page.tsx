import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, addDays } from "@/lib/utils/dates";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { formatKcal, formatGrams, formatDuration } from "@/lib/utils/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date: dateStr } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const date = new Date(`${dateStr}T12:00:00`);
  const start = startOfDay(date);
  const end = endOfDay(date);

  const [workouts, entries, weight] = await Promise.all([
    prisma.workout.findMany({
      where: { userId, startedAt: { gte: start, lte: end } },
      include: { exercises: { include: { exercise: true, sets: true } } },
    }),
    prisma.foodEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { mealType: "asc" },
    }),
    prisma.bodyWeightEntry.findFirst({
      where: { userId, date: start },
    }),
  ]);

  const totals = entries.reduce(
    (a, e) => ({ calories: a.calories + e.calories, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const prevStr = prev.toISOString().slice(0, 10);
  const nextStr = next.toISOString().slice(0, 10);

  return (
    <AppShell bottomNav={false}>
      <AppHeader title={start.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} backHref="/calendario" />
      <div className="flex flex-col gap-space-md px-margin pb-space-xl">
        <div className="flex items-center justify-between">
          <Link href={`/calendario/${prevStr}`} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface flex items-center gap-1 font-label-sm text-label-sm">
            <MaterialSymbol name="chevron_left" className="text-[16px]" />
            Anterior
          </Link>
          <Link href={`/calendario/${nextStr}`} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface flex items-center gap-1 font-label-sm text-label-sm">
            Siguiente
            <MaterialSymbol name="chevron_right" className="text-[16px]" />
          </Link>
        </div>

        {workouts.length === 0 && entries.length === 0 && !weight && (
          <Card>
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-8">Sin actividad este día.</p>
          </Card>
        )}

        {workouts.length > 0 && (
          <section className="flex flex-col gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm">Entrenamientos</h3>
            {workouts.map((w) => (
              <Link key={w.id} href={`/progreso/workouts/${w.id}`}>
                <Card className="gap-space-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-headline-sm text-headline-sm">{w.name}</h4>
                    <span className="font-caption text-caption text-on-surface-variant">
                      {w.endedAt ? formatDuration(Math.floor((w.endedAt.getTime() - w.startedAt.getTime()) / 1000)) : "—"}
                    </span>
                  </div>
                  {w.exercises.map((e) => (
                    <div key={e.id} className="flex items-center justify-between font-body-md text-body-md">
                      <span>{e.exercise.name}</span>
                      <span className="font-caption text-caption text-on-surface-variant">
                        {e.sets.filter((s) => s.completed).length}/{e.sets.length} series
                      </span>
                    </div>
                  ))}
                </Card>
              </Link>
            ))}
          </section>
        )}

        {entries.length > 0 && (
          <section className="flex flex-col gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm">Nutrición</h3>
            <Card className="gap-space-sm">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Calorías" value={formatKcal(totals.calories)} />
                <Stat label="Proteína" value={formatGrams(totals.protein)} />
                <Stat label="Carbos" value={formatGrams(totals.carbs)} />
                <Stat label="Grasas" value={formatGrams(totals.fat)} />
              </div>
            </Card>
            {entries.map((e) => (
              <Card key={e.id} level="low" className="flex items-center gap-3">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-body-lg text-body-lg">{e.name}</span>
                  <span className="font-caption text-caption text-on-surface-variant">
                    {e.mealType} · {formatKcal(e.calories)}
                  </span>
                </div>
              </Card>
            ))}
          </section>
        )}

        {weight && (
          <section className="flex flex-col gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm">Peso corporal</h3>
            <Card>
              <span className="font-display-hero text-display-hero text-on-surface">{weight.weightKg.toFixed(1)}</span>
              <span className="font-body-md text-body-md text-on-surface-variant ml-2">kg</span>
            </Card>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{value}</span>
    </div>
  );
}
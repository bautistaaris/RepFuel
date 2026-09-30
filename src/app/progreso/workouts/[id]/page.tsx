import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { formatKg, formatDuration } from "@/lib/utils/format";
import { formatDateLong } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const w = await prisma.workout.findFirst({
    where: { id, userId },
    include: {
      exercises: {
        include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
  if (!w) notFound();

  let totalVolume = 0;
  let completedSets = 0;
  let totalSets = 0;
  let totalReps = 0;
  for (const e of w.exercises) {
    for (const s of e.sets) {
      totalSets++;
      if (s.completed) {
        completedSets++;
        totalReps += s.reps ?? 0;
        totalVolume += (s.weight ?? 0) * (s.reps ?? 0);
      }
    }
  }
  const duration = w.endedAt ? Math.floor((w.endedAt.getTime() - w.startedAt.getTime()) / 1000) : 0;

  return (
    <AppShell bottomNav={false}>
      <AppHeader title={w.name} backHref="/progreso" />
      <div className="flex flex-col gap-space-md px-margin pb-space-xl">
        <Card className="gap-space-sm">
          <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{formatDateLong(w.startedAt)}</span>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Duración" value={formatDuration(duration)} />
            <Stat label="Volumen" value={`${Math.round(totalVolume).toLocaleString("es-AR")} kg`} />
            <Stat label="Series" value={`${completedSets}/${totalSets}`} />
            <Stat label="Repeticiones" value={String(totalReps)} />
          </div>
        </Card>

        {w.exercises.map((e) => {
          let exVol = 0;
          let exCompleted = 0;
          const hasPR = e.sets.some((s) => s.isPersonalRecord);
          for (const s of e.sets) {
            if (s.completed) {
              exCompleted++;
              exVol += (s.weight ?? 0) * (s.reps ?? 0);
            }
          }
          return (
            <Link key={e.id} href={`/progreso/ejercicios/${e.exerciseId}`}>
              <Card className="gap-space-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm">{e.exercise.name}</h3>
                  {hasPR && <span className="text-primary-fixed">🏆 PR</span>}
                </div>
                <div className="grid grid-cols-12 gap-1 text-caption font-caption uppercase tracking-wider text-on-surface-variant font-bold px-1 text-center">
                  <div className="col-span-2 text-left">Serie</div>
                  <div className="col-span-4">KG</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-3 text-right">✓</div>
                </div>
                {e.sets.map((s) => (
                  <div key={s.id} className={"grid grid-cols-12 gap-1 items-center p-1 rounded text-center " + (s.completed ? "bg-surface-container/60" : "bg-surface-container/30 opacity-60")}>
                    <div className="col-span-2 text-left">
                      <span className={"w-6 h-6 rounded inline-flex items-center justify-center font-label-numeric text-caption " + (s.completed ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-highest text-on-surface-variant")}>
                        {s.setNumber}
                      </span>
                    </div>
                    <div className="col-span-4 font-label-numeric text-label-sm text-on-surface">{formatKg(s.weight)}</div>
                    <div className="col-span-3 font-label-numeric text-label-sm text-on-surface">{s.reps ?? "—"}</div>
                    <div className="col-span-3 text-right">
                      {s.completed && <MaterialSymbol name="check" className="text-primary-fixed text-[20px]" />}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-caption font-caption text-on-surface-variant uppercase tracking-wider pt-1">
                  <span>{exCompleted}/{e.sets.length} series</span>
                  <span>{Math.round(exVol).toLocaleString("es-AR")} kg</span>
                </div>
              </Card>
            </Link>
          );
        })}
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
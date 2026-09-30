import { redirect, notFound } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getExerciseHistory } from "@/lib/services/pr";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { ExerciseHistoryChart } from "@/components/progress/ExerciseHistoryChart";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const exercise = await prisma.exercise.findFirst({
    where: { id, OR: [{ userId: null }, { userId }] },
  });
  if (!exercise) notFound();

  const history = await getExerciseHistory(userId, id, 60);
  const prSets = await prisma.workoutSet.findMany({
    where: {
      workoutExercise: { exerciseId: id, workout: { userId } },
      isPersonalRecord: true,
    },
    include: { workoutExercise: { include: { workout: true } } },
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  return (
    <AppShell bottomNav={false}>
      <AppHeader title={exercise.name} backHref="/biblioteca" />
      <div className="flex flex-col gap-space-md px-margin pb-space-xl">
        <Card>
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{exercise.muscleGroup}</p>
          {exercise.equipment && <p className="font-body-md text-body-md text-on-surface-variant">{exercise.equipment}</p>}
        </Card>

        {history.length > 0 && (
          <Card className="gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm">Evolución</h3>
            <ExerciseHistoryChart data={history} />
          </Card>
        )}

        {prSets.length > 0 && (
          <Card className="gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm">Records</h3>
            {prSets.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-body-lg text-body-lg">{s.weight ?? 0} kg × {s.reps ?? 0} reps</span>
                <span className="font-caption text-caption text-on-surface-variant">
                  {s.completedAt ? new Date(s.completedAt).toLocaleDateString("es-AR") : ""}
                </span>
              </div>
            ))}
          </Card>
        )}

        {history.length === 0 && (
          <Card>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              Sin historial todavía. Completá un entrenamiento con este ejercicio.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getActiveWorkout } from "@/lib/services/workouts";
import { getLastSessionData } from "@/lib/services/pr";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { ActiveWorkout } from "@/components/workouts/ActiveWorkout";
import { getSessionCsrf } from "@/lib/csrf-page";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ActiveWorkoutPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const workout = await getActiveWorkout(userId);
  if (!workout) redirect("/entreno");

  const csrf = await getSessionCsrf();

  const restDefaults = workout.routineId
    ? await prisma.routineExercise.findMany({
        where: { routineId: workout.routineId, routine: { userId } },
        select: { exerciseId: true, restSeconds: true, targetSets: true },
      })
    : [];

  const restByExercise = new Map<string, number>();
  for (const r of restDefaults) {
    restByExercise.set(r.exerciseId, r.restSeconds);
  }

  const previousByExercise = new Map<string, Array<{ weight: number | null; reps: number | null }>>();
  for (const we of workout.exercises) {
    const prior = await getLastSessionData(userId, we.exerciseId, workout.id);
    previousByExercise.set(we.exerciseId, prior);
  }

  const totalVolume = workout.exercises.reduce(
    (acc, e) =>
      acc +
      e.sets
        .filter((s) => s.completed)
        .reduce((sa, s) => sa + (s.weight ?? 0) * (s.reps ?? 0), 0),
    0,
  );
  const completedSets = workout.exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSets = workout.exercises.reduce((acc, e) => acc + e.sets.length, 0);

  const initialSetInputs = new Map<string, { weight: number | null; reps: number | null }>();
  for (const we of workout.exercises) {
    const prior = previousByExercise.get(we.exerciseId) ?? [];
    for (const s of we.sets) {
      const p = prior[s.setNumber - 1];
      if (s.weight === null && s.reps === null && p) {
        initialSetInputs.set(s.id, { weight: p.weight, reps: p.reps });
      }
    }
  }

  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Sesión Activa" backHref="/entreno" />
      <ActiveWorkout
        csrf={csrf}
        workoutId={workout.id}
        workoutName={workout.name}
        startedAt={workout.startedAt.toISOString()}
        totalVolume={totalVolume}
        completedSets={completedSets}
        totalSets={totalSets}
        exercises={workout.exercises.map((we) => ({
          id: we.id,
          exerciseId: we.exerciseId,
          name: we.exercise.name,
          muscleGroup: we.exercise.muscleGroup,
          equipment: we.exercise.equipment ?? null,
          position: we.position,
          restDefault: restByExercise.get(we.exerciseId) ?? 90,
          previous: previousByExercise.get(we.exerciseId) ?? [],
          sets: we.sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            completed: s.completed,
            restStartedAt: s.restStartedAt?.toISOString() ?? null,
            restDuration: s.restDuration,
            isPersonalRecord: s.isPersonalRecord,
            prType: s.prType,
            initialWeight: initialSetInputs.get(s.id)?.weight ?? null,
            initialReps: initialSetInputs.get(s.id)?.reps ?? null,
          })),
        }))}
      />
    </AppShell>
  );
}
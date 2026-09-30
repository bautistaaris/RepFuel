import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import { getRoutineDetail } from "@/lib/services/routines";
import { getActiveWorkout } from "@/lib/services/workouts";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { RoutineEditor } from "@/components/routines/RoutineEditor";
import { RoutineActions } from "@/components/routines/RoutineActions";
import { getSessionCsrf } from "@/lib/csrf-page";
import { listExercises } from "@/lib/services/exercises";
import { startWorkoutAction } from "@/actions/workouts";

export const dynamic = "force-dynamic";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const [routine, active, exercises, csrf] = await Promise.all([
    getRoutineDetail(userId, id),
    getActiveWorkout(userId),
    listExercises(),
    getSessionCsrf(),
  ]);
  if (!routine) notFound();

  const hasActive = !!active;

  return (
    <AppShell bottomNav={false}>
      <AppHeader title={routine.name} backHref="/entreno" right={<RoutineActions routineId={routine.id} csrf={csrf} />} />
      <div className="flex flex-col gap-space-md px-margin pb-space-xl">
        {routine.description && (
          <p className="font-body-md text-body-md text-on-surface-variant">{routine.description}</p>
        )}

        {hasActive ? (
          <Link
            href="/entreno/active"
            className="h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2"
          >
            <MaterialSymbol name="play_arrow" />
            Continuar entrenamiento activo
          </Link>
        ) : (
          <form action={startWorkoutAction.bind(null, routine.id, csrf)}>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(202,243,0,0.25)] active:scale-[0.98]"
            >
              <MaterialSymbol name="bolt" />
              Empezar entrenamiento
            </button>
          </form>
        )}

        <h3 className="font-headline-sm text-headline-sm text-on-surface pt-space-md">Ejercicios</h3>
        {routine.exercises.length === 0 ? (
          <Card>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              Agregá ejercicios a esta rutina.
            </p>
          </Card>
        ) : (
          <RoutineEditor
            routineId={routine.id}
            exercises={routine.exercises.map((e) => ({
              id: e.id,
              exerciseId: e.exerciseId,
              name: e.exercise.name,
              muscleGroup: e.exercise.muscleGroup,
              equipment: e.exercise.equipment ?? null,
              position: e.position,
              targetSets: e.targetSets,
              restSeconds: e.restSeconds,
              notes: e.notes,
            }))}
            availableExercises={exercises.map((e) => ({
              id: e.id,
              name: e.name,
              muscleGroup: e.muscleGroup,
              isCustom: e.isCustom,
            }))}
            csrf={csrf}
          />
        )}
      </div>
    </AppShell>
  );
}
import "server-only";
import { prisma } from "@/lib/db";

export type PRDetectionInput = {
  userId: string;
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  completedAt: Date;
};

export type PRResult = {
  isPR: boolean;
  type?: "HEAVIEST" | "MAX_VOLUME" | "MAX_REPS";
  previousValue?: number;
};

/**
 * PR detection is scoped to the requesting user's history ONLY.
 * Never compares against other users' sets.
 */
export async function detectPR(input: PRDetectionInput): Promise<PRResult> {
  const { userId, exerciseId, weight, reps, completedAt } = input;
  if (weight === null || reps === null) return { isPR: false };
  if (weight <= 0 || reps <= 0) return { isPR: false };

  const priorCompleted = await prisma.workoutSet.findMany({
    where: {
      workoutExercise: { exerciseId, workout: { userId } },
      completed: true,
      weight: { not: null },
      reps: { not: null },
      completedAt: { not: null, lt: completedAt },
    },
    select: { weight: true, reps: true },
  });

  const priorMaxWeight = priorCompleted.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
  const priorMaxVolume = priorCompleted.reduce((m, s) => Math.max(m, (s.weight ?? 0) * (s.reps ?? 0)), 0);
  const priorRepsAtWeight = priorCompleted
    .filter((s) => (s.weight ?? 0) === weight)
    .reduce((m, s) => Math.max(m, s.reps ?? 0), 0);

  const currentVolume = weight * reps;

  if (priorCompleted.length === 0) {
    return { isPR: true, type: "HEAVIEST", previousValue: 0 };
  }

  if (weight > priorMaxWeight) {
    return { isPR: true, type: "HEAVIEST", previousValue: priorMaxWeight };
  }

  if (currentVolume > priorMaxVolume) {
    return { isPR: true, type: "MAX_VOLUME", previousValue: priorMaxVolume };
  }

  if (reps > priorRepsAtWeight && priorRepsAtWeight > 0) {
    return { isPR: true, type: "MAX_REPS", previousValue: priorRepsAtWeight };
  }

  return { isPR: false };
}

export type ExerciseHistoryPoint = {
  date: string;
  weight: number | null;
  reps: number | null;
  volume: number;
};

export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit = 30,
): Promise<ExerciseHistoryPoint[]> {
  const sets = await prisma.workoutSet.findMany({
    where: {
      workoutExercise: { exerciseId, workout: { userId } },
      completed: true,
    },
    include: {
      workoutExercise: {
        include: { workout: { select: { startedAt: true } } },
      },
    },
    orderBy: { completedAt: "desc" },
    take: limit * 6,
  });

  const byDay = new Map<string, { weight: number; reps: number; volume: number; date: string }>();
  for (const s of sets) {
    if (!s.completedAt || s.weight === null || s.reps === null) continue;
    const day = s.completedAt.toISOString().slice(0, 10);
    const volume = s.weight * s.reps;
    const cur = byDay.get(day);
    if (!cur) {
      byDay.set(day, { weight: s.weight, reps: s.reps, volume, date: day });
    } else {
      cur.weight = Math.max(cur.weight, s.weight);
      cur.volume += volume;
    }
  }

  return [...byDay.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-limit)
    .map((p) => ({ date: p.date, weight: p.weight, reps: p.reps, volume: p.volume }));
}

export async function getLastSessionData(
  userId: string,
  exerciseId: string,
  currentWorkoutId: string,
): Promise<Array<{ weight: number | null; reps: number | null }>> {
  const current = await prisma.workout.findFirst({
    where: { id: currentWorkoutId, userId },
  });
  if (!current) return [];

  const prior = await prisma.workout.findFirst({
    where: {
      exercises: { some: { exerciseId } },
      userId,
      status: "COMPLETED",
      startedAt: { lt: current.startedAt },
    },
    orderBy: { startedAt: "desc" },
  });
  if (!prior) return [];

  const sets = await prisma.workoutSet.findMany({
    where: {
      workoutExercise: { workoutId: prior.id, exerciseId },
      completed: true,
    },
    orderBy: { setNumber: "asc" },
    select: { weight: true, reps: true },
  });

  return sets.map((s) => ({ weight: s.weight, reps: s.reps }));
}
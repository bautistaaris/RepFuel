import "server-only";
import { prisma } from "@/lib/db";
import { detectPR, getLastSessionData } from "./pr";

export async function startWorkout(userId: string, routineId: string): Promise<string> {
  const existing = await prisma.workout.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (existing) return existing.id;

  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    include: { exercises: { include: { exercise: true }, orderBy: { position: "asc" } } },
  });
  if (!routine) throw new Error("Rutina no encontrada");

  const workout = await prisma.workout.create({
    data: {
      userId,
      routineId,
      name: routine.name,
      status: "ACTIVE",
      exercises: {
        create: routine.exercises.map((re) => ({
          exerciseId: re.exerciseId,
          position: re.position,
          sets: {
            create: Array.from({ length: re.targetSets }).map((_, i) => ({
              setNumber: i + 1,
              weight: null,
              reps: null,
              completed: false,
            })),
          },
        })),
      },
    },
  });

  return workout.id;
}

export async function getActiveWorkout(userId: string) {
  return prisma.workout.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
}

export async function updateSet(
  userId: string,
  setId: string,
  data: { weight?: number | null; reps?: number | null },
): Promise<void> {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) throw new Error("Set no encontrado");
  if (set.workoutExercise.workout.status !== "ACTIVE") throw new Error("Workout no activo");

  await prisma.workoutSet.update({
    where: { id: setId },
    data: {
      ...(data.weight !== undefined ? { weight: data.weight } : {}),
      ...(data.reps !== undefined ? { reps: data.reps } : {}),
    },
  });
}

export async function toggleSet(userId: string, setId: string, completed: boolean): Promise<void> {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true, exercise: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) throw new Error("Set no encontrado");
  if (set.workoutExercise.workout.status !== "ACTIVE") throw new Error("Workout no activo");

  const completedAt = completed ? new Date() : null;

  let prUpdate: { isPersonalRecord: boolean; prType: string | null } = { isPersonalRecord: false, prType: null };
  if (completed) {
    const pr = await detectPR({
      exerciseId: set.workoutExercise.exerciseId,
      weight: set.weight,
      reps: set.reps,
      completedAt: completedAt ?? new Date(),
    });
    prUpdate = { isPersonalRecord: pr.isPR, prType: pr.type ?? null };
  } else {
    const alreadyPr = await prisma.workoutSet.findFirst({
      where: { workoutExerciseId: set.workoutExerciseId, isPersonalRecord: true, NOT: { id: setId } },
    });
    if (!alreadyPr) {
      const others = await prisma.workoutSet.count({
        where: { workoutExerciseId: set.workoutExerciseId, isPersonalRecord: true, NOT: { id: setId } },
      });
      if (others === 0) prUpdate = { isPersonalRecord: false, prType: null };
    }
  }

  await prisma.workoutSet.update({
    where: { id: setId },
    data: { completed, completedAt, ...prUpdate },
  });
}

export async function addSet(userId: string, workoutExerciseId: string): Promise<void> {
  const we = await prisma.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
    include: { workout: true, sets: { orderBy: { setNumber: "desc" }, take: 1 } },
  });
  if (!we || we.workout.userId !== userId) throw new Error("Ejercicio no encontrado");
  if (we.workout.status !== "ACTIVE") throw new Error("Workout no activo");

  const lastNumber = we.sets[0]?.setNumber ?? 0;
  await prisma.workoutSet.create({
    data: {
      workoutExerciseId,
      setNumber: lastNumber + 1,
      weight: null,
      reps: null,
      completed: false,
    },
  });
}

export async function removeSet(userId: string, setId: string): Promise<void> {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true, sets: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) throw new Error("Set no encontrado");
  if (set.workoutExercise.workout.status !== "ACTIVE") throw new Error("Workout no activo");
  if (set.workoutExercise.sets.length <= 1) throw new Error("No se puede eliminar el último set");

  const removedNumber = set.setNumber;
  await prisma.$transaction([
    prisma.workoutSet.delete({ where: { id: setId } }),
    ...set.workoutExercise.sets
      .filter((s) => s.setNumber > removedNumber)
      .map((s) =>
        prisma.workoutSet.update({ where: { id: s.id }, data: { setNumber: s.setNumber - 1 } }),
      ),
  ]);
}

export async function startRest(userId: string, setId: string, durationSec: number): Promise<void> {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) throw new Error("Set no encontrado");

  await prisma.workoutSet.update({
    where: { id: setId },
    data: { restStartedAt: new Date(), restDuration: durationSec },
  });
}

export async function skipRest(userId: string, setId: string): Promise<void> {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) throw new Error("Set no encontrado");
  await prisma.workoutSet.update({
    where: { id: setId },
    data: { restStartedAt: null, restDuration: null },
  });
}

export async function addRestSeconds(userId: string, setId: string, seconds: number): Promise<void> {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) throw new Error("Set no encontrado");
  if (!set.restDuration) throw new Error("No hay descanso activo");

  await prisma.workoutSet.update({
    where: { id: setId },
    data: { restDuration: set.restDuration + seconds },
  });
}

export async function completeWorkout(userId: string, workoutId: string) {
  const w = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!w || w.userId !== userId) throw new Error("Workout no encontrado");
  if (w.status !== "ACTIVE") return;

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: "COMPLETED", endedAt: new Date() },
  });
}

export async function abandonWorkout(userId: string, workoutId: string) {
  const w = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!w || w.userId !== userId) throw new Error("Workout no encontrado");
  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: "ABANDONED", endedAt: new Date() },
  });
}

export async function listWorkouts(userId: string, limit = 20, offset = 0) {
  const [items, total] = await Promise.all([
    prisma.workout.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
        },
      },
    }),
    prisma.workout.count({ where: { userId } }),
  ]);
  return { items, total };
}

export { getLastSessionData };

export async function getRoutineExerciseSettings(routineId: string): Promise<Map<string, number>> {
  const rows = await prisma.routineExercise.findMany({
    where: { routineId },
    select: { exerciseId: true, restSeconds: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.exerciseId, r.restSeconds);
  return map;
}
import "server-only";
import { prisma } from "@/lib/db";

export type RoutineListItem = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  exerciseCount: number;
  lastUsedAt: Date | null;
};

export async function listRoutines(userId: string): Promise<RoutineListItem[]> {
  const routines = await prisma.routine.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { exercises: { select: { id: true } } },
  });
  const lastByRoutine = await prisma.workout.findMany({
    where: { userId, routineId: { in: routines.map((r) => r.id) } },
    orderBy: { startedAt: "desc" },
    select: { routineId: true, startedAt: true },
  });
  const lastMap = new Map<string, Date>();
  for (const w of lastByRoutine) {
    if (w.routineId && !lastMap.has(w.routineId)) lastMap.set(w.routineId, w.startedAt);
  }
  return routines.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    order: r.order,
    exerciseCount: r.exercises.length,
    lastUsedAt: lastMap.get(r.id) ?? null,
  }));
}

export async function getRoutineDetail(userId: string, routineId: string) {
  return prisma.routine.findFirst({
    where: { id: routineId, userId },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { exercise: true },
      },
    },
  });
}

export async function createRoutine(
  userId: string,
  input: { name: string; description?: string },
): Promise<string> {
  const last = await prisma.routine.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;
  const r = await prisma.routine.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      order,
    },
  });
  return r.id;
}

export async function updateRoutine(
  userId: string,
  routineId: string,
  input: { name?: string; description?: string | null },
): Promise<void> {
  const r = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!r) throw new Error("Rutina no encontrada");
  await prisma.routine.update({
    where: { id: routineId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });
}

export async function deleteRoutine(userId: string, routineId: string): Promise<void> {
  const r = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!r) throw new Error("Rutina no encontrada");
  await prisma.routine.delete({ where: { id: routineId } });
}

export async function duplicateRoutine(userId: string, routineId: string): Promise<string> {
  const original = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    include: { exercises: { orderBy: { position: "asc" } } },
  });
  if (!original) throw new Error("Rutina no encontrada");

  const last = await prisma.routine.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;

  const copy = await prisma.routine.create({
    data: {
      userId,
      name: `${original.name} (copia)`,
      description: original.description,
      order,
      exercises: {
        create: original.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          position: e.position,
          targetSets: e.targetSets,
          restSeconds: e.restSeconds,
          notes: e.notes,
        })),
      },
    },
  });
  return copy.id;
}

export async function addExerciseToRoutine(
  userId: string,
  routineId: string,
  exerciseId: string,
  targetSets = 3,
  restSeconds = 90,
): Promise<void> {
  const r = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!r) throw new Error("Rutina no encontrada");
  const ex = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex) throw new Error("Ejercicio no encontrado");

  const last = await prisma.routineExercise.findFirst({
    where: { routineId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? -1) + 1;

  await prisma.routineExercise.create({
    data: { routineId, exerciseId, position, targetSets, restSeconds },
  });
}

export async function removeExerciseFromRoutine(
  userId: string,
  routineExerciseId: string,
): Promise<void> {
  const re = await prisma.routineExercise.findUnique({
    where: { id: routineExerciseId },
    include: { routine: true },
  });
  if (!re || re.routine.userId !== userId) throw new Error("No encontrado");
  await prisma.$transaction([
    prisma.routineExercise.delete({ where: { id: routineExerciseId } }),
    prisma.routineExercise.updateMany({
      where: { routineId: re.routineId, position: { gt: re.position } },
      data: { position: { decrement: 1 } },
    }),
  ]);
}

export async function reorderRoutineExercises(
  userId: string,
  routineId: string,
  orderedIds: string[],
): Promise<void> {
  const r = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!r) throw new Error("Rutina no encontrada");
  const exercises = await prisma.routineExercise.findMany({
    where: { routineId },
    select: { id: true },
  });
  const validIds = new Set(exercises.map((e) => e.id));
  if (orderedIds.length !== exercises.length || orderedIds.some((id) => !validIds.has(id))) {
    throw new Error("Lista de IDs inválida");
  }
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.routineExercise.update({ where: { id }, data: { position: idx } }),
    ),
  );
}

export async function updateRoutineExercise(
  userId: string,
  routineExerciseId: string,
  input: { targetSets?: number; restSeconds?: number; notes?: string | null },
): Promise<void> {
  const re = await prisma.routineExercise.findUnique({
    where: { id: routineExerciseId },
    include: { routine: true },
  });
  if (!re || re.routine.userId !== userId) throw new Error("No encontrado");
  await prisma.routineExercise.update({
    where: { id: routineExerciseId },
    data: {
      ...(input.targetSets !== undefined ? { targetSets: input.targetSets } : {}),
      ...(input.restSeconds !== undefined ? { restSeconds: input.restSeconds } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}
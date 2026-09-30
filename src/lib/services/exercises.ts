import "server-only";
import { prisma } from "@/lib/db";

export async function listExercisesForUser(userId: string, filter?: { muscleGroup?: string; search?: string; customOnly?: boolean }) {
  return prisma.exercise.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      ...(filter?.muscleGroup ? { muscleGroup: filter.muscleGroup } : {}),
      ...(filter?.customOnly ? { userId } : {}),
      ...(filter?.search ? { name: { contains: filter.search } } : {}),
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });
}

export async function listMuscleGroupsForUser(userId: string): Promise<string[]> {
  const rows = await prisma.exercise.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    distinct: ["muscleGroup"],
    select: { muscleGroup: true },
    orderBy: { muscleGroup: "asc" },
  });
  return rows.map((r) => r.muscleGroup);
}

export async function createCustomExercise(
  userId: string,
  input: { name: string; muscleGroup: string; secondaryMuscles?: string; equipment?: string; notes?: string },
): Promise<string> {
  const exists = await prisma.exercise.findFirst({
    where: {
      OR: [{ userId: null }, { userId }],
      name: { equals: input.name },
    },
  });
  if (exists) throw new Error("Ya existe un ejercicio con ese nombre");
  const ex = await prisma.exercise.create({
    data: {
      userId,
      name: input.name,
      muscleGroup: input.muscleGroup,
      secondaryMuscles: input.secondaryMuscles,
      equipment: input.equipment,
      notes: input.notes,
      isCustom: true,
    },
  });
  return ex.id;
}

export async function updateCustomExercise(
  userId: string,
  exerciseId: string,
  input: { name?: string; muscleGroup?: string; secondaryMuscles?: string; equipment?: string; notes?: string },
): Promise<void> {
  const ex = await prisma.exercise.findFirst({ where: { id: exerciseId, userId } });
  if (!ex) throw new Error("Ejercicio no encontrado o no es tuyo");
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.muscleGroup !== undefined ? { muscleGroup: input.muscleGroup } : {}),
      ...(input.secondaryMuscles !== undefined ? { secondaryMuscles: input.secondaryMuscles } : {}),
      ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}

export async function deleteCustomExercise(userId: string, exerciseId: string): Promise<void> {
  const ex = await prisma.exercise.findFirst({ where: { id: exerciseId, userId } });
  if (!ex) throw new Error("Ejercicio no encontrado o no es tuyo");
  await prisma.exercise.delete({ where: { id: exerciseId } });
}
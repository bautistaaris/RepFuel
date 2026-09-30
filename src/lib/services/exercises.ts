import "server-only";
import { prisma } from "@/lib/db";

export async function listExercises(filter?: { muscleGroup?: string; search?: string; customOnly?: boolean }) {
  return prisma.exercise.findMany({
    where: {
      ...(filter?.muscleGroup ? { muscleGroup: filter.muscleGroup } : {}),
      ...(filter?.customOnly ? { isCustom: true } : {}),
      ...(filter?.search
        ? { name: { contains: filter.search } }
        : {}),
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });
}

export async function listMuscleGroups(): Promise<string[]> {
  const rows = await prisma.exercise.findMany({
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
    where: { name: { equals: input.name }, isCustom: false },
  });
  if (exists) throw new Error("Ya existe un ejercicio con ese nombre en la biblioteca");
  const ex = await prisma.exercise.create({
    data: {
      name: input.name,
      muscleGroup: input.muscleGroup,
      secondaryMuscles: input.secondaryMuscles,
      equipment: input.equipment,
      notes: input.notes,
      isCustom: true,
    },
  });
  void userId;
  return ex.id;
}

export async function updateExercise(
  userId: string,
  exerciseId: string,
  input: { name?: string; muscleGroup?: string; secondaryMuscles?: string; equipment?: string; notes?: string },
): Promise<void> {
  const ex = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex) throw new Error("Ejercicio no encontrado");
  if (!ex.isCustom) throw new Error("Solo se pueden editar ejercicios personalizados");
  void userId;
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
  const ex = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex) throw new Error("Ejercicio no encontrado");
  if (!ex.isCustom) throw new Error("No se puede eliminar un ejercicio de la biblioteca");
  void userId;
  await prisma.exercise.delete({ where: { id: exerciseId } });
}
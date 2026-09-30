import "server-only";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

async function exists<T extends { userId: string } | null>(
  promise: Promise<T>,
): Promise<T | null> {
  return promise;
}

export async function getOwnedRoutine(userId: string, routineId: string) {
  const r = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { exercise: true },
      },
    },
  });
  if (!r) notFound();
  return r;
}

export async function getOwnedWorkout(userId: string, workoutId: string) {
  const w = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: {
      exercises: {
        include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
  if (!w) notFound();
  return w;
}

export async function getOwnedFoodEntry(userId: string, entryId: string) {
  const e = await prisma.foodEntry.findFirst({ where: { id: entryId, userId } });
  if (!e) notFound();
  return e;
}

export async function getOwnedBodyWeight(userId: string, entryId: string) {
  const e = await prisma.bodyWeightEntry.findFirst({ where: { id: entryId, userId } });
  if (!e) notFound();
  return e;
}

export async function getOwnedSavedFood(userId: string, id: string) {
  const e = await prisma.savedFood.findFirst({ where: { id, userId } });
  if (!e) notFound();
  return e;
}

export async function getOwnedSavedMeal(userId: string, id: string) {
  const e = await prisma.savedMeal.findFirst({ where: { id, userId }, include: { items: true } });
  if (!e) notFound();
  return e;
}

export async function getOwnedRoutineExercise(userId: string, reId: string) {
  const re = await prisma.routineExercise.findUnique({
    where: { id: reId },
    include: { routine: true, exercise: true },
  });
  if (!re || re.routine.userId !== userId) notFound();
  return re;
}

export async function getOwnedWorkoutSet(userId: string, setId: string) {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { workoutExercise: { include: { workout: true, exercise: true } } },
  });
  if (!set || set.workoutExercise.workout.userId !== userId) notFound();
  return set;
}

export async function getOwnedExercise(userId: string, exerciseId: string) {
  const ex = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ userId: null }, { userId }],
    },
  });
  if (!ex) notFound();
  return ex;
}

export async function getOwnedCustomExercise(userId: string, exerciseId: string) {
  const ex = await prisma.exercise.findFirst({
    where: { id: exerciseId, userId },
  });
  if (!ex) notFound();
  return ex;
}
void getOwnedExercise;
void getOwnedCustomExercise;
void exists;
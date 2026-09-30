"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import {
  createRoutine,
  updateRoutine,
  deleteRoutine,
  duplicateRoutine,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
  reorderRoutineExercises,
  updateRoutineExercise,
} from "@/lib/services/routines";
import {
  createCustomExercise,
  updateExercise,
  deleteCustomExercise,
} from "@/lib/services/exercises";

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

const RoutineCreate = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

export async function createRoutineAction(input: { name: string; description?: string }) {
  const userId = await requireUser();
  const parsed = RoutineCreate.parse(input);
  const id = await createRoutine(userId, parsed);
  revalidatePath("/entreno");
  return { ok: true as const, id };
}

const RoutineUpdate = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function updateRoutineAction(input: { id: string; name?: string; description?: string | null }) {
  const userId = await requireUser();
  const parsed = RoutineUpdate.parse(input);
  await updateRoutine(userId, parsed.id, { name: parsed.name, description: parsed.description });
  revalidatePath("/entreno");
  revalidatePath(`/entreno/${parsed.id}`);
  return { ok: true as const };
}

export async function deleteRoutineAction(routineId: string) {
  const userId = await requireUser();
  await deleteRoutine(userId, routineId);
  revalidatePath("/entreno");
  return { ok: true as const };
}

export async function duplicateRoutineAction(routineId: string) {
  const userId = await requireUser();
  const id = await duplicateRoutine(userId, routineId);
  revalidatePath("/entreno");
  return { ok: true as const, id };
}

const AddExercise = z.object({
  routineId: z.string().min(1),
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(20).optional(),
  restSeconds: z.number().int().min(0).max(900).optional(),
});

export async function addExerciseToRoutineAction(input: {
  routineId: string;
  exerciseId: string;
  targetSets?: number;
  restSeconds?: number;
}) {
  const userId = await requireUser();
  const parsed = AddExercise.parse(input);
  await addExerciseToRoutine(userId, parsed.routineId, parsed.exerciseId, parsed.targetSets, parsed.restSeconds);
  revalidatePath(`/entreno/${parsed.routineId}`);
  return { ok: true as const };
}

export async function removeExerciseFromRoutineAction(routineExerciseId: string) {
  const userId = await requireUser();
  await removeExerciseFromRoutine(userId, routineExerciseId);
  revalidatePath("/entreno");
  return { ok: true as const };
}

export async function reorderRoutineExercisesAction(input: { routineId: string; orderedIds: string[] }) {
  const userId = await requireUser();
  const parsed = z.object({ routineId: z.string().min(1), orderedIds: z.array(z.string().min(1)) }).parse(input);
  await reorderRoutineExercises(userId, parsed.routineId, parsed.orderedIds);
  revalidatePath(`/entreno/${parsed.routineId}`);
  return { ok: true as const };
}

const UpdateRoutineExercise = z.object({
  id: z.string().min(1),
  targetSets: z.number().int().min(1).max(20).optional(),
  restSeconds: z.number().int().min(0).max(900).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function updateRoutineExerciseAction(input: {
  id: string;
  targetSets?: number;
  restSeconds?: number;
  notes?: string | null;
}) {
  const userId = await requireUser();
  const parsed = UpdateRoutineExercise.parse(input);
  await updateRoutineExercise(userId, parsed.id, {
    targetSets: parsed.targetSets,
    restSeconds: parsed.restSeconds,
    notes: parsed.notes,
  });
  revalidatePath("/entreno");
  return { ok: true as const };
}

const CreateExercise = z.object({
  name: z.string().min(1).max(120),
  muscleGroup: z.string().min(1).max(60),
  secondaryMuscles: z.string().max(120).optional(),
  equipment: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export async function createCustomExerciseAction(input: {
  name: string;
  muscleGroup: string;
  secondaryMuscles?: string;
  equipment?: string;
  notes?: string;
}) {
  const userId = await requireUser();
  const parsed = CreateExercise.parse(input);
  const id = await createCustomExercise(userId, parsed);
  revalidatePath("/biblioteca");
  return { ok: true as const, id };
}

const UpdateExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  muscleGroup: z.string().min(1).max(60).optional(),
  secondaryMuscles: z.string().max(120).optional(),
  equipment: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export async function updateCustomExerciseAction(input: {
  id: string;
  name?: string;
  muscleGroup?: string;
  secondaryMuscles?: string;
  equipment?: string;
  notes?: string;
}) {
  const userId = await requireUser();
  const parsed = UpdateExerciseSchema.parse(input);
  await updateExercise(userId, parsed.id, parsed);
  revalidatePath("/biblioteca");
  return { ok: true as const };
}

export async function deleteCustomExerciseAction(exerciseId: string) {
  const userId = await requireUser();
  await deleteCustomExercise(userId, exerciseId);
  revalidatePath("/biblioteca");
  return { ok: true as const };
}
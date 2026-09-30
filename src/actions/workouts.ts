"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import {
  startWorkout,
  toggleSet,
  updateSet,
  addSet,
  removeSet,
  startRest,
  skipRest,
  addRestSeconds,
  completeWorkout,
  abandonWorkout,
} from "@/lib/services/workouts";

const RoutineIdSchema = z.object({ routineId: z.string().min(1) });

export async function startWorkoutAction(routineId: string, _csrf: string) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const parsed = RoutineIdSchema.safeParse({ routineId });
  if (!parsed.success) throw new Error("Datos inválidos");
  await startWorkout(userId, parsed.data.routineId);
  revalidatePath("/inicio");
  redirect("/entreno/active");
}

const SetIdSchema = z.object({ setId: z.string().min(1) });
const ToggleSchema = z.object({ setId: z.string().min(1), completed: z.boolean() });

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

export async function toggleSetAction(input: { setId: string; completed: boolean }) {
  const userId = await requireUser();
  const parsed = ToggleSchema.parse(input);
  await toggleSet(userId, parsed.setId, parsed.completed);
  revalidatePath("/entreno/active");
  revalidatePath("/inicio");
  return { ok: true as const };
}

const UpdateSetSchema = z.object({
  setId: z.string().min(1),
  weight: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
});

export async function updateSetAction(input: { setId: string; weight?: number | null; reps?: number | null }) {
  const userId = await requireUser();
  const parsed = UpdateSetSchema.parse(input);
  await updateSet(userId, parsed.setId, { weight: parsed.weight, reps: parsed.reps });
  revalidatePath("/entreno/active");
  return { ok: true as const };
}

export async function addSetAction(workoutExerciseId: string) {
  const userId = await requireUser();
  await addSet(userId, workoutExerciseId);
  revalidatePath("/entreno/active");
  return { ok: true as const };
}

export async function removeSetAction(setId: string) {
  const userId = await requireUser();
  const parsed = SetIdSchema.parse({ setId });
  await removeSet(userId, parsed.setId);
  revalidatePath("/entreno/active");
  return { ok: true as const };
}

export async function startRestAction(input: { setId: string; durationSec: number }) {
  const userId = await requireUser();
  const parsed = z.object({ setId: z.string().min(1), durationSec: z.number().int().min(1).max(900) }).parse(input);
  await startRest(userId, parsed.setId, parsed.durationSec);
  revalidatePath("/entreno/active");
  return { ok: true as const };
}

export async function skipRestAction(setId: string) {
  const userId = await requireUser();
  const parsed = SetIdSchema.parse({ setId });
  await skipRest(userId, parsed.setId);
  revalidatePath("/entreno/active");
  return { ok: true as const };
}

export async function addRestSecondsAction(input: { setId: string; seconds: number }) {
  const userId = await requireUser();
  const parsed = z.object({ setId: z.string().min(1), seconds: z.number().int().min(1).max(300) }).parse(input);
  await addRestSeconds(userId, parsed.setId, parsed.seconds);
  revalidatePath("/entreno/active");
  return { ok: true as const };
}

export async function completeWorkoutAction(workoutId: string) {
  const userId = await requireUser();
  await completeWorkout(userId, workoutId);
  revalidatePath("/inicio");
  revalidatePath("/entreno");
  revalidatePath("/progreso");
  redirect("/entreno");
}

export async function abandonWorkoutAction(workoutId: string) {
  const userId = await requireUser();
  await abandonWorkout(userId, workoutId);
  revalidatePath("/inicio");
  redirect("/inicio");
}
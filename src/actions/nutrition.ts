"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import {
  addFoodEntry,
  deleteFoodEntry,
  updateTarget,
  parseNutritionFor,
  createSavedFood,
  deleteSavedFood,
  createSavedMeal,
  deleteSavedMeal,
  logSavedMeal,
  logSavedFood,
} from "@/lib/services/nutrition";
import type { MealType } from "@/lib/types/nutrition";

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

const MealEnum = z.enum(["BREAKFAST", "LUNCH", "SNACK", "DINNER", "OTHER"]);

const AddEntry = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().positive().max(5000),
  unit: z.string().min(1).max(20),
  calories: z.number().min(0).max(20000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(2000),
  fat: z.number().min(0).max(1000),
  mealType: MealEnum,
  date: z.string().min(1),
  valuesAreEstimated: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function addFoodEntryAction(input: z.infer<typeof AddEntry>) {
  const userId = await requireUser();
  const parsed = AddEntry.parse(input);
  await addFoodEntry(userId, {
    ...parsed,
    date: new Date(parsed.date),
    valuesAreEstimated: parsed.valuesAreEstimated,
  });
  revalidatePath("/dieta");
  revalidatePath("/inicio");
  revalidatePath("/progreso");
  return { ok: true as const };
}

export async function deleteFoodEntryAction(entryId: string) {
  const userId = await requireUser();
  await deleteFoodEntry(userId, entryId);
  revalidatePath("/dieta");
  revalidatePath("/inicio");
  return { ok: true as const };
}

const UpdateTarget = z.object({
  calories: z.number().min(500).max(10000),
  protein: z.number().min(20).max(500),
  carbs: z.number().min(20).max(1500),
  fat: z.number().min(10).max(400),
});

export async function updateNutritionTargetAction(input: z.infer<typeof UpdateTarget>) {
  const userId = await requireUser();
  const parsed = UpdateTarget.parse(input);
  await updateTarget(userId, parsed);
  revalidatePath("/dieta");
  revalidatePath("/inicio");
  return { ok: true as const };
}

export async function parseNutritionAction(input: { description: string }) {
  const userId = await requireUser();
  return parseNutritionFor(userId, input.description);
}

const SavedFood = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().max(20).optional(),
  defaultQty: z.number().positive().max(5000).optional(),
  calories: z.number().min(0).max(20000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(2000),
  fat: z.number().min(0).max(1000),
  notes: z.string().max(500).optional(),
});

export async function createSavedFoodAction(input: z.infer<typeof SavedFood>) {
  const userId = await requireUser();
  const parsed = SavedFood.parse(input);
  const id = await createSavedFood(userId, parsed);
  revalidatePath("/dieta/guardados");
  return { ok: true as const, id };
}

export async function deleteSavedFoodAction(id: string) {
  const userId = await requireUser();
  await deleteSavedFood(userId, id);
  revalidatePath("/dieta/guardados");
  return { ok: true as const };
}

const SavedMealItem = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});

const SavedMeal = z.object({
  name: z.string().min(1).max(120),
  notes: z.string().max(500).optional(),
  items: z.array(SavedMealItem).min(1),
});

export async function createSavedMealAction(input: z.infer<typeof SavedMeal>) {
  const userId = await requireUser();
  const parsed = SavedMeal.parse(input);
  const id = await createSavedMeal(userId, parsed);
  revalidatePath("/dieta/guardados");
  return { ok: true as const, id };
}

export async function deleteSavedMealAction(id: string) {
  const userId = await requireUser();
  await deleteSavedMeal(userId, id);
  revalidatePath("/dieta/guardados");
  return { ok: true as const };
}

export async function logSavedFoodAction(input: { id: string; mealType: MealType; date: string }) {
  const userId = await requireUser();
  await logSavedFood(userId, input.id, input.mealType, new Date(input.date));
  revalidatePath("/dieta");
  return { ok: true as const };
}

export async function logSavedMealAction(input: { id: string; mealType: MealType; date: string }) {
  const userId = await requireUser();
  await logSavedMeal(userId, input.id, input.mealType, new Date(input.date));
  revalidatePath("/dieta");
  return { ok: true as const };
}
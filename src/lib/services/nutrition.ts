import "server-only";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, rangeStart, type Range } from "@/lib/utils/dates";
import type { NutritionParser, NutritionEstimate } from "@/lib/parsers/types";
import { getParser } from "@/lib/parsers";
import type { MealType } from "@/lib/types/nutrition";

export type { MealType };
export { MEAL_LABELS, MEAL_ICONS } from "@/lib/types/nutrition";

export type FoodEntryInput = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  date: Date;
  valuesAreEstimated?: boolean;
  notes?: string;
};

export async function addFoodEntry(userId: string, input: FoodEntryInput): Promise<string> {
  const e = await prisma.foodEntry.create({
    data: {
      userId,
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      mealType: input.mealType,
      date: input.date,
      valuesAreEstimated: input.valuesAreEstimated ?? false,
      notes: input.notes,
    },
  });
  return e.id;
}

export async function deleteFoodEntry(userId: string, entryId: string): Promise<void> {
  const e = await prisma.foodEntry.findUnique({ where: { id: entryId } });
  if (!e || e.userId !== userId) throw new Error("No encontrado");
  await prisma.foodEntry.delete({ where: { id: entryId } });
}

export async function listFoodEntries(userId: string, date: Date) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  return prisma.foodEntry.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: [{ mealType: "asc" }, { createdAt: "asc" }],
  });
}

export async function dailyTotals(userId: string, date: Date) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  const rows = await prisma.foodEntry.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { calories: true, protein: true, carbs: true, fat: true },
  });
  return rows.reduce(
    (acc, r) => ({
      calories: acc.calories + r.calories,
      protein: acc.protein + r.protein,
      carbs: acc.carbs + r.carbs,
      fat: acc.fat + r.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export async function getOrCreateTarget(userId: string) {
  const existing = await prisma.dailyNutritionTarget.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.dailyNutritionTarget.create({
    data: { userId, calories: 2800, protein: 160, carbs: 350, fat: 80 },
  });
}

export async function updateTarget(
  userId: string,
  input: { calories: number; protein: number; carbs: number; fat: number },
): Promise<void> {
  const existing = await prisma.dailyNutritionTarget.findUnique({ where: { userId } });
  if (existing) {
    await prisma.dailyNutritionTarget.update({ where: { userId }, data: input });
  } else {
    await prisma.dailyNutritionTarget.create({ data: { userId, ...input } });
  }
}

export async function parseNutritionFor(userId: string, description: string): Promise<NutritionEstimate> {
  const parser: NutritionParser = getParser();
  return parser.parse(description);
}

// Saved foods
export async function listSavedFoods(userId: string) {
  return prisma.savedFood.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function createSavedFood(
  userId: string,
  input: { name: string; unit?: string; defaultQty?: number; calories: number; protein: number; carbs: number; fat: number; notes?: string },
): Promise<string> {
  const sf = await prisma.savedFood.create({
    data: {
      userId,
      name: input.name,
      unit: input.unit ?? "g",
      defaultQty: input.defaultQty ?? 100,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      notes: input.notes,
    },
  });
  return sf.id;
}

export async function deleteSavedFood(userId: string, id: string): Promise<void> {
  const sf = await prisma.savedFood.findUnique({ where: { id } });
  if (!sf || sf.userId !== userId) throw new Error("No encontrado");
  await prisma.savedFood.delete({ where: { id } });
}

// Saved meals
export async function listSavedMeals(userId: string) {
  return prisma.savedMeal.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { items: true },
  });
}

export async function createSavedMeal(
  userId: string,
  input: {
    name: string;
    notes?: string;
    items: Array<{ name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }>;
  },
): Promise<string> {
  const sm = await prisma.savedMeal.create({
    data: {
      userId,
      name: input.name,
      notes: input.notes,
      items: { create: input.items },
    },
  });
  return sm.id;
}

export async function deleteSavedMeal(userId: string, id: string): Promise<void> {
  const sm = await prisma.savedMeal.findUnique({ where: { id } });
  if (!sm || sm.userId !== userId) throw new Error("No encontrado");
  await prisma.savedMeal.delete({ where: { id } });
}

export async function logSavedMeal(userId: string, savedMealId: string, mealType: MealType, date: Date): Promise<void> {
  const sm = await prisma.savedMeal.findUnique({
    where: { id: savedMealId },
    include: { items: true },
  });
  if (!sm || sm.userId !== userId) throw new Error("No encontrado");
  for (const it of sm.items) {
    await prisma.foodEntry.create({
      data: {
        userId,
        name: `${sm.name} — ${it.name}`,
        quantity: it.quantity,
        unit: it.unit,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        mealType,
        date,
        valuesAreEstimated: false,
      },
    });
  }
}

export async function logSavedFood(userId: string, savedFoodId: string, mealType: MealType, date: Date): Promise<void> {
  const sf = await prisma.savedFood.findUnique({ where: { id: savedFoodId } });
  if (!sf || sf.userId !== userId) throw new Error("No encontrado");
  await prisma.foodEntry.create({
    data: {
      userId,
      name: sf.name,
      quantity: sf.defaultQty,
      unit: sf.unit,
      calories: sf.calories,
      protein: sf.protein,
      carbs: sf.carbs,
      fat: sf.fat,
      mealType,
      date,
      valuesAreEstimated: false,
    },
  });
}

export type NutritionHistoryPoint = { date: string; calories: number; protein: number };

export async function getNutritionHistory(userId: string, range: Range): Promise<NutritionHistoryPoint[]> {
  const start = rangeStart(range);
  const rows = await prisma.foodEntry.findMany({
    where: { userId, date: { gte: start } },
    select: { date: true, calories: true, protein: true },
  });
  const map = new Map<string, { calories: number; protein: number }>();
  for (const r of rows) {
    const k = startOfDay(r.date).toISOString().slice(0, 10);
    const cur = map.get(k) ?? { calories: 0, protein: 0 };
    cur.calories += r.calories;
    cur.protein += r.protein;
    map.set(k, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, calories: Math.round(v.calories), protein: Math.round(v.protein) }));
}
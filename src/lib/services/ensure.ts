import "server-only";
import { prisma } from "@/lib/db";

export async function ensureUserSettings(userId: string) {
  return prisma.appSetting.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function ensureNutritionTarget(userId: string) {
  return prisma.dailyNutritionTarget.upsert({
    where: { userId },
    create: { userId, calories: 2800, protein: 160, carbs: 350, fat: 80 },
    update: {},
  });
}
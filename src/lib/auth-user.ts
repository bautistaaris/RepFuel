import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { User, AppSetting, DailyNutritionTarget } from "@prisma/client";
import { getSessionUserId } from "@/lib/session";

export type CurrentUser = User & {
  settings: AppSetting | null;
  nutritionTarget: DailyNutritionTarget | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      settings: true,
      nutritionTarget: true,
    },
  }) as Promise<CurrentUser | null>;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireVerifiedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.emailVerifiedAt && process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
    redirect("/verify-email");
  }
  return user;
}
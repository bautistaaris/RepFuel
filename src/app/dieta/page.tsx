import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { listFoodEntries, dailyTotals, getOrCreateTarget } from "@/lib/services/nutrition";
import type { MealType } from "@/lib/types/nutrition";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { DietaContent } from "@/components/nutrition/DietaContent";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function DietaPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  const [entries, totals, target] = await Promise.all([
    listFoodEntries(userId, new Date()),
    dailyTotals(userId, new Date()),
    getOrCreateTarget(userId),
  ]);

  return (
    <AppShell>
      <AppHeader title="Dieta" backHref="/inicio" />
      <DietaContent
        csrf={csrf}
        today={new Date().toISOString()}
        targets={{
          calories: target.calories,
          protein: target.protein,
          carbs: target.carbs,
          fat: target.fat,
        }}
        entries={entries.map((e) => ({
          id: e.id,
          name: e.name,
          quantity: e.quantity,
          unit: e.unit,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          mealType: e.mealType as MealType,
          valuesAreEstimated: e.valuesAreEstimated,
          createdAt: e.createdAt.toISOString(),
        }))}
        totals={totals}
      />
    </AppShell>
  );
}
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getOrCreateTarget } from "@/lib/services/nutrition";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { NutritionTargetForm } from "@/components/nutrition/NutritionTargetForm";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function ObjetivosPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  const target = await getOrCreateTarget(userId);
  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Objetivos nutricionales" backHref="/dieta" />
      <div className="px-margin pb-space-xl">
        <NutritionTargetForm
          csrf={csrf}
          initial={{
            calories: target.calories,
            protein: target.protein,
            carbs: target.carbs,
            fat: target.fat,
          }}
        />
      </div>
    </AppShell>
  );
}
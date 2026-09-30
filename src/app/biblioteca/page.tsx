import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { listExercisesForUser, listMuscleGroupsForUser } from "@/lib/services/exercises";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BibliotecaContent } from "@/components/exercises/BibliotecaContent";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; s?: string; custom?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  const sp = await searchParams;
  const filter = {
    muscleGroup: sp.g,
    search: sp.s,
    customOnly: sp.custom === "1",
  };
  const [exercises, groups] = await Promise.all([
    listExercisesForUser(userId, filter),
    listMuscleGroupsForUser(userId),
  ]);
  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Biblioteca" backHref="/inicio" />
      <BibliotecaContent
        csrf={csrf}
        exercises={exercises.map((e: { id: string; name: string; muscleGroup: string; equipment: string | null; secondaryMuscles: string | null; isCustom: boolean }) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscleGroup,
          equipment: e.equipment,
          secondaryMuscles: e.secondaryMuscles,
          isCustom: e.isCustom,
        }))}
        groups={groups}
        initialFilter={filter}
      />
    </AppShell>
  );
}
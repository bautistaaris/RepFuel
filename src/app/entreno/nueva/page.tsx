import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function NuevaRutinaPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  return (
    <AppShell>
      <AppHeader title="Nueva rutina" backHref="/entreno" />
      <div className="px-margin pb-space-xl">
        <RoutineForm csrf={csrf} />
      </div>
    </AppShell>
  );
}
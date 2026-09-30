import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { listBodyWeights, weightMetrics } from "@/lib/services/bodyWeight";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PesoContent } from "@/components/progress/PesoContent";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function PesoPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  const [entries, metrics] = await Promise.all([listBodyWeights(userId), weightMetrics(userId)]);
  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Peso corporal" backHref="/progreso" />
      <PesoContent
        csrf={csrf}
        entries={entries.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          weightKg: e.weightKg,
          notes: e.notes,
        }))}
        metrics={metrics}
      />
    </AppShell>
  );
}
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import { listWorkouts } from "@/lib/services/workouts";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { getProgressSummary } from "@/lib/services/home";
import { weightMetrics } from "@/lib/services/bodyWeight";
import type { Range } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function ProgresoPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const sp = await searchParams;
  const range: Range = (sp.r && ["7D", "30D", "3M", "6M", "1Y", "ALL"].includes(sp.r) ? sp.r : "30D") as Range;

  const [{ items }, summary, wm] = await Promise.all([
    listWorkouts(userId, 20),
    getProgressSummary(userId, range),
    weightMetrics(userId),
  ]);

  return (
    <AppShell>
      <AppHeader title="Progreso" backHref="/inicio" right={
        <Link href="/progreso/peso" className="h-9 px-3 rounded-lg bg-surface-container-high text-primary-fixed font-label-sm text-label-sm flex items-center gap-1">
          <MaterialSymbol name="scale" className="text-[16px]" />
          <span>Peso</span>
        </Link>
      } />
      <ProgressDashboard
        range={range}
        summary={summary}
        weight={{
          current: wm.current,
          delta7: wm.delta7,
          delta30: wm.delta30,
          movingAvg7: wm.movingAvg7,
        }}
        workouts={items.map((w) => ({
          id: w.id,
          name: w.name,
          date: w.startedAt.toISOString(),
          status: w.status,
        }))}
      />
    </AppShell>
  );
}
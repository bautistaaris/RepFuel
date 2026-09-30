import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import { listRoutines } from "@/lib/services/routines";
import { getActiveWorkout } from "@/lib/services/workouts";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { formatRelative } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function EntrenoPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const [routines, active] = await Promise.all([
    listRoutines(userId),
    getActiveWorkout(userId),
  ]);

  return (
    <AppShell>
      <AppHeader
        title="Entreno"
        backHref="/inicio"
        right={
          <Link
            href="/entreno/nueva"
            className="h-9 px-3 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm flex items-center gap-1"
          >
            <MaterialSymbol name="add" className="text-[16px]" />
            <span>Nueva</span>
          </Link>
        }
      />
      <div className="flex flex-col gap-space-md px-margin pb-space-xl">
        {active && (
          <Link
            href="/entreno/active"
            className="rounded-xl bg-primary-fixed text-on-primary-fixed p-space-md shadow-[0_0_24px_rgba(202,243,0,0.25)] flex items-center justify-between active:scale-[0.98]"
          >
            <div className="flex flex-col">
              <span className="font-caption text-caption uppercase tracking-wider opacity-80">Sesión en curso</span>
              <span className="font-headline-sm text-headline-sm">{active.name}</span>
            </div>
            <MaterialSymbol name="play_arrow" className="text-[24px]" />
          </Link>
        )}

        {routines.length === 0 && (
          <Card className="flex flex-col items-center text-center gap-space-sm">
            <MaterialSymbol name="fitness_center" className="text-[40px] text-on-surface-variant" />
            <h3 className="font-headline-sm text-headline-sm">Sin rutinas todavía</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Creá tu primera rutina para empezar.
            </p>
            <Link
              href="/entreno/nueva"
              className="h-11 px-4 rounded-lg bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center gap-2"
            >
              <MaterialSymbol name="add" />
              <span>Crear rutina</span>
            </Link>
          </Card>
        )}

        {routines.map((r) => (
          <Link key={r.id} href={`/entreno/${r.id}`} className="block">
            <Card className="flex items-center gap-space-md active:scale-[0.99] transition-transform">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-fixed">
                <MaterialSymbol name="fitness_center" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">{r.name}</h3>
                <p className="font-caption text-caption text-on-surface-variant">
                  {r.exerciseCount} ejercicios · {r.lastUsedAt ? `Usada ${formatRelative(r.lastUsedAt)}` : "Sin usar"}
                </p>
              </div>
              <MaterialSymbol name="chevron_right" className="text-on-surface-variant" />
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
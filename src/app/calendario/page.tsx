import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import Link from "next/link";
import { isSameDay, startOfDay } from "@/lib/utils/dates";
import { CalendarDayCell } from "@/components/calendar/CalendarDayCell";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const sp = await searchParams;
  const now = new Date();
  const year = sp.y ? parseInt(sp.y, 10) : now.getFullYear();
  const month = sp.m ? parseInt(sp.m, 10) - 1 : now.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const [workouts, foodEntries, weights] = await Promise.all([
    prisma.workout.findMany({
      where: { userId, startedAt: { gte: monthStart, lt: monthEnd } },
      select: { startedAt: true, status: true },
    }),
    prisma.foodEntry.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      select: { date: true, calories: true },
    }),
    prisma.bodyWeightEntry.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      select: { date: true },
    }),
  ]);

  const dayMap = new Map<string, { workout: boolean; calories: number; weight: boolean }>();
  const ensure = (d: Date) => {
    const k = startOfDay(d).toISOString();
    if (!dayMap.has(k)) dayMap.set(k, { workout: false, calories: 0, weight: false });
    return dayMap.get(k)!;
  };

  for (const w of workouts) {
    const e = ensure(w.startedAt);
    if (w.status === "COMPLETED") e.workout = true;
  }
  for (const f of foodEntries) {
    const e = ensure(f.date);
    e.calories += f.calories;
  }
  for (const b of weights) {
    const e = ensure(b.date);
    e.weight = true;
  }

  const monthName = firstOfMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const cells: Array<{ date: Date | null; key: string; info: { workout: boolean; calories: number; weight: boolean } | null; isToday: boolean }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `empty-${i}`, info: null, isToday: false });
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    const date = new Date(year, month, d);
    const info = dayMap.get(startOfDay(date).toISOString()) ?? null;
    cells.push({ date, key: `d-${d}`, info, isToday: isSameDay(date, now) });
  }

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);

  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Calendario" backHref="/inicio" />
      <div className="px-margin pb-space-xl">
        <div className="flex items-center justify-between py-3">
          <Link href={`/calendario?y=${prev.getFullYear()}&m=${prev.getMonth() + 1}`} className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container text-on-surface">
            <MaterialSymbol name="chevron_left" />
          </Link>
          <h2 className="font-headline-sm text-headline-sm capitalize">{monthName}</h2>
          <Link href={`/calendario?y=${next.getFullYear()}&m=${next.getMonth() + 1}`} className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container text-on-surface">
            <MaterialSymbol name="chevron_right" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d} className="text-center font-caption text-caption text-on-surface-variant uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => (
            <CalendarDayCell
              key={c.key}
              date={c.date ? c.date.toISOString() : null}
              day={c.date ? c.date.getDate() : 0}
              info={c.info}
              isToday={c.isToday}
            />
          ))}
        </div>

        <Card className="mt-space-md flex flex-row gap-space-md items-center">
          <LegendDot tone="primary" />
          <span className="font-caption text-caption text-on-surface-variant">Entrenamiento</span>
          <LegendDot tone="secondary" className="ml-3" />
          <span className="font-caption text-caption text-on-surface-variant">Comida</span>
          <LegendDot tone="tertiary" className="ml-3" />
          <span className="font-caption text-caption text-on-surface-variant">Peso</span>
        </Card>
      </div>
    </AppShell>
  );
}

function LegendDot({ tone, className }: { tone: "primary" | "secondary" | "tertiary"; className?: string }) {
  const color = tone === "primary" ? "bg-primary-fixed" : tone === "secondary" ? "bg-secondary" : "bg-tertiary-fixed-dim";
  return <span className={"w-2 h-2 rounded-full inline-block " + color + " " + (className ?? "")} />;
}
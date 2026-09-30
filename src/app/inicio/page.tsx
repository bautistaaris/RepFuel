import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import { getHomeData } from "@/lib/services/home";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { formatGrams, formatRelative } from "@/lib/utils/format";
import { formatDateLong } from "@/lib/utils/dates";
import { startWorkoutAction } from "@/actions/workouts";
import { readCsrfCookie } from "@/lib/session";
import crypto from "crypto";

async function getSessionCsrf(): Promise<string> {
  const existing = await readCsrfCookie();
  if (existing) return existing;
  return crypto.randomBytes(24).toString("base64url");
}

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const data = await getHomeData(userId);
  const csrf = await getSessionCsrf();

  const calPct = Math.min(100, (data.nutrition.calories / data.nutrition.targets.calories) * 100);
  const proteinPct = Math.min(100, (data.nutrition.protein / data.nutrition.targets.protein) * 100);
  const carbsPct = Math.min(100, (data.nutrition.carbs / data.nutrition.targets.carbs) * 100);
  const fatPct = Math.min(100, (data.nutrition.fat / data.nutrition.targets.fat) * 100);

  return (
    <AppShell>
      <AppHeader
        title="Inicio"
        right={
          <>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed">Inicio</span>
            <Avatar />
          </>
        }
      />
      <div className="flex flex-col w-full gap-space-lg pb-space-xl">
        {/* Greeting */}
        <section className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <h1 className="font-headline-md text-headline-md text-on-surface">
                Buenas, {data.userName}
              </h1>
              <span aria-label="Energía" className="inline-flex items-center justify-center text-lg animate-pulse">⚡</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high shadow-sm">
              <span className="text-sm leading-none">🔥</span>
              <span className="font-label-sm text-label-sm text-primary-fixed tracking-wide">
                {data.streakDays} días racha
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MaterialSymbol name="calendar_today" className="text-[16px] text-on-surface-variant" />
            <p className="font-caption text-caption uppercase tracking-wider text-on-surface-variant">
              {formatDateLong(data.today)}
            </p>
          </div>
        </section>

        {/* Workout card */}
        <Card className="relative overflow-hidden shadow-xl gap-space-md">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary-fixed/10 blur-2xl pointer-events-none" />
          {data.scheduledRoutine ? (
            <>
              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary-fixed shadow-[0_0_8px_rgba(202,243,0,0.8)]" />
                    <span className="font-caption text-caption uppercase tracking-wider text-primary-fixed">
                      {data.activeWorkoutId ? "Continuar entrenamiento" : "Sesión Programada"}
                    </span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    {data.scheduledRoutine.name}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-fixed">
                  <MaterialSymbol name="fitness_center" className="text-[22px]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-surface-container-low text-center relative z-10">
                <MetricMini label="Ejercicios" value={String(data.scheduledRoutine.exerciseCount)} />
                <MetricMini label="Minutos" value="~55" />
                <MetricMini label="Último logro" value="—" tone="primary" />
              </div>

              <div className="flex flex-col gap-1.5 relative z-10">
                <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                  Secuencia de hoy
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.scheduledRoutine.exerciseNames.map((n) => (
                    <span key={n} className="px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-caption text-caption">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {data.activeWorkoutId ? (
                <Link
                  href="/entreno/active"
                  className="w-full h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(202,243,0,0.25)] active:scale-[0.98]"
                >
                  <MaterialSymbol name="play_arrow" className="text-[22px]" />
                  <span>Continuar entrenamiento</span>
                  <MaterialSymbol name="arrow_forward" className="text-[20px]" />
                </Link>
              ) : (
                <form action={startWorkoutAction.bind(null, data.scheduledRoutine.id, csrf)}>
                  <input type="hidden" name="routineId" value={data.scheduledRoutine.id} />
                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(202,243,0,0.25)] active:scale-[0.98]"
                  >
                    <MaterialSymbol name="bolt" className="text-[22px]" />
                    <span>Empezar entrenamiento</span>
                    <MaterialSymbol name="arrow_forward" className="text-[20px]" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-space-sm relative z-10">
              <div className="flex items-center gap-2">
                <MaterialSymbol name="fitness_center" className="text-[20px] text-primary-fixed" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Sin rutina asignada</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Creá tu primera rutina para empezar a registrar entrenamientos.
              </p>
              <Link
                href="/entreno"
                className="w-full h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2"
              >
                Crear rutina
              </Link>
            </div>
          )}
        </Card>

        {/* Nutrition */}
        <Card className="gap-space-md shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MaterialSymbol name="restaurant" className="text-[20px] text-primary-fixed" />
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Nutrición de hoy</h3>
            </div>
            <Link
              href="/dieta"
              className="h-9 px-3 rounded-lg bg-surface-container-high text-primary-fixed font-label-sm text-label-sm flex items-center gap-1 active:bg-surface-bright"
            >
              <MaterialSymbol name="add" className="text-[16px]" />
              <span>Registrar</span>
            </Link>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                  Calorías consumidas
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-headline-lg text-headline-lg text-on-surface">
                    {Math.round(data.nutrition.calories).toLocaleString("es-AR")}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    / {Math.round(data.nutrition.targets.calories)} kcal
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="font-label-numeric text-label-numeric text-primary-fixed font-bold">
                  {Math.max(0, Math.round(data.nutrition.targets.calories - data.nutrition.calories))}
                </span>
                <span className="font-caption text-caption text-on-surface-variant">kcal restantes</span>
              </div>
            </div>
            <ProgressBar value={calPct} tone="primary" glow />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MacroCell label="Proteína" pct={proteinPct} tone="secondary" value={formatGrams(data.nutrition.protein)} target={`/ ${formatGrams(data.nutrition.targets.protein)}`} />
            <MacroCell label="Carbos" pct={carbsPct} tone="primary" value={formatGrams(data.nutrition.carbs)} target={`/ ${formatGrams(data.nutrition.targets.carbs)}`} />
            <MacroCell label="Grasas" pct={fatPct} tone="error" value={formatGrams(data.nutrition.fat)} target={`/ ${formatGrams(data.nutrition.targets.fat)}`} />
          </div>

          {data.nutrition.meals.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                Tomas del día
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {data.nutrition.meals.map((m) => (
                  <div key={m.mealType} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high flex-shrink-0">
                    <span className="font-body-md text-body-md text-on-surface">{m.label}</span>
                    <span className="font-caption text-caption text-on-surface-variant">{m.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Metrics */}
        <section className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Métricas de la semana</h3>
            <Link href="/progreso" className="font-caption text-caption text-primary-fixed uppercase tracking-wider">
              Detalles
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            <Card level="base" className="justify-between gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Peso actual</span>
                <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                  <MaterialSymbol name="scale" className="text-[16px]" />
                </div>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-on-surface">
                  {data.metrics.weightKg !== null ? data.metrics.weightKg.toFixed(1) : "—"}
                  <span className="font-body-md text-body-md text-on-surface-variant font-normal"> kg</span>
                </div>
                {data.metrics.weightDelta7 !== null && (
                  <div className="inline-flex items-center gap-1 mt-1 text-secondary font-label-sm text-label-sm">
                    <MaterialSymbol
                      name={data.metrics.weightDelta7 < 0 ? "arrow_downward" : "arrow_upward"}
                      className="text-[14px]"
                    />
                    <span>
                      {Math.abs(data.metrics.weightDelta7).toFixed(1)} kg esta sem
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card level="base" className="justify-between gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Frecuencia</span>
                <span className="font-label-sm text-label-sm text-primary-fixed">
                  Objetivo {data.metrics.weeklyGoal}
                </span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-on-surface">
                  {data.metrics.sessionsThisWeek}
                  <span className="font-body-md text-body-md text-on-surface-variant font-normal">
                    {" "}/ {data.metrics.weeklyGoal} días
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {data.metrics.weekDays.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="font-caption text-caption text-on-surface-variant text-[10px]">{d.day}</span>
                      <span
                        className={
                          "w-full h-1.5 rounded-full " +
                          (d.done
                            ? "bg-primary-fixed shadow-[0_0_4px_rgba(202,243,0,0.5)]"
                            : "bg-surface-container-highest")
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card level="base" className="col-span-2 flex items-center justify-between shadow-sm">
              <div className="flex flex-col gap-1">
                <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                  Volumen Semanal Acumulado
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {Math.round(data.metrics.weeklyVolume).toLocaleString("es-AR")}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant">kg levantados</span>
                </div>
              </div>
              {data.metrics.weeklyVolumeDelta !== null && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-high text-primary-fixed font-label-sm text-label-sm">
                  <MaterialSymbol name="trending_up" className="text-[16px]" />
                  <span>
                    {data.metrics.weeklyVolumeDelta >= 0 ? "+" : ""}
                    {data.metrics.weeklyVolumeDelta.toFixed(0)}% vs prev
                  </span>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Recent activity */}
        {data.recent.length > 0 && (
          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Actividad reciente</h3>
              <MaterialSymbol name="history" className="text-[20px] text-on-surface-variant" />
            </div>
            <div className="flex flex-col gap-2">
              {data.recent.map((item, i) => {
                const cfg = activityConfig(item.type);
                return (
                  <Card key={i} level="base" className="flex flex-row items-center gap-3">
                    <div className={cn(cfg.iconWrap, "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0")}>
                      <MaterialSymbol name={cfg.icon} className="text-[20px]" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface truncate">{item.title}</span>
                        <span className="font-caption text-caption text-on-surface-variant flex-shrink-0">
                          {formatRelative(item.at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.type === "PR" ? (
                          <>
                            <span className="font-body-md text-body-md text-on-surface font-semibold">{item.detail}</span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] font-bold text-primary-fixed">
                              PR 🏆
                            </span>
                          </>
                        ) : (
                          <p className="font-body-md text-body-md text-on-surface-variant truncate mt-0.5">{item.detail}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function MetricMini({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" }) {
  return (
    <div className="flex flex-col items-center">
      <span className={"font-label-numeric text-label-numeric " + (tone === "primary" ? "text-primary-fixed" : "text-on-surface")}>
        {value}
      </span>
      <span className="font-caption text-caption text-on-surface-variant">{label}</span>
    </div>
  );
}

function MacroCell({
  label,
  pct,
  tone,
  value,
  target,
}: {
  label: string;
  pct: number;
  tone: "primary" | "secondary" | "error";
  value: string;
  target: string;
}) {
  const colorClass = tone === "secondary" ? "text-secondary" : tone === "primary" ? "text-primary-fixed" : "text-tertiary-fixed-dim";
  const barClass = tone === "secondary" ? "bg-secondary" : tone === "primary" ? "bg-primary-fixed" : "bg-error";
  return (
    <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="font-label-sm text-label-sm text-on-surface">{label}</span>
        <span className={"font-caption text-caption " + colorClass}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
        <div className={"h-full rounded-full " + barClass} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-caption text-caption text-on-surface-variant font-medium">{value} {target}</span>
    </div>
  );
}

function Avatar() {
  return (
    <div className="w-11 h-11 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-primary-fixed/30 ring-2 ring-primary-fixed/20 flex items-center justify-center">
        <MaterialSymbol name="person" className="text-[18px] text-on-surface" />
      </div>
    </div>
  );
}

function activityConfig(t: "PR" | "MEAL" | "WEIGHT") {
  if (t === "PR") return { icon: "trophy", iconWrap: "bg-primary-fixed/10 text-primary-fixed" };
  if (t === "MEAL") return { icon: "nutrition", iconWrap: "bg-surface-container-high text-secondary" };
  return { icon: "monitor_weight", iconWrap: "bg-surface-container-high text-on-surface-variant" };
}
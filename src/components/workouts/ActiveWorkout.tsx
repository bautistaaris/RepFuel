"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NumericInput } from "@/components/ui/Input";
import { IconBtn } from "@/components/ui/IconBtn";
import {
  toggleSetAction,
  updateSetAction,
  addSetAction,
  removeSetAction,
  startRestAction,
  skipRestAction,
  addRestSecondsAction,
  completeWorkoutAction,
  abandonWorkoutAction,
} from "@/actions/workouts";
import { withCsrf } from "@/lib/csrf-client";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type ExerciseData = {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  position: number;
  restDefault: number;
  previous: Array<{ weight: number | null; reps: number | null }>;
  sets: Array<{
    id: string;
    setNumber: number;
    weight: number | null;
    reps: number | null;
    completed: boolean;
    restStartedAt: string | null;
    restDuration: number | null;
    isPersonalRecord: boolean;
    prType: string | null;
    initialWeight: number | null;
    initialReps: number | null;
  }>;
};

type Props = {
  csrf: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  exercises: ExerciseData[];
};

export function ActiveWorkout(props: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [exercises, setExercises] = useState(props.exercises);
  const [volume, setVolume] = useState(props.totalVolume);
  const [completed, setCompleted] = useState(props.completedSets);
  const [now, setNow] = useState(Date.now());
  const [activeRest, setActiveRest] = useState<{
    setId: string;
    startedAt: number;
    duration: number;
    minimized: boolean;
  } | null>(null);
  const [showFinish, setShowFinish] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const workoutSeconds = Math.floor((now - new Date(props.startedAt).getTime()) / 1000);

  useEffect(() => {
    if (!activeRest) return;
    const remaining = activeRest.duration - Math.floor((now - activeRest.startedAt) / 1000);
    if (remaining <= 0 && activeRest.startedAt + activeRest.duration * 1000 <= now) {
      setActiveRest(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [now, activeRest]);

  function updateLocalSet(workoutExerciseId: string, setId: string, patch: Partial<ExerciseData["sets"][number]>) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === workoutExerciseId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : ex,
      ),
    );
  }

  function recomputeLocalStats() {
    let v = 0;
    let c = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.completed) {
          c += 1;
          v += (s.weight ?? 0) * (s.reps ?? 0);
        }
      }
    }
    setVolume(v);
    setCompleted(c);
  }

  async function onToggle(workoutExerciseId: string, setId: string, completed: boolean, restDefault: number, _weight: number | null, _reps: number | null) {
    const prevCompleted = exercises.find((e) => e.id === workoutExerciseId)?.sets.find((s) => s.id === setId)?.completed;
    updateLocalSet(workoutExerciseId, setId, {
      completed,
    });
    recomputeLocalStats();

    if (completed && !prevCompleted) {
      setActiveRest({ setId, startedAt: Date.now(), duration: restDefault, minimized: false });
      startTransition(async () => {
        await Promise.all([
          toggleSetAction(withCsrf({ setId, completed: true }, props.csrf)),
          startRestAction(withCsrf({ setId, durationSec: restDefault }, props.csrf)),
        ]);
        router.refresh();
      });
    } else if (!completed && prevCompleted) {
      setActiveRest((cur) => (cur?.setId === setId ? null : cur));
      startTransition(async () => {
        await Promise.all([
          toggleSetAction(withCsrf({ setId, completed: false }, props.csrf)),
          skipRestAction(setId),
        ]);
        router.refresh();
      });
    } else {
      startTransition(async () => {
        await toggleSetAction(withCsrf({ setId, completed }, props.csrf));
        router.refresh();
      });
    }
  }

  async function onInputChange(workoutExerciseId: string, setId: string, field: "weight" | "reps", value: number | null) {
    updateLocalSet(workoutExerciseId, setId, { [field]: value });
    recomputeLocalStats();
    startTransition(async () => {
      await updateSetAction(withCsrf({ setId, [field]: value }, props.csrf));
    });
  }

  async function onAddSet(workoutExerciseId: string) {
    startTransition(async () => {
      await addSetAction(workoutExerciseId);
      router.refresh();
    });
  }

  async function onRemoveSet(workoutExerciseId: string, setId: string) {
    if (!confirm("¿Eliminar este set?")) return;
    startTransition(async () => {
      await removeSetAction(setId);
      router.refresh();
    });
  }

  async function onSkipRest() {
    if (!activeRest) return;
    const setId = activeRest.setId;
    setActiveRest(null);
    startTransition(async () => {
      await skipRestAction(setId);
    });
  }

  async function onAddRest() {
    if (!activeRest) return;
    const setId = activeRest.setId;
    setActiveRest((cur) => (cur ? { ...cur, duration: cur.duration + 30 } : cur));
    startTransition(async () => {
      await addRestSecondsAction(withCsrf({ setId, seconds: 30 }, props.csrf));
    });
  }

  function onFinish() {
    startTransition(async () => {
      await completeWorkoutAction(props.workoutId);
      router.refresh();
    });
  }

  function onAbandon() {
    if (!confirm("¿Abandonar el entrenamiento actual?")) return;
    startTransition(async () => {
      await abandonWorkoutAction(props.workoutId);
      router.refresh();
    });
  }

  const restRemaining = useMemo(() => {
    if (!activeRest) return 0;
    return Math.max(0, activeRest.duration - Math.floor((Date.now() - activeRest.startedAt) / 1000));
  }, [activeRest, now]);

  return (
    <>
      <div className="flex flex-col gap-space-md pb-40">
        {/* Top Session Header */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded-full text-caption font-caption text-on-surface-variant uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary-fixed animate-ping" />
              <span className="w-1.5 h-1.5 -ml-2.5 rounded-full bg-primary-fixed" />
              En directo
            </span>
            <div className="flex items-center gap-1.5 bg-surface-container px-space-sm py-1 rounded-full text-secondary font-label-numeric text-label-sm">
              <MaterialSymbol name="timer" className="text-[16px] text-secondary" />
              <span>{formatDuration(workoutSeconds)}</span>
            </div>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight mt-1">
            {props.workoutName}
          </h2>
          <div className="flex items-center gap-space-sm text-body-md font-body-md text-on-surface-variant">
            <span className="flex items-center gap-1">
              <MaterialSymbol name="fitness_center" className="text-[16px] text-primary-fixed" />
              <span className="font-label-numeric text-on-surface font-semibold">{Math.round(volume).toLocaleString("es-AR")} kg</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MaterialSymbol name="repeat" className="text-[16px] text-secondary" />
              <span className="font-label-numeric text-on-surface font-semibold">
                {completed}/{props.totalSets} series
              </span>
            </span>
          </div>
        </div>

        {activeRest && !activeRest.minimized && (
          <div className="bg-surface-container-highest/95 backdrop-blur-md p-space-md rounded-xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-11 h-11 transform -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" fill="transparent" r="18" stroke="currentColor" strokeWidth="3" className="text-surface-container" />
                  <circle
                    cx="22"
                    cy="22"
                    fill="transparent"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="text-primary-fixed transition-all duration-1000"
                    strokeDasharray="113.1"
                    strokeDashoffset={113.1 - (restRemaining / activeRest.duration) * 113.1}
                  />
                </svg>
                <MaterialSymbol name="hourglass_top" className="absolute text-[20px] text-primary-fixed" />
              </div>
              <div className="flex flex-col">
                <span className="text-caption font-caption text-on-surface-variant uppercase tracking-wider">Descanso Activo</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-black tracking-tight tabular-nums">
                  {formatDuration(restRemaining)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={onAddRest}
                className="h-10 px-3 bg-surface-container hover:bg-surface-bright active:scale-95 transition-transform rounded-lg flex items-center gap-1 text-on-surface font-label-sm text-label-sm"
              >
                <MaterialSymbol name="add" className="text-[16px]" />
                30s
              </button>
              <button
                onClick={onSkipRest}
                className="h-10 px-3 bg-surface-container-high hover:bg-surface-bright active:scale-95 transition-transform rounded-lg text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm"
              >
                Saltar
              </button>
              <button
                onClick={() => setActiveRest((cur) => (cur ? { ...cur, minimized: true } : cur))}
                className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center"
                aria-label="Minimizar"
              >
                <MaterialSymbol name="expand_more" className="text-[20px]" />
              </button>
            </div>
          </div>
        )}

        {activeRest && activeRest.minimized && (
          <button
            onClick={() => setActiveRest((cur) => (cur ? { ...cur, minimized: false } : cur))}
            className="fixed top-20 right-3 z-30 bg-primary-fixed text-on-primary-fixed px-3 py-2 rounded-full flex items-center gap-2 shadow-xl"
          >
            <MaterialSymbol name="hourglass_top" className="text-[18px]" />
            <span className="font-label-numeric text-label-sm tabular-nums">{formatDuration(restRemaining)}</span>
          </button>
        )}

        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onToggle={onToggle}
            onInput={onInputChange}
            onAddSet={onAddSet}
            onRemoveSet={onRemoveSet}
            activeRestSetId={activeRest?.setId ?? null}
          />
        ))}

        <button
          onClick={onAbandon}
          className="h-10 px-3 rounded-lg bg-transparent text-on-surface-variant hover:text-error font-label-sm text-label-sm self-center"
        >
          Abandonar sesión
        </button>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl px-margin pt-3 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-2 max-w-lg mx-auto w-full pb-2">
          <div className="grid grid-cols-12 gap-2">
            <button className="col-span-4 h-12 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center gap-1 text-label-sm font-label-sm active:scale-[0.98] transition-transform">
              <MaterialSymbol name="library_add" className="text-[20px]" />
              <span>Ejercicio</span>
            </button>
            <button
              onClick={() => setShowFinish(true)}
              className="col-span-8 h-12 rounded-lg bg-primary-fixed hover:bg-surface-tint text-on-primary-fixed flex items-center justify-center gap-2 text-headline-sm font-bold shadow-[0_0_20px_rgba(202,243,0,0.2)] active:scale-[0.98] transition-transform"
            >
              <MaterialSymbol name="flag_circle" className="text-[22px]" />
              <span>Finalizar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {showFinish && (
        <FinishModal
          workoutName={props.workoutName}
          durationSec={workoutSeconds}
          completedSets={completed}
          totalSets={props.totalSets}
          totalVolume={volume}
          onCancel={() => setShowFinish(false)}
          onConfirm={() => {
            setShowFinish(false);
            onFinish();
          }}
        />
      )}
    </>
  );
}

function ExerciseCard({
  exercise,
  onToggle,
  onInput,
  onAddSet,
  onRemoveSet,
  activeRestSetId,
}: {
  exercise: ExerciseData;
  onToggle: (workoutExerciseId: string, setId: string, completed: boolean, restDefault: number, weight: number | null, reps: number | null) => void;
  onInput: (workoutExerciseId: string, setId: string, field: "weight" | "reps", value: number | null) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onRemoveSet: (workoutExerciseId: string, setId: string) => void;
  activeRestSetId: string | null;
}) {
  void onRemoveSet;
  void activeRestSetId;
  const [open, setOpen] = useState(true);

  return (
    <Card level="low" className="gap-space-md shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-1">
            <Badge tone={exercise.muscleGroup === "Pecho" ? "primary" : exercise.muscleGroup === "Hombro" ? "secondary" : "tertiary"}>
              {exercise.muscleGroup}
            </Badge>
            {exercise.equipment && (
              <span className="font-caption text-caption text-on-surface-variant">{exercise.equipment}</span>
            )}
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">{exercise.name}</h3>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant active:scale-95 transition-transform"
          aria-label={open ? "Cerrar" : "Expandir"}
        >
          <MaterialSymbol name={open ? "expand_less" : "expand_more"} className="text-[20px]" />
        </button>
      </div>

      {exercise.previous.length > 0 && (
        <div className="flex items-center gap-1.5 bg-surface-container px-space-sm py-1.5 rounded-lg text-caption font-caption text-on-surface-variant">
          <MaterialSymbol name="history" className="text-[15px] text-secondary" />
          <span>
            Récord sesión previa:{" "}
            <strong className="text-on-surface font-label-numeric text-caption">
              {exercise.previous
                .map((p) => (p.weight !== null && p.reps !== null ? `${p.weight}k × ${p.reps}` : "—"))
                .join(" · ")}
            </strong>
          </span>
        </div>
      )}

      {open && (
        <>
          <div className="grid grid-cols-12 gap-1.5 text-caption font-caption uppercase tracking-wider text-on-surface-variant pb-2 px-1 text-center font-bold">
            <div className="col-span-2 text-left">Serie</div>
            <div className="col-span-3 text-left">Anterior</div>
            <div className="col-span-3">KG</div>
            <div className="col-span-2">Reps</div>
            <div className="col-span-2 text-right">Listo</div>
          </div>

          <div className="flex flex-col gap-space-xs">
            {exercise.sets.map((s, idx) => {
              const isFocused = idx === exercise.sets.findIndex((x) => !x.completed);
              const prev = exercise.previous[s.setNumber - 1];
              const prevText =
                prev && prev.weight !== null && prev.reps !== null ? `${prev.weight}k × ${prev.reps}` : "-";

              return (
                <div
                  key={s.id}
                  className={cn(
                    "grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-lg transition-colors",
                    s.completed
                      ? "bg-surface-container/60"
                      : isFocused
                        ? "bg-surface-container-high"
                        : "bg-surface-container/30 opacity-75",
                  )}
                >
                  <div className="col-span-2 flex items-center gap-1">
                    <span
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-caption font-label-numeric font-bold",
                        s.completed
                          ? "bg-primary-fixed text-on-primary-fixed"
                          : isFocused
                            ? "bg-primary-fixed text-on-primary-fixed font-extrabold"
                            : "bg-surface-container text-on-surface-variant",
                      )}
                    >
                      {s.setNumber}
                    </span>
                  </div>
                  <div className="col-span-3 text-left font-caption text-caption text-on-surface-variant">
                    {prevText}
                  </div>
                  <div className="col-span-3">
                    <NumericInput
                      step={0.5}
                      min={0}
                      max={500}
                      value={s.weight ?? s.initialWeight ?? ""}
                      placeholder={s.initialWeight !== null ? String(s.initialWeight) : "0"}
                      onChange={(e) => {
                        const v = e.target.value;
                        onInput(exercise.id, s.id, "weight", v === "" ? null : parseFloat(v));
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <NumericInput
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={s.reps ?? s.initialReps ?? ""}
                      placeholder={s.initialReps !== null ? String(s.initialReps) : "0"}
                      onChange={(e) => {
                        const v = e.target.value;
                        onInput(exercise.id, s.id, "reps", v === "" ? null : parseInt(v, 10));
                      }}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end gap-1">
                    <button
                      onClick={() => onToggle(exercise.id, s.id, !s.completed, exercise.restDefault, s.weight, s.reps)}
                      className={cn(
                        "w-11 h-11 rounded-lg flex items-center justify-center active:scale-90 transition-transform",
                        s.completed
                          ? "bg-primary-fixed text-on-primary-fixed shadow-sm"
                          : "bg-surface-container-highest text-on-surface hover:text-primary-fixed",
                      )}
                      aria-label={s.completed ? "Desmarcar" : "Completar"}
                    >
                      <MaterialSymbol name="check" className="text-[24px] font-bold" fill={s.completed} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-space-md">
            <button
              onClick={() => onAddSet(exercise.id)}
              className="flex items-center gap-1.5 h-10 px-3 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm active:scale-95 transition-transform"
            >
              <MaterialSymbol name="add" className="text-[18px] text-primary-fixed" />
              Añadir Serie
            </button>
            <div className="flex items-center gap-space-xs">
              <IconBtn title="Histórico">
                <MaterialSymbol name="show_chart" className="text-[20px]" />
              </IconBtn>
              <IconBtn title="Nota">
                <MaterialSymbol name="sticky_note_2" className="text-[20px]" />
              </IconBtn>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function FinishModal({
  workoutName,
  durationSec,
  completedSets,
  totalSets,
  totalVolume,
  onCancel,
  onConfirm,
}: {
  workoutName: string;
  durationSec: number;
  completedSets: number;
  totalSets: number;
  totalVolume: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={onCancel}>
      <div
        className="w-full bg-surface rounded-t-2xl p-space-md pb-safe flex flex-col gap-space-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md">Resumen</h2>
          <button onClick={onCancel} className="w-9 h-9 flex items-center justify-center">
            <MaterialSymbol name="close" />
          </button>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">{workoutName}</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Duración" value={formatDuration(durationSec)} />
          <Stat label="Series" value={`${completedSets}/${totalSets}`} />
          <Stat label="Volumen" value={`${Math.round(totalVolume).toLocaleString("es-AR")} kg`} />
          <Stat label="Ejercicios" value={`${totalSets > 0 ? "✓" : ""}`} />
        </div>
        <button
          onClick={onConfirm}
          className="h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2"
        >
          <MaterialSymbol name="check" />
          Finalizar y guardar
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card level="low" className="flex flex-col gap-1">
      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{value}</span>
    </Card>
  );
}
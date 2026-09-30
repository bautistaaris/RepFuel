import "server-only";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export const BACKUP_VERSION = 1;

export type BackupPayload = {
  version: number;
  exportedAt: string;
  data: {
    user: unknown;
    routines: unknown[];
    exercises: unknown[];
    workouts: unknown[];
    foodEntries: unknown[];
    savedFoods: unknown[];
    savedMeals: unknown[];
    bodyWeights: unknown[];
    dailyNutritionTarget: unknown | null;
    appSetting: unknown | null;
  };
};

export async function exportBackup(userId: string): Promise<BackupPayload> {
  const [
    user,
    routines,
    exercises,
    workouts,
    foodEntries,
    savedFoods,
    savedMeals,
    bodyWeights,
    dailyNutritionTarget,
    appSetting,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    }),
    prisma.routine.findMany({ where: { userId }, include: { exercises: true } }),
    prisma.exercise.findMany({
      where: { routineExercises: { some: { routine: { userId } } } },
    }),
    prisma.workout.findMany({
      where: { userId },
      include: { exercises: { include: { sets: true } } },
    }),
    prisma.foodEntry.findMany({ where: { userId } }),
    prisma.savedFood.findMany({ where: { userId } }),
    prisma.savedMeal.findMany({ where: { userId }, include: { items: true } }),
    prisma.bodyWeightEntry.findMany({ where: { userId } }),
    prisma.dailyNutritionTarget.findUnique({ where: { userId } }),
    prisma.appSetting.findUnique({ where: { userId } }),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      user,
      routines,
      exercises,
      workouts,
      foodEntries,
      savedFoods,
      savedMeals,
      bodyWeights,
      dailyNutritionTarget,
      appSetting,
    },
  };
}

export type ImportResult = {
  ok: boolean;
  error?: string;
  imported?: {
    routines: number;
    exercises: number;
    workouts: number;
    foodEntries: number;
    savedFoods: number;
    savedMeals: number;
    bodyWeights: number;
  };
};

export async function importBackup(userId: string, payload: unknown): Promise<ImportResult> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Archivo inválido" };
  }
  const p = payload as Partial<BackupPayload>;
  if (typeof p.version !== "number" || p.version > BACKUP_VERSION) {
    return { ok: false, error: `Versión no soportada (${p.version}). Máxima soportada: ${BACKUP_VERSION}.` };
  }
  if (!p.data) {
    return { ok: false, error: "Estructura inválida" };
  }
  const d = p.data;

  await createPreImportBackup(userId);

  const counts: { routines: number; exercises: number; workouts: number; foodEntries: number; savedFoods: number; savedMeals: number; bodyWeights: number } = { routines: 0, exercises: 0, workouts: 0, foodEntries: 0, savedFoods: 0, savedMeals: 0, bodyWeights: 0 };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.workoutSet.deleteMany({ where: { workoutExercise: { workout: { userId } } } });
      await tx.workoutExercise.deleteMany({ where: { workout: { userId } } });
      await tx.workout.deleteMany({ where: { userId } });
      await tx.routineExercise.deleteMany({ where: { routine: { userId } } });
      await tx.routine.deleteMany({ where: { userId } });
      await tx.foodEntry.deleteMany({ where: { userId } });
      await tx.savedMealItem.deleteMany({ where: { savedMeal: { userId } } });
      await tx.savedMeal.deleteMany({ where: { userId } });
      await tx.savedFood.deleteMany({ where: { userId } });
      await tx.bodyWeightEntry.deleteMany({ where: { userId } });
      await tx.exercise.deleteMany({ where: { isCustom: true, routineExercises: { none: {} } } });

      const routineIdMap = new Map<string, string>();
      for (const r of d.routines ?? []) {
        const oldId = (r as { id: string }).id;
        const created = await tx.routine.create({
          data: {
            userId,
            name: (r as { name: string }).name,
            description: (r as { description: string | null }).description ?? null,
            order: (r as { order: number }).order ?? 0,
            createdAt: new Date((r as { createdAt: string }).createdAt),
            updatedAt: new Date((r as { updatedAt: string }).updatedAt),
          },
        });
        routineIdMap.set(oldId, created.id);
        counts.routines += 1;
      }

      const exerciseIdMap = new Map<string, string>();
      for (const e of d.exercises ?? []) {
        const oldId = (e as { id: string }).id;
        const created = await tx.exercise.create({
          data: {
            name: (e as { name: string }).name,
            muscleGroup: (e as { muscleGroup: string }).muscleGroup,
            secondaryMuscles: (e as { secondaryMuscles: string | null }).secondaryMuscles ?? null,
            equipment: (e as { equipment: string | null }).equipment ?? null,
            notes: (e as { notes: string | null }).notes ?? null,
            isCustom: (e as { isCustom: boolean }).isCustom ?? false,
          },
        });
        exerciseIdMap.set(oldId, created.id);
        counts.exercises += 1;
      }

      for (const r of d.routines ?? []) {
        const newRoutineId = routineIdMap.get((r as { id: string }).id);
        if (!newRoutineId) continue;
        for (const re of (r as { exercises: unknown[] }).exercises ?? []) {
          const reOld = re as { id: string; exerciseId: string; position: number; targetSets: number; restSeconds: number; notes: string | null };
          await tx.routineExercise.create({
            data: {
              routineId: newRoutineId,
              exerciseId: exerciseIdMap.get(reOld.exerciseId) ?? reOld.exerciseId,
              position: reOld.position,
              targetSets: reOld.targetSets,
              restSeconds: reOld.restSeconds,
              notes: reOld.notes,
            },
          });
        }
      }

      const workoutIdMap = new Map<string, string>();
      for (const w of d.workouts ?? []) {
        const wOld = w as {
          id: string;
          routineId: string | null;
          name: string;
          startedAt: string;
          endedAt: string | null;
          status: string;
          notes: string | null;
          exercises: Array<{
            id: string;
            exerciseId: string;
            position: number;
            sets: Array<{
              id: string;
              setNumber: number;
              weight: number | null;
              reps: number | null;
              completed: boolean;
              completedAt: string | null;
              isPersonalRecord: boolean;
              prType: string | null;
              restStartedAt: string | null;
              restDuration: number | null;
              notes: string | null;
            }>;
          }>;
        };
        const newRoutineId = wOld.routineId ? routineIdMap.get(wOld.routineId) ?? null : null;
        const created = await tx.workout.create({
          data: {
            userId,
            routineId: newRoutineId,
            name: wOld.name,
            startedAt: new Date(wOld.startedAt),
            endedAt: wOld.endedAt ? new Date(wOld.endedAt) : null,
            status: wOld.status,
            notes: wOld.notes,
          },
        });
        workoutIdMap.set(wOld.id, created.id);
        counts.workouts += 1;

        for (const we of wOld.exercises) {
          const newWe = await tx.workoutExercise.create({
            data: {
              workoutId: created.id,
              exerciseId: exerciseIdMap.get(we.exerciseId) ?? we.exerciseId,
              position: we.position,
            },
          });
          for (const s of we.sets) {
            await tx.workoutSet.create({
              data: {
                workoutExerciseId: newWe.id,
                setNumber: s.setNumber,
                weight: s.weight,
                reps: s.reps,
                completed: s.completed,
                completedAt: s.completedAt ? new Date(s.completedAt) : null,
                isPersonalRecord: s.isPersonalRecord,
                prType: s.prType,
                restStartedAt: s.restStartedAt ? new Date(s.restStartedAt) : null,
                restDuration: s.restDuration,
                notes: s.notes,
              },
            });
          }
        }
      }

      for (const f of d.foodEntries ?? []) {
        const fOld = f as {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          mealType: string;
          date: string;
          valuesAreEstimated: boolean;
          notes: string | null;
        };
        await tx.foodEntry.create({
          data: {
            userId,
            name: fOld.name,
            quantity: fOld.quantity,
            unit: fOld.unit,
            calories: fOld.calories,
            protein: fOld.protein,
            carbs: fOld.carbs,
            fat: fOld.fat,
            mealType: fOld.mealType,
            date: new Date(fOld.date),
            valuesAreEstimated: fOld.valuesAreEstimated,
            notes: fOld.notes,
          },
        });
        counts.foodEntries += 1;
      }

      for (const sf of d.savedFoods ?? []) {
        const sfOld = sf as {
          name: string;
          unit: string;
          defaultQty: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          notes: string | null;
        };
        await tx.savedFood.create({
          data: {
            userId,
            name: sfOld.name,
            unit: sfOld.unit,
            defaultQty: sfOld.defaultQty,
            calories: sfOld.calories,
            protein: sfOld.protein,
            carbs: sfOld.carbs,
            fat: sfOld.fat,
            notes: sfOld.notes,
          },
        });
        counts.savedFoods += 1;
      }

      for (const sm of d.savedMeals ?? []) {
        const smOld = sm as {
          name: string;
          notes: string | null;
          items: Array<{ name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }>;
        };
        await tx.savedMeal.create({
          data: {
            userId,
            name: smOld.name,
            notes: smOld.notes,
            items: { create: smOld.items },
          },
        });
        counts.savedMeals += 1;
      }

      for (const bw of d.bodyWeights ?? []) {
        const bwOld = bw as { date: string; weightKg: number; notes: string | null };
        await tx.bodyWeightEntry.create({
          data: { userId, date: new Date(bwOld.date), weightKg: bwOld.weightKg, notes: bwOld.notes },
        });
        counts.bodyWeights += 1;
      }

      if (d.dailyNutritionTarget) {
        const tOld = d.dailyNutritionTarget as { calories: number; protein: number; carbs: number; fat: number };
        await tx.dailyNutritionTarget.upsert({
          where: { userId },
          create: { userId, ...tOld },
          update: tOld,
        });
      }

      if (d.appSetting) {
        const sOld = d.appSetting as { units: string; theme: string; locale: string; weeklyGoal: number };
        await tx.appSetting.upsert({
          where: { userId },
          create: { userId, ...sOld },
          update: sOld,
        });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  return { ok: true, imported: counts };
}

async function createPreImportBackup(userId: string): Promise<void> {
  try {
    const dir = path.resolve(process.cwd(), "backups");
    await fs.mkdir(dir, { recursive: true });
    const current = await exportBackup(userId);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(dir, `pre-import-${stamp}.json`);
    await fs.writeFile(file, JSON.stringify(current, null, 2), "utf8");
  } catch {
    // Non-fatal: backup failure should not block import.
  }
}
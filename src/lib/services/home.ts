import "server-only";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, rangeStart, type Range } from "@/lib/utils/dates";
import { workoutVolume } from "@/lib/utils/volume";

export type HomeData = {
  userName: string;
  today: Date;
  streakDays: number;
  scheduledRoutine: {
    id: string;
    name: string;
    exerciseCount: number;
    exerciseNames: string[];
  } | null;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    targets: { calories: number; protein: number; carbs: number; fat: number };
    meals: Array<{ mealType: string; calories: number; label: string }>;
  };
  metrics: {
    weightKg: number | null;
    weightDelta7: number | null;
    sessionsThisWeek: number;
    weeklyGoal: number;
    weekDays: Array<{ day: string; done: boolean }>;
    weeklyVolume: number;
    weeklyVolumeDelta: number | null;
  };
  recent: Array<
    | { type: "PR"; title: string; detail: string; at: Date }
    | { type: "MEAL"; title: string; detail: string; at: Date }
    | { type: "WEIGHT"; title: string; detail: string; at: Date }
  >;
  activeWorkoutId: string | null;
};

export async function getHomeData(userId: string): Promise<HomeData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [user, settings, nutritionTarget, todayEntries, lastWeight, activeWorkout, routines] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.appSetting.findUnique({ where: { userId } }),
      prisma.dailyNutritionTarget.findUnique({ where: { userId } }),
      prisma.foodEntry.findMany({
        where: { userId, date: { gte: todayStart, lte: todayEnd } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.bodyWeightEntry.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      prisma.workout.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      }),
      prisma.routine.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        include: { exercises: { include: { exercise: true }, orderBy: { position: "asc" } } },
      }),
    ]);

  const calories = todayEntries.reduce((a, e) => a + e.calories, 0);
  const protein = todayEntries.reduce((a, e) => a + e.protein, 0);
  const carbs = todayEntries.reduce((a, e) => a + e.carbs, 0);
  const fat = todayEntries.reduce((a, e) => a + e.fat, 0);

  const meals = aggregateMeals(todayEntries);

  const weekStart = startOfDay(addDays(now, -6));
  const recentWorkouts = await prisma.workout.findMany({
    where: { userId, status: "COMPLETED", endedAt: { gte: weekStart } },
    select: { startedAt: true, endedAt: true, exercises: { select: { sets: true } } },
  });
  const sessionsThisWeek = recentWorkouts.length;

  const weeklyVolume = recentWorkouts.reduce((acc, w) => {
    return (
      acc +
      w.exercises.reduce(
        (ea, e) => ea + e.sets.filter((s) => s.completed).reduce((sa, s) => sa + (s.weight ?? 0) * (s.reps ?? 0), 0),
        0,
      )
    );
  }, 0);

  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekWorkouts = await prisma.workout.findMany({
    where: {
      userId,
      status: "COMPLETED",
      endedAt: { gte: prevWeekStart, lt: weekStart },
    },
    select: { exercises: { select: { sets: true } } },
  });
  const prevVolume = prevWeekWorkouts.reduce(
    (acc, w) =>
      acc +
      w.exercises.reduce(
        (ea, e) => ea + e.sets.filter((s) => s.completed).reduce((sa, s) => sa + (s.weight ?? 0) * (s.reps ?? 0), 0),
        0,
      ),
    0,
  );
  const weeklyVolumeDelta = prevVolume > 0 ? ((weeklyVolume - prevVolume) / prevVolume) * 100 : null;

  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const weekDays: Array<{ day: string; done: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    const dStart = startOfDay(d);
    const dEnd = endOfDay(d);
    const done = recentWorkouts.some(
      (w) => w.startedAt >= dStart && w.startedAt <= dEnd,
    );
    weekDays.push({ day: days[(d.getDay() + 6) % 7], done });
  }

  let weightDelta7: number | null = null;
  if (lastWeight) {
    const sevenAgo = await prisma.bodyWeightEntry.findFirst({
      where: { userId, date: { lte: addDays(lastWeight.date, -7) } },
      orderBy: { date: "desc" },
    });
    if (sevenAgo) weightDelta7 = lastWeight.weightKg - sevenAgo.weightKg;
  }

  const streakDays = await computeStreak(userId);

  const scheduledRoutine = pickScheduledRoutine(routines);

  const recent = await getRecentActivity(userId);

  return {
    userName: user?.name ?? "Athlete",
    today: now,
    streakDays,
    scheduledRoutine,
    nutrition: {
      calories,
      protein,
      carbs,
      fat,
      targets: {
        calories: nutritionTarget?.calories ?? 2800,
        protein: nutritionTarget?.protein ?? 160,
        carbs: nutritionTarget?.carbs ?? 350,
        fat: nutritionTarget?.fat ?? 80,
      },
      meals,
    },
    metrics: {
      weightKg: lastWeight?.weightKg ?? null,
      weightDelta7,
      sessionsThisWeek,
      weeklyGoal: settings?.weeklyGoal ?? 4,
      weekDays,
      weeklyVolume,
      weeklyVolumeDelta,
    },
    recent,
    activeWorkoutId: activeWorkout?.id ?? null,
  };
}

function aggregateMeals(entries: Array<{ mealType: string; calories: number }>) {
  const order = ["BREAKFAST", "LUNCH", "SNACK", "DINNER", "OTHER"];
  const labels: Record<string, string> = {
    BREAKFAST: "Desayuno",
    LUNCH: "Almuerzo",
    SNACK: "Merienda",
    DINNER: "Cena",
    OTHER: "Snacks",
  };
  const icons: Record<string, string> = {
    BREAKFAST: "wb_twilight",
    LUNCH: "sunny",
    SNACK: "coffee",
    DINNER: "dinner_dining",
    OTHER: "cookie",
  };
  const map = new Map<string, { mealType: string; calories: number; label: string; icon: string }>();
  for (const e of entries) {
    const cur = map.get(e.mealType) ?? {
      mealType: e.mealType,
      calories: 0,
      label: labels[e.mealType] ?? e.mealType,
      icon: icons[e.mealType] ?? "restaurant",
    };
    cur.calories += e.calories;
    map.set(e.mealType, cur);
  }
  return order
    .filter((k) => map.has(k))
    .map((k) => {
      const v = map.get(k)!;
      return { mealType: v.mealType, calories: Math.round(v.calories), label: v.label };
    });
}

function pickScheduledRoutine(
  routines: Array<{
    id: string;
    name: string;
    exercises: Array<{ exercise: { name: string } }>;
  }>,
) {
  if (routines.length === 0) return null;
  const r = routines[0];
  return {
    id: r.id,
    name: r.name,
    exerciseCount: r.exercises.length,
    exerciseNames: r.exercises.map((e) => e.exercise.name),
  };
}

async function computeStreak(userId: string): Promise<number> {
  const workouts = await prisma.workout.findMany({
    where: { userId, status: "COMPLETED" },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
    take: 60,
  });
  if (workouts.length === 0) return 0;
  const set = new Set(workouts.map((w) => startOfDay(w.startedAt).toISOString()));
  let streak = 0;
  const cursor = startOfDay(new Date());
  while (set.has(cursor.toISOString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getRecentActivity(
  userId: string,
): Promise<HomeData["recent"]> {
  const items: HomeData["recent"] = [];

  const lastPr = await prisma.workoutSet.findFirst({
    where: { workoutExercise: { workout: { userId } }, isPersonalRecord: true },
    orderBy: { completedAt: "desc" },
    include: { workoutExercise: { include: { exercise: true } } },
  });
  if (lastPr) {
    items.push({
      type: "PR",
      title: lastPr.workoutExercise.exercise.name,
      detail: `${lastPr.weight ?? 0} kg × ${lastPr.reps ?? 0} reps`,
      at: lastPr.completedAt ?? new Date(),
    });
  }

  const lastMeal = await prisma.foodEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (lastMeal) {
    items.push({
      type: "MEAL",
      title: mealLabel(lastMeal.mealType),
      detail: `${lastMeal.name} (${Math.round(lastMeal.calories)} kcal)`,
      at: lastMeal.createdAt,
    });
  }

  const lastWeight = await prisma.bodyWeightEntry.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });
  if (lastWeight) {
    items.push({
      type: "WEIGHT",
      title: "Registro matutino",
      detail: `${lastWeight.weightKg.toFixed(1)} kg en ayunas`,
      at: lastWeight.date,
    });
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, 3);
}

function mealLabel(t: string): string {
  const map: Record<string, string> = {
    BREAKFAST: "Desayuno",
    LUNCH: "Almuerzo",
    SNACK: "Merienda",
    DINNER: "Cena",
    OTHER: "Snacks",
  };
  return map[t] ?? t;
}

export type ProgressSummary = {
  range: Range;
  sessionsCount: number;
  totalVolume: number;
  totalSets: number;
  prCount: number;
  weeklyVolume: Array<{ week: string; volume: number }>;
  frequency: Array<{ day: string; sessions: number }>;
  calories: { consumed: number; target: number; daysLogged: number };
  protein: { consumed: number; target: number; daysLogged: number };
  bodyWeight: { current: number | null; delta: number | null; series: Array<{ date: string; kg: number }> };
};

export async function getProgressSummary(userId: string, range: Range): Promise<ProgressSummary> {
  const start = rangeStart(range);
  const workouts = await prisma.workout.findMany({
    where: { userId, status: "COMPLETED", endedAt: { gte: start } },
    include: { exercises: { include: { sets: true } } },
    orderBy: { startedAt: "asc" },
  });

  const totalVolume = workouts.reduce((acc, w) => acc + workoutVolume(w), 0);
  const totalSets = workouts.reduce((acc, w) => acc + w.exercises.reduce((ea, e) => ea + e.sets.filter((s) => s.completed).length, 0), 0);
  const prCount = workouts.reduce(
    (acc, w) =>
      acc +
      w.exercises.reduce((ea, e) => ea + e.sets.filter((s) => s.isPersonalRecord).length, 0),
    0,
  );

  const weeklyMap = new Map<string, number>();
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    const monday = startOfDay(addDays(d, -((d.getDay() + 6) % 7)));
    const key = monday.toISOString().slice(0, 10);
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + workoutVolume(w));
  }
  const weeklyVolume = [...weeklyMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => ({ week: k, volume: v }));

  const freqMap = new Map<string, number>();
  for (const w of workouts) {
    const key = startOfDay(w.startedAt).toISOString().slice(0, 10);
    freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
  }
  const frequency = [...freqMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => ({ day: k, sessions: v }));

  const entries = await prisma.foodEntry.findMany({
    where: { userId, date: { gte: start } },
    select: { date: true, calories: true, protein: true },
  });
  const target = await prisma.dailyNutritionTarget.findUnique({ where: { userId } });
  const caloriesConsumed = entries.reduce((a, e) => a + e.calories, 0);
  const proteinConsumed = entries.reduce((a, e) => a + e.protein, 0);
  const daysLogged = new Set(entries.map((e) => startOfDay(e.date).toISOString())).size;

  const weights = await prisma.bodyWeightEntry.findMany({
    where: { userId, date: { gte: start } },
    orderBy: { date: "asc" },
  });
  const current = weights.length > 0 ? weights[weights.length - 1].weightKg : null;
  const first = weights.length > 0 ? weights[0].weightKg : null;
  const delta = current !== null && first !== null ? current - first : null;

  return {
    range,
    sessionsCount: workouts.length,
    totalVolume,
    totalSets,
    prCount,
    weeklyVolume,
    frequency,
    calories: {
      consumed: caloriesConsumed,
      target: (target?.calories ?? 2800) * Math.max(daysLogged, 1),
      daysLogged,
    },
    protein: {
      consumed: proteinConsumed,
      target: (target?.protein ?? 160) * Math.max(daysLogged, 1),
      daysLogged,
    },
    bodyWeight: {
      current,
      delta,
      series: weights.map((w) => ({ date: w.date.toISOString().slice(0, 10), kg: w.weightKg })),
    },
  };
}

import { addDays } from "@/lib/utils/dates";
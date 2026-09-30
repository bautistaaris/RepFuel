import "server-only";
import { prisma } from "@/lib/db";
import { startOfDay, addDays, rangeStart, type Range } from "@/lib/utils/dates";

export async function listBodyWeights(userId: string, limit = 90) {
  return prisma.bodyWeightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export async function addBodyWeight(
  userId: string,
  input: { date: Date; weightKg: number; notes?: string },
): Promise<string> {
  const day = startOfDay(input.date);
  const existing = await prisma.bodyWeightEntry.findFirst({
    where: { userId, date: day },
  });
  if (existing) {
    const e = await prisma.bodyWeightEntry.update({
      where: { id: existing.id },
      data: { weightKg: input.weightKg, notes: input.notes ?? existing.notes },
    });
    return e.id;
  }
  const e = await prisma.bodyWeightEntry.create({
    data: {
      userId,
      date: day,
      weightKg: input.weightKg,
      notes: input.notes,
    },
  });
  return e.id;
}

export async function deleteBodyWeight(userId: string, id: string): Promise<void> {
  const e = await prisma.bodyWeightEntry.findUnique({ where: { id } });
  if (!e || e.userId !== userId) throw new Error("No encontrado");
  await prisma.bodyWeightEntry.delete({ where: { id } });
}

export type WeightMetrics = {
  current: number | null;
  delta7: number | null;
  delta30: number | null;
  movingAvg7: number | null;
};

export async function weightMetrics(userId: string): Promise<WeightMetrics> {
  const entries = await prisma.bodyWeightEntry.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  if (entries.length === 0) return { current: null, delta7: null, delta30: null, movingAvg7: null };

  const current = entries[entries.length - 1];
  const lastDate = current.date;
  const target7 = addDays(lastDate, -7);
  const target30 = addDays(lastDate, -30);

  const closestBefore = (target: Date) => {
    let best: typeof entries[number] | null = null;
    let bestDiff = Infinity;
    for (const e of entries) {
      const diff = Math.abs(e.date.getTime() - target.getTime());
      if (diff < bestDiff) {
        best = e;
        bestDiff = diff;
      }
    }
    return best;
  };

  const before7 = closestBefore(target7);
  const before30 = closestBefore(target30);
  const delta7 = before7 ? current.weightKg - before7.weightKg : null;
  const delta30 = before30 ? current.weightKg - before30.weightKg : null;

  const last7 = entries.slice(-7);
  const movingAvg7 = last7.reduce((a, e) => a + e.weightKg, 0) / last7.length;

  return { current: current.weightKg, delta7, delta30, movingAvg7 };
}

export async function weightSeries(userId: string, range: Range) {
  const start = rangeStart(range);
  return prisma.bodyWeightEntry.findMany({
    where: { userId, date: { gte: start } },
    orderBy: { date: "asc" },
  });
}
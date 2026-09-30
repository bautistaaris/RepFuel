"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { exportBackup, importBackup } from "@/lib/services/backup";

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

export async function exportBackupAction(): Promise<{ ok: true; payload: unknown }> {
  const userId = await requireUser();
  const payload = await exportBackup(userId);
  return { ok: true, payload };
}

const ImportSchema = z.object({ payload: z.unknown() });

export async function importBackupAction(input: unknown) {
  const userId = await requireUser();
  const parsed = ImportSchema.parse(input);
  const result = await importBackup(userId, parsed.payload);
  revalidatePath("/");
  return result;
}

const WeeklyGoal = z.object({ weeklyGoal: z.number().int().min(1).max(14) });

export async function updateWeeklyGoalAction(input: z.infer<typeof WeeklyGoal>) {
  const userId = await requireUser();
  const parsed = WeeklyGoal.parse(input);
  await prisma.appSetting.upsert({
    where: { userId },
    create: { userId, weeklyGoal: parsed.weeklyGoal, theme: "dark", locale: "es", units: "metric" },
    update: { weeklyGoal: parsed.weeklyGoal },
  });
  revalidatePath("/inicio");
  revalidatePath("/progreso");
  revalidatePath("/settings");
  return { ok: true as const };
}

const Profile = z.object({ name: z.string().min(1).max(80) });

export async function updateProfileAction(input: z.infer<typeof Profile>) {
  const userId = await requireUser();
  const parsed = Profile.parse(input);
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.name } });
  revalidatePath("/inicio");
  revalidatePath("/settings");
  return { ok: true as const };
}

const Password = z.object({
  current: z.string().min(1),
  next: z.string().min(8).max(200),
});

export async function changePasswordAction(input: z.infer<typeof Password>) {
  const userId = await requireUser();
  const parsed = Password.parse(input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("No encontrado");
  const auth = await import("@/lib/auth");
const verifyPassword = auth.verifyPassword;
const hashPassword = auth.hashPassword;
  const ok = await verifyPassword(parsed.current, user.passwordHash);
  if (!ok) throw new Error("Contraseña actual incorrecta");
  const passwordHash = await hashPassword(parsed.next);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true as const };
}
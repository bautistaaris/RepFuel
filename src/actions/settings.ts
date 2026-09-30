"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exportBackup, importBackup } from "@/lib/services/backup";
import { getSessionUserId } from "@/lib/session";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { passwordStrengthError } from "@/lib/crypto";

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
    create: { userId, weeklyGoal: parsed.weeklyGoal, theme: "dark", locale: "es", units: "metric", timezone: "UTC" },
    update: { weeklyGoal: parsed.weeklyGoal },
  });
  revalidatePath("/inicio");
  revalidatePath("/progreso");
  revalidatePath("/settings");
  return { ok: true as const };
}

const UpdateSettings = z.object({
  units: z.enum(["metric", "imperial"]).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  locale: z.string().min(2).max(8).optional(),
  timezone: z.string().min(1).max(80).optional(),
});

export async function updateSettingsAction(input: z.infer<typeof UpdateSettings>) {
  const userId = await requireUser();
  const parsed = UpdateSettings.parse(input);
  await prisma.appSetting.upsert({
    where: { userId },
    create: { userId, ...parsed, weeklyGoal: 4 },
    update: parsed,
  });
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

const ChangePassword = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(1).max(200),
});

export async function changePasswordAction(input: z.infer<typeof ChangePassword>) {
  const userId = await requireUser();
  const parsed = ChangePassword.parse(input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("No encontrado");
  const ok = await verifyPassword(parsed.current, user.passwordHash);
  if (!ok) throw new Error("Contraseña actual incorrecta");
  const pwdErr = passwordStrengthError(parsed.next);
  if (pwdErr) throw new Error(pwdErr);
  const passwordHash = await hashPassword(parsed.next);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return { ok: true as const };
}

const DeleteAccount = z.object({
  password: z.string().min(1).max(200),
  confirm: z.string().min(1).max(200),
});

export async function deleteAccountAction(input: z.infer<typeof DeleteAccount>) {
  const userId = await requireUser();
  const parsed = DeleteAccount.parse(input);
  if (parsed.confirm !== "ELIMINAR") {
    return { ok: false, error: "Confirmación incorrecta. Escribí ELIMINAR exactamente." };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "No encontrado" };
  const ok = await verifyPassword(parsed.password, user.passwordHash);
  if (!ok) return { ok: false, error: "Contraseña incorrecta" };

  await prisma.exercise.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await destroySession();
  redirect("/login?deleted=1");
}
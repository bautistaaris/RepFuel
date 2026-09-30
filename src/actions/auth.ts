"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { setSession, destroySession } from "@/lib/session";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";
import { getEmailService } from "@/lib/email";
import { generateRandomToken, hashToken, verifyTokenHash, normalizeEmail, isValidEmail, passwordStrengthError } from "@/lib/crypto";
import { headers } from "next/headers";

const REGISTER_TTL_MS = 1000 * 60 * 60 * 24;
const RESET_TTL_MS = 1000 * 60 * 60;

export type FormState = { error: string | null; ok?: boolean };

const RegisterSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().max(200),
  password: z.string().min(1).max(200),
  confirmPassword: z.string().min(1).max(200),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if ((process.env.ALLOW_PUBLIC_REGISTRATION ?? "true").toLowerCase() !== "true") {
    return { error: "El registro está cerrado. Pedí invitación al administrador." };
  }

  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }

  const name = parsed.data.name.trim();
  const email = normalizeEmail(parsed.data.email);
  const password = parsed.data.password;
  const confirm = parsed.data.confirmPassword;

  if (!isValidEmail(email)) {
    return { error: "Email inválido" };
  }
  const pwdErr = passwordStrengthError(password);
  if (pwdErr) return { error: pwdErr };
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con ese email" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  await prisma.appSetting.create({ data: { userId: user.id } });
  await prisma.dailyNutritionTarget.create({
    data: { userId: user.id, calories: 2800, protein: 160, carbs: 350, fat: 80 },
  });

  const token = generateRandomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REGISTER_TTL_MS),
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/verify-email/${token}`;
  await getEmailService().send({
    to: email,
    subject: "Verificá tu email en RepFuel",
    text: `Bienvenido a RepFuel.\n\nVerificá tu email abriendo este enlace (válido 24h):\n${link}\n\nSi no creaste esta cuenta, podés ignorar este mensaje.`,
  });

  return { error: null, ok: true };
}

export async function verifyEmailAction(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Token inválido" };

  const candidates = await prisma.emailVerificationToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  for (const c of candidates) {
    if (verifyTokenHash(token, c.tokenHash)) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: c.userId },
          data: { emailVerifiedAt: new Date() },
        }),
        prisma.emailVerificationToken.update({
          where: { id: c.id },
          data: { usedAt: new Date() },
        }),
      ]);
      return { ok: true };
    }
  }
  return { ok: false, error: "El enlace de verificación es inválido o expiró" };
}

const LoginSchema = z.object({
  email: z.string().max(200),
  password: z.string().min(1).max(200),
});

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Email o contraseña inválidos." };
  }

  const email = normalizeEmail(parsed.data.email);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = checkLoginRateLimit(`${email}:${ip}`);
  if (!limit.ok) {
    return { error: `Demasiados intentos. Esperá ${Math.ceil(limit.retryAfterSec / 60)} min.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Credenciales incorrectas" };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Credenciales incorrectas" };
  }

  resetLoginRateLimit(`${email}:${ip}`);
  const isHttps = (h.get("x-forwarded-proto") ?? "").toLowerCase() === "https";
  await setSession(user.id, isHttps);
  revalidatePath("/");
  redirect("/inicio");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) {
    return { error: null, ok: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = generateRandomToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const link = `${appUrl}/reset-password/${token}`;
    await getEmailService().send({
      to: email,
      subject: "Restablecé tu contraseña de RepFuel",
      text: `Recibimos un pedido para restablecer tu contraseña. Abrí este enlace (válido 1h):\n${link}\n\nSi no fuiste vos, ignorá este mensaje.`,
    });
  }

  return { error: null, ok: true };
}

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1).max(200),
  confirmPassword: z.string().min(1).max(200),
});

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }

  const pwdErr = passwordStrengthError(parsed.data.password);
  if (pwdErr) return { error: pwdErr };
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Las contraseñas no coinciden" };
  }

  const candidates = await prisma.passwordResetToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  let match = null;
  for (const c of candidates) {
    if (verifyTokenHash(parsed.data.token, c.tokenHash)) {
      match = c;
      break;
    }
  }
  if (!match) {
    return { error: "El enlace es inválido o expiró" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: match.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: match.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: match.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { error: null, ok: true };
}
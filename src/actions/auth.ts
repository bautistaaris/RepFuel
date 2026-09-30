"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSession, destroySession, verifyCsrf } from "@/lib/session";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  csrf: z.string().min(1),
});

export type LoginResult = { ok: false; error: string } | { ok: true };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const csrfHeader = (await headers()).get("x-csrf-token");
  const csrfValid = await verifyCsrf(csrfHeader);
  if (!csrfValid) {
    return { ok: false, error: "Sesión inválida. Recargá la página." };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    csrf: formData.get("csrf"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Email o contraseña inválidos." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = checkLoginRateLimit(`${parsed.data.email}:${ip}`);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Demasiados intentos. Esperá ${Math.ceil(limit.retryAfterSec / 60)} min.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { ok: false, error: "Credenciales incorrectas." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { ok: false, error: "Credenciales incorrectas." };
  }

  resetLoginRateLimit(`${parsed.data.email}:${ip}`);
  await setSession(user.id);
  redirect("/inicio");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSession, destroySession } from "@/lib/session";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  csrf: z.string().min(1),
});

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const h = await headers();

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    csrf: formData.get("csrf") ?? "",
  });
  if (!parsed.success) {
    return { error: "Email o contraseña inválidos." };
  }

  const csrfCookie = h.get("cookie") ?? "";
  const csrfMatch = csrfCookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  const csrfFromCookie = csrfMatch ? decodeURIComponent(csrfMatch[1]) : null;
  if (!csrfFromCookie || csrfFromCookie !== parsed.data.csrf) {
    return { error: "Sesión inválida. Recargá la página." };
  }

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = checkLoginRateLimit(`${parsed.data.email}:${ip}`);
  if (!limit.ok) {
    return {
      error: `Demasiados intentos. Esperá ${Math.ceil(limit.retryAfterSec / 60)} min.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "Credenciales incorrectas." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Credenciales incorrectas." };
  }

  resetLoginRateLimit(`${parsed.data.email}:${ip}`);
  const isHttps = (h.get("x-forwarded-proto") ?? "").toLowerCase() === "https";
  await setSession(user.id, isHttps);
  redirect("/inicio");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
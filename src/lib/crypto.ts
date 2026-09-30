import "server-only";
import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me-please-32-chars";

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHmac("sha256", SECRET).update(token).digest("hex");
}

export function verifyTokenHash(token: string, hash: string): boolean {
  const expected = hashToken(token);
  const a = Buffer.from(expected);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function passwordMeetsPolicy(pwd: string): boolean {
  return pwd.length >= 8 && pwd.length <= 200;
}

export function passwordStrengthError(pwd: string): string | null {
  if (!pwd) return "Contraseña requerida";
  if (pwd.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (pwd.length > 200) return "Contraseña demasiado larga";
  return null;
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (Number.isInteger(value)) return `${value} kg`;
  return `${value.toFixed(1)} kg`;
}

export function formatReps(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value}`;
}

export function formatKcal(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value).toLocaleString("es-AR")} kcal`;
}

export function formatGrams(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)}g`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatRelative(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD}d`;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function formatClock(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";

const ITEMS = [
  { href: "/inicio", label: "Inicio", icon: "home" },
  { href: "/entreno", label: "Entreno", icon: "fitness_center" },
  { href: "/dieta", label: "Dieta", icon: "restaurant" },
  { href: "/progreso", label: "Progreso", icon: "insights" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-center h-20 px-margin">
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname?.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-space-xs min-w-[56px] min-h-[48px] transition-colors",
                active ? "text-primary-fixed" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <MaterialSymbol name={it.icon} className="text-[24px]" fill={active} />
              <span className="font-caption text-caption">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
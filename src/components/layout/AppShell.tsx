import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SwRegister } from "./SwRegister";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  withNav = true,
  className,
  topPadding = true,
  bottomNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
  className?: string;
  topPadding?: boolean;
  bottomNav?: boolean;
}) {
  return (
    <>
      <SwRegister />
      <main
        className={cn(
          "flex flex-col relative w-full bg-surface min-h-screen",
          topPadding && "pt-16",
          bottomNav && "pb-24",
          className,
        )}
      >
        {children}
      </main>
      {withNav && bottomNav && <BottomNav />}
    </>
  );
}
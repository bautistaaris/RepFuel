"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/actions/auth";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  useEffect(() => {
    return () => {};
  }, []);

  async function handleLogout() {
    // Best-effort: clear SW caches so other users on this device don't see cached pages.
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.active?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
      } catch {
        // ignore
      }
    }
    // Hit the server action via a fetch round-trip isn't ideal here; instead submit a form.
    void router;
  }

  return (
    <form
      action={async () => {
        await handleLogout();
        await logoutAction();
      }}
      className={className}
    >
      <button type="submit" className="h-11 px-4 rounded-lg bg-error-container text-error hover:opacity-90 inline-flex items-center justify-center gap-2 font-headline-sm text-body-lg font-bold">
        Cerrar sesión
      </button>
    </form>
  );
}
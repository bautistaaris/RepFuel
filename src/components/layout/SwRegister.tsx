"use client";

import { useEffect, useState } from "react";

export function SwRegister() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine);
      const onOnline = () => setOnline(true);
      const onOffline = () => setOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }
  }, []);

  if (online) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[60] pt-safe bg-error-container text-error font-label-sm text-label-sm text-center py-1">
      Sin conexión
    </div>
  );
}
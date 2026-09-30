"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Input, NumericInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  exportBackupAction,
  importBackupAction,
  updateWeeklyGoalAction,
  updateProfileAction,
  changePasswordAction,
  deleteAccountAction,
  updateSettingsAction,
} from "@/actions/settings";
import { logoutAction } from "@/actions/auth";

export function AccountSettings({
  user,
}: {
  user: { email: string; name: string; timezone: string; units: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(user.name);
  const [goal, setGoal] = useState(4);
  const [units, setUnits] = useState<"metric" | "imperial">(user.units as "metric" | "imperial");
  const [timezone, setTimezone] = useState(user.timezone);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function doExport() {
    const res = await exportBackupAction();
    const blob = new Blob([JSON.stringify(res.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repfuel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    const text = await file.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { setMsg("Archivo inválido"); return; }
    startTransition(async () => {
      const res = await importBackupAction({ payload: parsed });
      if (res.ok) {
        setMsg(`Importado: ${JSON.stringify(res.imported)}`);
        router.refresh();
      } else {
        setMsg(res.error ?? "Error");
      }
    });
  }

  async function doLogout() {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.active?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
      } catch {}
    }
    await logoutAction();
  }

  async function doDeleteAccount() {
    if (deleteConfirm !== "ELIMINAR") {
      setMsg("Escribí ELIMINAR exactamente para confirmar");
      return;
    }
    startTransition(async () => {
      const res = await deleteAccountAction({ password: deletePwd, confirm: deleteConfirm });
      if (!res.ok) setMsg(res.error ?? "Error");
    });
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl px-margin">
      {/* Perfil */}
      <Card className="gap-space-sm">
        <div className="flex items-center gap-2">
          <MaterialSymbol name="person" className="text-primary-fixed" />
          <h2 className="font-headline-sm text-headline-sm">Perfil</h2>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">{user.email}</p>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={pending}
          onClick={() => startTransition(async () => {
            await updateProfileAction({ name: name.trim() || "Usuario" });
            setMsg("Nombre actualizado");
            router.refresh();
          })}
        >
          Guardar nombre
        </Button>
      </Card>

      {/* Preferencias */}
      <Card className="gap-space-sm">
        <div className="flex items-center gap-2">
          <MaterialSymbol name="tune" className="text-primary-fixed" />
          <h2 className="font-headline-sm text-headline-sm">Preferencias</h2>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Unidades</span>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}
            className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg"
          >
            <option value="metric">Métrico (kg)</option>
            <option value="imperial">Imperial (lb)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Zona horaria</span>
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Argentina/Buenos_Aires" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Objetivo semanal (entrenos)</span>
          <NumericInput inputMode="numeric" min={1} max={14} value={goal} onChange={(e) => setGoal(parseInt(e.target.value, 10) || 1)} />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={pending}
          onClick={() => startTransition(async () => {
            await Promise.all([
              updateSettingsAction({ units, timezone }),
              updateWeeklyGoalAction({ weeklyGoal: goal }),
            ]);
            setMsg("Preferencias guardadas");
            router.refresh();
          })}
        >
          Guardar preferencias
        </Button>
      </Card>

      {/* Seguridad */}
      <Card className="gap-space-sm">
        <div className="flex items-center gap-2">
          <MaterialSymbol name="lock" className="text-primary-fixed" />
          <h2 className="font-headline-sm text-headline-sm">Seguridad</h2>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Contraseña actual</span>
          <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nueva contraseña</span>
          <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={pending || !currentPwd || newPwd.length < 8}
          onClick={() => startTransition(async () => {
            try {
              await changePasswordAction({ current: currentPwd, next: newPwd });
              setMsg("Contraseña actualizada");
              setCurrentPwd("");
              setNewPwd("");
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Error");
            }
          })}
        >
          Cambiar contraseña
        </Button>
      </Card>

      {/* Datos */}
      <Card className="gap-space-sm">
        <div className="flex items-center gap-2">
          <MaterialSymbol name="cloud_download" className="text-primary-fixed" />
          <h2 className="font-headline-sm text-headline-sm">Datos</h2>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Exportá solo tus datos (sin contraseñas ni sesiones). Importar reemplaza todos tus datos privados.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={doExport}>
            <MaterialSymbol name="download" className="text-[16px]" />
            Exportar
          </Button>
          <label className="h-11 px-4 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-body-lg font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
            <MaterialSymbol name="upload" className="text-[16px]" />
            Importar
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </Card>

      {/* Eliminar cuenta */}
      <Card className="gap-space-sm">
        <div className="flex items-center gap-2">
          <MaterialSymbol name="delete_forever" className="text-error" />
          <h2 className="font-headline-sm text-headline-sm text-error">Eliminar cuenta</h2>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Se borrarán todos tus datos privados. No se puede deshacer.
        </p>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Contraseña</span>
          <Input type="password" value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Escribí ELIMINAR para confirmar</span>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
        </label>
        <Button variant="danger" size="md" disabled={pending || !deletePwd || deleteConfirm !== "ELIMINAR"} onClick={doDeleteAccount}>
          Eliminar mi cuenta
        </Button>
      </Card>

      {/* Sesión */}
      <Card className="gap-space-sm">
        <div className="flex items-center gap-2">
          <MaterialSymbol name="logout" className="text-on-surface-variant" />
          <h2 className="font-headline-sm text-headline-sm">Sesión</h2>
        </div>
        <button onClick={doLogout} className="h-11 px-4 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-body-lg font-bold inline-flex items-center justify-center gap-2">
          <MaterialSymbol name="logout" className="text-[16px]" />
          Cerrar sesión
        </button>
        <LogoutButton className="hidden" />
      </Card>

      {msg && <p className="font-body-md text-body-md text-on-surface-variant">{msg}</p>}
    </div>
  );
}
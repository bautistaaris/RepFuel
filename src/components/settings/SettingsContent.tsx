"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";
import { Card } from "@/components/ui/Card";
import { Input, NumericInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  exportBackupAction,
  importBackupAction,
  updateWeeklyGoalAction,
  updateProfileAction,
  changePasswordAction,
} from "@/actions/settings";
import { withCsrf } from "@/lib/csrf-client";
import { logoutAction } from "@/actions/auth";

export function SettingsContent({
  csrf,
  user,
  weeklyGoal,
}: {
  csrf: string;
  user: { email: string; name: string | null };
  weeklyGoal: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(user.name ?? "Admin");
  const [goal, setGoal] = useState(weeklyGoal);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
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
      const res = await importBackupAction(withCsrf({ payload: parsed }, csrf));
      if (res.ok) {
        setMsg(`Importado: ${JSON.stringify(res.imported)}`);
        router.refresh();
      } else {
        setMsg(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <Card className="gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm">Perfil</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{user.email}</p>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={pending}
          onClick={() => startTransition(async () => {
            await updateProfileAction(withCsrf({ name: name.trim() || "Admin" }, csrf));
            setMsg("Nombre actualizado");
            router.refresh();
          })}
        >
          Guardar nombre
        </Button>
      </Card>

      <Card className="gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm">Objetivo semanal</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Cuántos entrenamientos querés hacer por semana.</p>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Días</span>
          <NumericInput inputMode="numeric" min={1} max={14} value={goal} onChange={(e) => setGoal(parseInt(e.target.value, 10) || 1)} />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={pending}
          onClick={() => startTransition(async () => {
            await updateWeeklyGoalAction(withCsrf({ weeklyGoal: goal }, csrf));
            setMsg("Objetivo actualizado");
          })}
        >
          Guardar objetivo
        </Button>
      </Card>

      <Card className="gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm">Cambiar contraseña</h2>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Actual</span>
          <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nueva</span>
          <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={pending || !currentPwd || newPwd.length < 8}
          onClick={() => startTransition(async () => {
            try {
              await changePasswordAction(withCsrf({ current: currentPwd, next: newPwd }, csrf));
              setMsg("Contraseña cambiada");
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

      <Card className="gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm">Backup</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Exportá todos tus datos en JSON. Antes de importar se crea un backup automático.</p>
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
        {msg && <p className="font-body-md text-body-md text-on-surface-variant">{msg}</p>}
      </Card>

      <Card className="gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-error">Sesión</h2>
        <form action={logoutAction}>
          <Button type="submit" variant="danger" size="md">
            <MaterialSymbol name="logout" className="text-[16px]" />
            Cerrar sesión
          </Button>
        </form>
      </Card>
    </div>
  );
}
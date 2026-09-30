"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateRoutineAction, deleteRoutineAction } from "@/actions/routines";
import { withCsrf } from "@/lib/csrf-client";
import { IconBtn } from "@/components/ui/IconBtn";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";

export function RoutineActions({ routineId, csrf }: { routineId: string; csrf: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function duplicate() {
    startTransition(async () => {
      const res = await duplicateRoutineAction(withCsrf({ routineId }, csrf) as unknown as string);
      if (res.ok) router.push(`/entreno/${res.id}`);
    });
  }

  function remove() {
    if (!confirm("¿Eliminar esta rutina?")) return;
    startTransition(async () => {
      await deleteRoutineAction(routineId);
      router.push("/entreno");
    });
  }

  return (
    <div className="flex items-center gap-1">
      <IconBtn disabled={pending} onClick={duplicate} title="Duplicar">
        <MaterialSymbol name="content_copy" className="text-[20px]" />
      </IconBtn>
      <IconBtn disabled={pending} onClick={remove} title="Eliminar">
        <MaterialSymbol name="delete" className="text-[20px]" />
      </IconBtn>
    </div>
  );
}
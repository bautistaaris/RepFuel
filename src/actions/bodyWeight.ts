"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { addBodyWeight, deleteBodyWeight } from "@/lib/services/bodyWeight";

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

const AddEntry = z.object({
  date: z.string().min(1),
  weightKg: z.number().min(20).max(400),
  notes: z.string().max(500).optional(),
});

export async function addBodyWeightAction(input: z.infer<typeof AddEntry>) {
  const userId = await requireUser();
  const parsed = AddEntry.parse(input);
  const id = await addBodyWeight(userId, {
    date: new Date(parsed.date),
    weightKg: parsed.weightKg,
    notes: parsed.notes,
  });
  revalidatePath("/progreso/peso");
  revalidatePath("/inicio");
  return { ok: true as const, id };
}

export async function deleteBodyWeightAction(id: string) {
  const userId = await requireUser();
  await deleteBodyWeight(userId, id);
  revalidatePath("/progreso/peso");
  revalidatePath("/inicio");
  return { ok: true as const };
}
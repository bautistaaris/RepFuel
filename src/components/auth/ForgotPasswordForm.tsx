"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordResetAction, type FormState } from "@/actions/auth";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";

const initialState: FormState = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction as unknown as (prev: FormState, formData: FormData) => Promise<FormState>, initialState);

  if (state.ok) {
    return (
      <div className="rounded-xl bg-surface-container p-space-md flex flex-col gap-space-sm text-center">
        <MaterialSymbol name="mark_email_unread" className="text-[36px] text-primary-fixed mx-auto" />
        <p className="font-body-md text-body-md text-on-surface-variant">
          Si el email existe en el sistema, vas a recibir un enlace. Revisá tu casilla.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-space-md">
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email</span>
        <input
          type="email"
          name="email"
          required
          maxLength={200}
          autoComplete="email"
          autoFocus
          className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
        />
      </label>
      {state.error && (
        <div className="px-3 py-2 rounded-lg bg-error-container/40 text-error font-body-md text-body-md">
          {state.error}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 rounded-lg bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar enlace"}
    </button>
  );
}
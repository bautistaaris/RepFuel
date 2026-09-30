"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction, type FormState } from "@/actions/auth";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";

const initialState: FormState = { error: null };

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction as unknown as (prev: FormState, formData: FormData) => Promise<FormState>, initialState);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin py-8 bg-surface">
      <div className="w-full max-w-sm flex flex-col gap-space-lg">
        <div className="flex flex-col items-center gap-space-sm">
          <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-12 h-12 text-primary-fixed fill-current">
              <path d="M50 8 L78 60 L62 60 L62 92 L38 92 L38 60 L22 60 Z" />
            </svg>
          </div>
          <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight">Crear cuenta</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Tu entrenamiento y nutrición, privados.</p>
        </div>

        {state.ok ? (
          <div className="rounded-xl bg-surface-container p-space-md flex flex-col gap-space-sm text-center">
            <MaterialSymbol name="mark_email_unread" className="text-[36px] text-primary-fixed mx-auto" />
            <h2 className="font-headline-sm text-headline-sm">Revisá tu email</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Te enviamos un enlace de verificación. Abrilo para activar tu cuenta.
            </p>
            <Link href="/login" className="h-10 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center font-label-sm text-label-sm">
              Ir al login
            </Link>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-space-md">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nombre</span>
              <input
                type="text"
                name="name"
                required
                maxLength={80}
                autoFocus
                className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email</span>
              <input
                type="email"
                name="email"
                required
                maxLength={200}
                autoComplete="email"
                className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Contraseña</span>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                maxLength={200}
                autoComplete="new-password"
                className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
              <span className="font-caption text-caption text-on-surface-variant">Mínimo 8 caracteres.</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Confirmar contraseña</span>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                maxLength={200}
                autoComplete="new-password"
                className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
            </label>

            {state.error && (
              <div className="px-3 py-2 rounded-lg bg-error-container/40 text-error font-body-md text-body-md flex items-center gap-2">
                <MaterialSymbol name="error" className="text-[18px]" />
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        )}

        <p className="text-center font-body-md text-body-md text-on-surface-variant">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary-fixed font-bold">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
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
      {pending ? "Creando..." : "Crear cuenta"}
    </button>
  );
}
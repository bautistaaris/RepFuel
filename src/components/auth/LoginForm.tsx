"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction } from "@/actions/auth";
import { MaterialSymbol } from "@/components/primitives/MaterialSymbol";

export function LoginForm({ csrf, hideTitle = false }: { csrf: string; hideTitle?: boolean }) {
  const [state, formAction, pending] = useFormState(loginAction as unknown as (prev: { error: string | null }, formData: FormData) => Promise<{ error: string | null }>, { error: null as string | null });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin bg-surface">
      <div className="w-full max-w-sm flex flex-col gap-space-lg">
        {!hideTitle && (
          <div className="flex flex-col items-center gap-space-sm">
            <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-primary-fixed fill-current">
                <path d="M50 8 L78 60 L62 60 L62 92 L38 92 L38 60 L22 60 Z" />
              </svg>
            </div>
            <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight">RepFuel</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Acceso privado</p>
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-space-md">
          <input type="hidden" name="csrf" value={csrf} />
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              autoFocus
              className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Contraseña
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="h-12 px-3 rounded-lg bg-surface-container text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-fixed"
            />
          </label>

          {state.error && (
            <div className="px-3 py-2 rounded-lg bg-error-container/40 text-error font-body-md text-body-md flex items-center gap-2">
              <MaterialSymbol name="error" className="text-[18px]" />
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-12 rounded-lg bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {!hideTitle && (
          <div className="flex flex-col gap-space-sm text-center font-body-md text-body-md text-on-surface-variant">
            <Link href="/forgot-password" className="text-primary-fixed">Olvidé mi contraseña</Link>
            <span>
              ¿No tenés cuenta?{" "}
              <Link href="/register" className="text-primary-fixed font-bold">Crear cuenta</Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
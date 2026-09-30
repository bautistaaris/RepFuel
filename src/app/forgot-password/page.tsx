import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin py-8 bg-surface">
      <div className="w-full max-w-sm flex flex-col gap-space-lg">
        <div className="flex flex-col items-center gap-space-sm">
          <h1 className="font-headline-md text-headline-md">Recuperar contraseña</h1>
          <p className="font-body-md text-body-md text-on-surface-variant text-center">
            Te enviamos un enlace para restablecerla.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center font-body-md text-body-md text-on-surface-variant">
          <Link href="/login" className="text-primary-fixed font-bold">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
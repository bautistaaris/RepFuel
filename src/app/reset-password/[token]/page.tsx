import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin py-8 bg-surface">
      <div className="w-full max-w-sm flex flex-col gap-space-lg">
        <div className="flex flex-col items-center gap-space-sm">
          <h1 className="font-headline-md text-headline-md">Nueva contraseña</h1>
        </div>
        <ResetPasswordForm token={token} />
        <p className="text-center font-body-md text-body-md text-on-surface-variant">
          <Link href="/login" className="text-primary-fixed font-bold">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
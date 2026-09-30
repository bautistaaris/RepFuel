import { redirect } from "next/navigation";
import { verifyEmailAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { readCsrfCookie } from "@/lib/session";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmailAction(token);
  if (result.ok) {
    redirect("/login?verified=1");
  }
  let csrf = await readCsrfCookie();
  if (!csrf) csrf = crypto.randomBytes(24).toString("base64url");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin py-8 bg-surface">
      <div className="w-full max-w-sm flex flex-col gap-space-md text-center">
        <h1 className="font-headline-md text-headline-md">Enlace inválido o expirado</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {result.error ?? "Solicitá uno nuevo desde tu perfil."}
        </p>
        <LoginForm csrf={csrf} hideTitle />
      </div>
    </div>
  );
}
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");

  if ((process.env.ALLOW_PUBLIC_REGISTRATION ?? "true").toLowerCase() !== "true") {
    return (
      <div className="min-h-screen flex items-center justify-center px-margin bg-surface">
        <div className="max-w-sm text-center">
          <h1 className="font-headline-md text-headline-md">Registro cerrado</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-md">
            Por el momento no es posible crear cuentas nuevas. Si necesitás acceso, contactá al administrador.
          </p>
        </div>
      </div>
    );
  }

  return <RegisterForm />;
}
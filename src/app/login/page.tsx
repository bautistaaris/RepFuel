import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { ensureCsrfCookie } from "@/lib/session";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/inicio");
  const csrf = await ensureCsrfCookie();
  return <LoginForm csrf={csrf} />;
}
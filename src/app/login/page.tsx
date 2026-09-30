import { redirect } from "next/navigation";
import { getSessionUserId, readCsrfCookie } from "@/lib/session";
import crypto from "crypto";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/inicio");
  let csrf = await readCsrfCookie();
  if (!csrf) csrf = crypto.randomBytes(24).toString("base64url");
  return <LoginForm csrf={csrf} />;
}
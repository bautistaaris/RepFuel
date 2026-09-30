import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { getSessionCsrf } from "@/lib/csrf-page";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const csrf = await getSessionCsrf();
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.appSetting.findUnique({ where: { userId } }),
  ]);
  if (!user) redirect("/login");
  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Ajustes" backHref="/inicio" />
      <SettingsContent csrf={csrf} user={user} weeklyGoal={settings?.weeklyGoal ?? 4} />
    </AppShell>
  );
}
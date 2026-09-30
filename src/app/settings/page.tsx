import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-user";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { AccountSettings } from "@/components/settings/AccountSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell bottomNav={false}>
      <AppHeader title="Ajustes" backHref="/inicio" />
      <AccountSettings
        user={{
          email: user.email,
          name: user.name ?? "Usuario",
          timezone: user.settings?.timezone ?? "UTC",
          units: user.settings?.units ?? "metric",
        }}
      />
    </AppShell>
  );
}
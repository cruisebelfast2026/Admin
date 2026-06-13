import { PageHeader } from "@/components/PageHeader";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  let settings: Partial<Settings> = { ...DEFAULT_SETTINGS };
  let configured = false;

  if (supabase) {
    configured = true;
    const { data } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) settings = data as Settings;
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Defaults apply to NEW rotas only — they never retroactively update existing rotas."
      />
      <SettingsForm initial={settings} configured={configured} />
    </div>
  );
}

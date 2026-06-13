import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DEFAULT_SETTINGS, SEASON_MONTHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Settings, Ship, Staff } from "@/lib/types";
import { MonthView } from "./MonthView";

export const dynamic = "force-dynamic";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  const monthDef = SEASON_MONTHS.find(
    (m) => m.name.toLowerCase() === month.toLowerCase(),
  );
  if (!monthDef) notFound();

  const supabase = await createClient();
  const year = new Date().getFullYear();
  let ships: Ship[] = [];
  let staff: Staff[] = [];
  let settings: Partial<Settings> = { ...DEFAULT_SETTINGS };
  const configured = Boolean(supabase);

  if (supabase) {
    const [shipsRes, staffRes, settingsRes] = await Promise.all([
      supabase
        .from("ships")
        .select("*")
        .eq("month", monthDef.value)
        .eq("year", year)
        .order("date", { ascending: true }),
      supabase.from("staff").select("*").eq("is_active", true).order("first_name"),
      supabase.from("settings").select("*").limit(1).single(),
    ]);
    ships = (shipsRes.data as Ship[]) ?? [];
    staff = (staffRes.data as Staff[]) ?? [];
    if (settingsRes.data) settings = settingsRes.data as Settings;
  }

  return (
    <div>
      <PageHeader
        title={`${monthDef.name} ${year}`}
        subtitle="Monthly roster — ships, assignments, availability and outputs."
      />
      <MonthView
        monthValue={monthDef.value}
        year={year}
        initialShips={ships}
        staff={staff}
        settings={settings}
        configured={configured}
      />
    </div>
  );
}

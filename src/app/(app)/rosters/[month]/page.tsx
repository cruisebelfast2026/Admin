import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SEASON_MONTHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Ship } from "@/lib/types";
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
  if (supabase) {
    const { data } = await supabase
      .from("ships")
      .select("*")
      .eq("month", monthDef.value)
      .eq("year", year)
      .order("date", { ascending: true });
    ships = (data as Ship[]) ?? [];
  }

  return (
    <div>
      <PageHeader
        title={`${monthDef.name} ${year}`}
        subtitle="Monthly roster — ships, assignments, availability and outputs."
      />
      <MonthView ships={ships} />
    </div>
  );
}

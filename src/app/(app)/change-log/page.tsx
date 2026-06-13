import { readFile } from "node:fs/promises";
import path from "node:path";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { ChangeLogEntry } from "@/lib/types";
import { ChangeLogTabs } from "./ChangeLogTabs";

export const dynamic = "force-dynamic";

export default async function ChangeLogPage() {
  const supabase = await createClient();
  let entries: ChangeLogEntry[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("change_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    entries = (data as ChangeLogEntry[]) ?? [];
  }

  let changelog = "";
  try {
    changelog = await readFile(
      path.join(process.cwd(), "CHANGELOG.md"),
      "utf8",
    );
  } catch {
    changelog = "CHANGELOG.md not found.";
  }

  return (
    <div>
      <PageHeader
        title="Change Log"
        subtitle="Admin activity within the app, plus the developer code/deployment log."
      />
      <ChangeLogTabs entries={entries} changelog={changelog} />
    </div>
  );
}

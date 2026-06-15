import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { ChangeLogEntry } from "@/lib/types";
import { ChangeLogTabs } from "./ChangeLogTabs";

export const dynamic = "force-dynamic";

const CHANGELOG_RAW_URL =
  "https://raw.githubusercontent.com/cruisebelfast2026/Admin/main/CHANGELOG.md";

/**
 * Load CHANGELOG.md for the code/deployment log. The Cloudflare Workers runtime
 * has no real filesystem, so fetch it from the (public) repo there; fall back
 * to reading from disk for local dev.
 */
async function loadChangelog(): Promise<string> {
  // Local dev / Node runtime: read from disk.
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return await readFile(join(process.cwd(), "CHANGELOG.md"), "utf8");
  } catch {
    // ignore — fall through to fetch
  }
  // Production (Workers): fetch from GitHub raw, cached for an hour.
  try {
    const res = await fetch(CHANGELOG_RAW_URL, { next: { revalidate: 3600 } });
    if (res.ok) return await res.text();
  } catch {
    // ignore
  }
  return "Code/deployment log is published in CHANGELOG.md in the repository.";
}

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

  const changelog = await loadChangelog();

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

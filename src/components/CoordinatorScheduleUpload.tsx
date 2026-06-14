"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { readTabularFile } from "@/lib/parse-file";
import { parseCoordinatorRows, resolveCoordinator } from "@/lib/parse-coordinator";
import { logChange } from "@/lib/changelog";
import type { Staff } from "@/lib/types";

export function CoordinatorScheduleUpload({ staff }: { staff: Staff[] }) {
  const coordinators = staff.filter((s) => s.is_coordinator);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configured] = useState(() => isSupabaseConfigured());
  const fileRef = useRef<HTMLInputElement>(null);

  const [existing, setExisting] = useState(0);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("coordinator_schedule")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setExisting(count ?? 0));
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCount(null);
    setBusy(true);
    try {
      const res = await readTabularFile(file);
      if (res.needsManual || res.rows.length === 0) {
        setError("Couldn't read rows from this file. Upload Excel/CSV with date and coordinator columns.");
        return;
      }
      const parsed = parseCoordinatorRows(res.rows);
      const resolved = parsed.map((r) => ({
        year: Number(r.date.slice(0, 4)),
        date: r.date,
        coordinator_initial: r.initial,
        staff_id: resolveCoordinator(r.initial, coordinators),
      }));
      const matched = resolved.filter((r) => r.staff_id);

      const supabase = createClient();
      if (supabase) {
        // Replace the on-duty schedule for the affected dates.
        const dates = resolved.map((r) => r.date);
        if (dates.length) await supabase.from("coordinator_schedule").delete().in("date", dates);
        if (resolved.length) await supabase.from("coordinator_schedule").insert(resolved);
        await logChange(supabase, {
          action_type: "coordinator_schedule_imported",
          entity_type: "coordinator_schedule",
          new_value: { count: resolved.length },
        });
        setExisting((p) => p + resolved.length);
      }
      setCount(matched.length);
      if (matched.length < resolved.length) {
        setError(`${resolved.length - matched.length} date(s) had an unmatched coordinator initial — check coordinators in Staff Setup.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="bg-vb-panel rounded-vb border border-vb-border p-5">
      <h2 className="font-heading font-semibold text-vb-navy mb-1">
        Coordinator Schedule Upload
      </h2>
      <p className="text-sm text-vb-muted mb-4">
        Upload a sheet of <strong>date</strong> + <strong>coordinator initial</strong>{" "}
        (e.g. <code>D</code> = Damien, <code>C</code> = Conor). Each rota&apos;s
        Coordinator row is auto-populated from this and stays overridable.
        {existing > 0 && (
          <span className="block mt-1 text-xs">{existing} dates currently scheduled.</span>
        )}
      </p>
      {!configured ? (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-vb px-3 py-2">
          Configure Supabase to store the coordinator schedule.
        </p>
      ) : (
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          disabled={busy}
          onChange={onFile}
          className="block text-sm file:mr-3 file:rounded-vb file:border-0 file:bg-vb-navy file:text-white file:px-4 file:py-2 file:font-semibold file:cursor-pointer"
        />
      )}
      {count != null && (
        <p className="text-sm text-vb-teal-dark font-semibold mt-3">
          Imported {count} coordinator on-duty dates.
        </p>
      )}
      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-vb px-3 py-2 mt-3">{error}</p>
      )}
    </section>
  );
}

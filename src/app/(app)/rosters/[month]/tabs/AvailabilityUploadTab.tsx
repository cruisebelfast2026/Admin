"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { readSheetMatrix } from "@/lib/parse-file";
import { parseAvailabilityMatrix, type ParsedAvailability } from "@/lib/parse-availability";
import { logChange } from "@/lib/changelog";
import type { MonthContext } from "../MonthView";

export function AvailabilityUploadTab({ ctx }: { ctx: MonthContext }) {
  const [parsed, setParsed] = useState<ParsedAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setParsed(null);
    try {
      const matrix = await readSheetMatrix(file);
      const result = parseAvailabilityMatrix(matrix);
      if (result.cells.length === 0) {
        const isPdf = file.name.toLowerCase().endsWith(".pdf");
        setError(
          isPdf
            ? "Couldn't extract availability from this PDF (it may be scanned). Upload Excel/CSV instead."
            : "No availability markers (AM/PM/EV) were found in this sheet.",
        );
        return;
      }
      setParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file.");
    }
  }

  // Match parsed names/dates to staff + ships in this month.
  const staffByName = new Map(
    ctx.staff.map((s) => [s.display_name.toLowerCase(), s.id]),
  );
  const shipByKey = new Map(ctx.ships.map((s) => [s.date, s.id]));

  const resolved = (parsed?.cells ?? []).map((c) => ({
    ...c,
    staffId: staffByName.get(c.staffName.toLowerCase()) ?? null,
    shipId: c.date ? shipByKey.get(c.date) ?? null : null,
  }));
  const matched = resolved.filter((r) => r.staffId && r.shipId);
  const unmatchedNames = Array.from(
    new Set(resolved.filter((r) => !r.staffId).map((r) => r.staffName)),
  );

  async function doImport() {
    setBusy(true);
    const supabase = createClient();
    if (supabase) {
      const shipIds = ctx.ships.map((s) => s.id);
      if (shipIds.length)
        await supabase.from("availability").delete().in("ship_id", shipIds);
      const rows = matched.map((r) => ({
        staff_id: r.staffId,
        ship_id: r.shipId,
        period: r.period,
      }));
      if (rows.length) await supabase.from("availability").insert(rows);
      await logChange(supabase, {
        action_type: "availability_imported",
        entity_type: "availability",
        new_value: { month: ctx.monthValue, count: rows.length },
      });
    }
    setBusy(false);
    setConfirmOpen(false);
    setParsed(null);
    ctx.toast(`Imported ${matched.length} availability entries — month replaced`);
  }

  return (
    <div className="space-y-5">
      <div className="bg-vb-panel rounded-vb border border-vb-border p-5">
        <h3 className="font-heading font-semibold text-vb-navy mb-1">
          Staff Availability Upload
        </h3>
        <p className="text-sm text-vb-muted mb-4">
          Upload the monthly availability sheet (Excel/CSV). Staff names across
          the top, ship rows down the side, cells marked AM / PM / EV.
          Re-uploading <strong>replaces</strong> all availability for this month.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          onChange={onFile}
          className="block text-sm file:mr-3 file:rounded-vb file:border-0 file:bg-vb-navy file:text-white file:px-4 file:py-2 file:font-semibold file:cursor-pointer"
        />
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-vb px-3 py-2 mt-3">{error}</p>
        )}
      </div>

      {parsed && (
        <div className="bg-vb-panel rounded-vb border border-vb-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              {matched.length} entries matched · {parsed.staffNames.length} staff columns
            </h4>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy || matched.length === 0}
              className="bg-vb-teal hover:bg-vb-teal-dark text-white text-sm font-semibold rounded-vb px-4 py-2 disabled:opacity-60"
            >
              Import &amp; replace month
            </button>
          </div>
          {unmatchedNames.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-vb px-3 py-2 mb-3">
              ⚠ Names not found in Staff Setup (skipped): {unmatchedNames.join(", ")}.
              Check the display names match.
            </p>
          )}
          {ctx.ships.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-vb px-3 py-2 mb-3">
              ⚠ No ships imported for this month yet — entries can&apos;t be linked
              to ship dates. Import the schedule first.
            </p>
          )}
          <p className="text-xs text-vb-muted">
            Entries are matched by staff display name and ship date.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Replace month availability?"
        message={`This deletes all existing availability for this month and imports ${matched.length} entries.`}
        confirmLabel="Replace"
        destructive
        onConfirm={doImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

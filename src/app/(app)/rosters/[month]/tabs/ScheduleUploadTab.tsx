"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readTabularFile } from "@/lib/parse-file";
import { parseScheduleRows, type ParsedShipRow } from "@/lib/parse-schedule";
import { importSchedule } from "@/lib/ships-store";
import { ConfirmDialog } from "@/components/ui";
import type { MonthContext } from "../MonthView";

export function ScheduleUploadTab({ ctx }: { ctx: MonthContext }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedShipRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPdfNotice(false);
    setParsed(null);
    setFileName(file.name);
    try {
      const res = await readTabularFile(file);
      if (res.format === "pdf" || res.needsManual) {
        setPdfNotice(true);
        return;
      }
      const rows = parseScheduleRows(res.rows);
      if (rows.length === 0) {
        setError("No rows could be read from this file.");
        return;
      }
      setParsed(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file.");
    }
  }

  async function doImport() {
    if (!parsed) return;
    setBusy(true);
    const supabase = createClient();
    const ships = await importSchedule(supabase, parsed, ctx.year, ctx.monthValue);
    ctx.setShips(() => ships);
    setBusy(false);
    setConfirmOpen(false);
    setParsed(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
    ctx.toast(`Imported ${ships.length} ships — schedule replaced`);
  }

  const warnCount = parsed?.filter((r) => r._warnings.length > 0).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="bg-vb-panel rounded-vb border border-vb-border p-5">
        <h3 className="font-heading font-semibold text-vb-navy mb-1">
          Schedule Upload
        </h3>
        <p className="text-sm text-vb-muted mb-4">
          Upload an Excel (.xlsx), CSV or PDF schedule. Columns are matched
          tolerantly (Day, Date, Arrival, Departure, Cruise Line, Ship, Capacity,
          Dock). Re-uploading <strong>replaces</strong> all ships for this month.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          onChange={onFile}
          className="block text-sm file:mr-3 file:rounded-vb file:border-0 file:bg-vb-navy file:text-white file:px-4 file:py-2 file:font-semibold file:cursor-pointer"
        />
        {fileName && <p className="text-xs text-vb-muted mt-2">Selected: {fileName}</p>}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-vb px-3 py-2 mt-3">{error}</p>
        )}
        {pdfNotice && (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-vb px-3 py-2 mt-3">
            PDF received. Automatic table extraction from PDF isn&apos;t reliable
            in the browser — add ships manually in the Rosters tab, or upload the
            same schedule as Excel/CSV. (Unrecognised fields are always flagged
            for manual correction.)
          </p>
        )}
      </div>

      {parsed && (
        <div className="bg-vb-panel rounded-vb border border-vb-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-vb-border">
            <h4 className="font-semibold text-sm">
              Preview — {parsed.length} ships
              {warnCount > 0 && (
                <span className="text-amber-700 font-normal ml-2">
                  ({warnCount} need review)
                </span>
              )}
            </h4>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              className="bg-vb-teal hover:bg-vb-teal-dark text-white text-sm font-semibold rounded-vb px-4 py-2 disabled:opacity-60"
            >
              Import &amp; replace month
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-vb-muted border-b border-vb-border">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Ship</th>
                  <th className="px-3 py-2">Arr</th>
                  <th className="px-3 py-2">Dep</th>
                  <th className="px-3 py-2">Dock</th>
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2">Capacity</th>
                  <th className="px-3 py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} className="border-b border-vb-border last:border-0">
                    <td className="px-3 py-2">{r.date ?? "—"}</td>
                    <td className="px-3 py-2 font-semibold">{r.ship_name ?? "—"}</td>
                    <td className="px-3 py-2">{r.arrival_time ?? "—"}</td>
                    <td className="px-3 py-2">{r.departure_time ?? "—"}</td>
                    <td className="px-3 py-2">{r.dock ?? "—"}</td>
                    <td className="px-3 py-2">{r.cruise_line ?? "—"}</td>
                    <td className="px-3 py-2">{r.capacity?.toLocaleString() ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r._warnings.length > 0 ? (
                        <span className="text-[11px] text-amber-700" title={r._warnings.join("; ")}>
                          ⚠ {r._warnings.length}
                        </span>
                      ) : (
                        <span className="text-green-600 text-[11px]">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Replace month schedule?"
        message={`This will delete all existing ships for this month and import ${
          parsed?.length ?? 0
        } new ships. This cannot be undone.`}
        confirmLabel="Replace"
        destructive
        onConfirm={doImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

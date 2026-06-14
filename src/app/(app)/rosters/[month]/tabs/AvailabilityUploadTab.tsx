"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readSheetMatrix } from "@/lib/parse-file";
import {
  parseStaffAvailabilityMatrix,
  parseStaffAvailabilityPdf,
} from "@/lib/parse-staff-availability";
import { logChange } from "@/lib/changelog";
import type { Staff } from "@/lib/types";
import type { MonthContext } from "../MonthView";

interface Result {
  busy?: boolean;
  count?: number;
  unmatched?: number;
  error?: string;
  fileName?: string;
}

function normShip(n: unknown): string {
  return String(n ?? "")
    .toUpperCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function AvailabilityUploadTab({ ctx }: { ctx: MonthContext }) {
  // Volunteers have no availability sheet (brief §6.4) — list everyone else.
  const staff = ctx.staff.filter(
    (s) => s.is_ambassador || s.is_coordinator || s.is_travel_advisor,
  );
  const [results, setResults] = useState<Record<string, Result>>({});

  // Ship lookup by date + name (fallback to date when only one ship that day).
  const { byDateName, byDate, shipIds } = useMemo(() => {
    const byDateName = new Map<string, string>();
    const byDate = new Map<string, string[]>();
    for (const s of ctx.ships) {
      byDateName.set(`${s.date}|${normShip(s.ship_name)}`, s.id);
      const list = byDate.get(s.date) ?? [];
      list.push(s.id);
      byDate.set(s.date, list);
    }
    return { byDateName, byDate, shipIds: ctx.ships.map((s) => s.id) };
  }, [ctx.ships]);

  // Existing per-staff counts for the month.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase || shipIds.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("availability")
        .select("staff_id")
        .in("ship_id", shipIds);
      const counts: Record<string, Result> = {};
      for (const r of (data as { staff_id: string }[]) ?? []) {
        counts[r.staff_id] = { count: (counts[r.staff_id]?.count ?? 0) + 1 };
      }
      setResults((prev) => ({ ...counts, ...prev }));
    })();
  }, [shipIds]);

  function matchShip(date: string, shipName: string | null): string | null {
    const byKey = byDateName.get(`${date}|${normShip(shipName)}`);
    if (byKey) return byKey;
    const ids = byDate.get(date);
    return ids && ids.length === 1 ? ids[0] : null;
  }

  async function onFile(staffMember: Staff, file: File) {
    setResults((p) => ({ ...p, [staffMember.id]: { busy: true, fileName: file.name } }));
    try {
      const rows = file.name.toLowerCase().endsWith(".pdf")
        ? await parseStaffAvailabilityPdf(file)
        : parseStaffAvailabilityMatrix(await readSheetMatrix(file));

      if (rows.length === 0) {
        setResults((p) => ({
          ...p,
          [staffMember.id]: {
            error: "No AM/PM/EV availability found in this file.",
            fileName: file.name,
          },
        }));
        return;
      }

      const entries = rows
        .map((r) => ({ staff_id: staffMember.id, ship_id: matchShip(r.date, r.shipName), period: r.period }))
        .filter((e): e is { staff_id: string; ship_id: string; period: string } => Boolean(e.ship_id));
      const unmatched = rows.length - entries.length;

      const supabase = createClient();
      if (supabase && shipIds.length) {
        // Replace just this person's availability for the month.
        await supabase
          .from("availability")
          .delete()
          .eq("staff_id", staffMember.id)
          .in("ship_id", shipIds);
        if (entries.length) await supabase.from("availability").insert(entries);
        await logChange(supabase, {
          action_type: "availability_uploaded",
          entity_type: "availability",
          entity_id: staffMember.id,
          new_value: { staff: staffMember.display_name, count: entries.length },
        });
        ctx.bumpSync();
      }

      setResults((p) => ({
        ...p,
        [staffMember.id]: { count: entries.length, unmatched, fileName: file.name },
      }));
      ctx.toast(`${staffMember.display_name}: ${entries.length} ships imported`);
    } catch (err) {
      setResults((p) => ({
        ...p,
        [staffMember.id]: {
          error: err instanceof Error ? err.message : "Could not read file.",
          fileName: file.name,
        },
      }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-vb-panel rounded-vb border border-vb-border p-5">
        <h3 className="font-heading font-semibold text-vb-navy mb-1">
          Staff Availability Upload
        </h3>
        <p className="text-sm text-vb-muted">
          Upload each person&apos;s own availability file beside their name —
          Excel (.xlsx), CSV or PDF. Each file uses the CWA template (Day, Date,
          In-Port Times, Company, Ship, AM, PM, EV). Marks like{" "}
          <code>x</code>, <code>Free</code> or <code>yes</code> count as available;
          blank or <code>NA</code> as not. A new upload <strong>replaces</strong>{" "}
          that person&apos;s availability for this month.
        </p>
        {ctx.ships.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-vb px-3 py-2 mt-3">
            ⚠ No ships imported for this month yet — upload the schedule first so
            availability can be matched to ship dates.
          </p>
        )}
      </div>

      <div className="bg-vb-panel rounded-vb border border-vb-border overflow-hidden">
        {staff.length === 0 ? (
          <p className="text-sm text-vb-muted px-4 py-6 text-center">
            No staff yet — add Ambassadors / Travel Advisors / Coordinators in
            Staff Setup.
          </p>
        ) : (
          <ul className="divide-y divide-vb-border">
            {staff.map((s) => {
              const r = results[s.id] ?? {};
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-semibold text-sm w-40">{s.display_name}</span>
                  <UploadButton staff={s} onFile={onFile} busy={r.busy} />
                  <span className="text-xs flex-1">
                    {r.busy ? (
                      <span className="text-vb-muted">Reading {r.fileName}…</span>
                    ) : r.error ? (
                      <span className="text-red-600">{r.error}</span>
                    ) : r.count != null ? (
                      <span className="text-green-700 font-semibold">
                        {r.count} ships
                        {r.unmatched ? (
                          <span className="text-amber-700 font-normal">
                            {" "}· {r.unmatched} unmatched
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-vb-muted">No availability uploaded</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function UploadButton({
  staff,
  onFile,
  busy,
}: {
  staff: Staff;
  onFile: (s: Staff, f: File) => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="bg-vb-navy hover:bg-vb-navy-dark text-white text-xs font-semibold rounded-vb px-3 py-1.5 disabled:opacity-60"
      >
        Choose file
      </button>
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(staff, f);
          e.target.value = "";
        }}
      />
    </>
  );
}

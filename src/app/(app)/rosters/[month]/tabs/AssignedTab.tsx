"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { availabilityCoversShift, periodsForStart } from "@/lib/rota-calc";
import type { Shift, Ship, Staff } from "@/lib/types";
import type { MonthContext } from "../MonthView";

const ROLE_FILTER: Record<string, (s: Staff) => boolean> = {
  ambassador: (s) => s.is_ambassador,
  travel_advisor: (s) => s.is_travel_advisor,
  coordinator: (s) => s.is_coordinator,
  volunteer: (s) => s.is_volunteer,
};

type StatusKey = "info_received" | "rota_sent" | "volunteers_sent" | "confirmed";
const STATUS_COLS: { key: StatusKey; label: string }[] = [
  { key: "info_received", label: "Info" },
  { key: "rota_sent", label: "Sent" },
  { key: "volunteers_sent", label: "Vols" },
  { key: "confirmed", label: "Conf" },
];

// Frozen Date + Ship columns (Ship offset = Date column width).
const FROZEN_DATE = "sticky left-0 z-10 bg-vb-panel w-[92px]";
const FROZEN_SHIP = "sticky left-[92px] z-10 bg-vb-panel border-r border-vb-border";

/** Shorten a full AM+PM+EV availability to "ALL". */
function shortPeriod(p?: string): string {
  return p === "AM+PM+EV" ? "ALL" : (p ?? "");
}

export function AssignedTab({ ctx }: { ctx: MonthContext }) {
  // availability: shipId -> staffId -> period
  const [availability, setAvailability] = useState<Record<string, Record<string, string>>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || ctx.ships.length === 0) return;
    const ids = ctx.ships.map((s) => s.id);
    (async () => {
      const [av, sh] = await Promise.all([
        supabase.from("availability").select("ship_id, staff_id, period").in("ship_id", ids),
        supabase.from("shifts").select("*").in("ship_id", ids),
      ]);
      if (av.data) {
        const map: Record<string, Record<string, string>> = {};
        for (const a of av.data as { ship_id: string; staff_id: string; period: string }[]) {
          (map[a.ship_id] ??= {})[a.staff_id] = a.period;
        }
        setAvailability(map);
      }
      if (sh.data) setShifts(sh.data as Shift[]);
    })();
  }, [ctx.ships, ctx.syncVersion]);

  // Staff columns: everyone except volunteer-only (Section 10.3).
  const staffCols = ctx.staff.filter((s) => !onlyVolunteer(s));

  // assignment lookup: shipId -> staffId -> {assigned, confirmed}
  const assignment = useMemo(() => {
    const map: Record<string, Record<string, { confirmed: boolean }>> = {};
    for (const sh of shifts) {
      if (!sh.assigned_staff_id) continue;
      (map[sh.ship_id] ??= {})[sh.assigned_staff_id] = { confirmed: sh.confirmed };
    }
    return map;
  }, [shifts]);

  // cross-ship same-day same-period conflicts: staffId -> set of "date|period"
  const conflicts = useMemo(() => {
    const seen: Record<string, Record<string, number>> = {};
    const shipById = new Map(ctx.ships.map((s) => [s.id, s] as const));
    for (const sh of shifts) {
      if (!sh.assigned_staff_id || !sh.start_time) continue;
      const ship = shipById.get(sh.ship_id);
      if (!ship) continue;
      for (const p of periodsForStart(sh.start_time)) {
        const key = `${ship.date}|${p}`;
        ((seen[sh.assigned_staff_id] ??= {})[key] ??= 0);
        seen[sh.assigned_staff_id][key]++;
      }
    }
    return seen;
  }, [shifts, ctx.ships]);

  function hasConflict(staffId: string, ship: Ship): boolean {
    const av = availability[ship.id]?.[staffId];
    const periods = av ? av.split("+") : [];
    return periods.some((p) => (conflicts[staffId]?.[`${ship.date}|${p}`] ?? 0) > 1);
  }

  // per-column stats
  const stats = useMemo(() => {
    const out: Record<string, { assigned: number; available: number }> = {};
    for (const st of staffCols) {
      let assigned = 0;
      let available = 0;
      for (const ship of ctx.ships) {
        if (availability[ship.id]?.[st.id]) available++;
        if (assignment[ship.id]?.[st.id]) assigned++;
      }
      out[st.id] = { assigned, available };
    }
    return out;
  }, [staffCols, ctx.ships, availability, assignment]);

  // 10.6 — low-staffing estimate: required ambassador/TA shifts per ship vs the
  // number of staff who've indicated availability for that ship.
  const required = useMemo(() => {
    const out: Record<string, number> = {};
    for (const sh of shifts) {
      if (sh.role_type === "ambassador" || sh.role_type === "travel_advisor")
        out[sh.ship_id] = (out[sh.ship_id] ?? 0) + 1;
    }
    return out;
  }, [shifts]);

  function isLowStaffed(ship: Ship): boolean {
    const req = required[ship.id] ?? 0;
    if (req === 0) return false;
    const avail = staffCols.filter((st) => availability[ship.id]?.[st.id]).length;
    return avail < req;
  }

  // 10.4 — assign a specific shift from the expanded row (two-way sync w/ rota).
  async function assignShift(shift: Shift, staffId: string | null) {
    setShifts((p) =>
      p.map((s) => (s.id === shift.id ? { ...s, assigned_staff_id: staffId, confirmed: false } : s)),
    );
    const supabase = createClient();
    if (supabase) {
      await supabase
        .from("shifts")
        .update({ assigned_staff_id: staffId, confirmed: false })
        .eq("id", shift.id);
      ctx.bumpSync();
    }
  }

  function eligibleFor(shift: Shift): Staff[] {
    const roleOk = ROLE_FILTER[shift.role_type] ?? (() => true);
    return ctx.staff.filter((s) => {
      if (!roleOk(s)) return false;
      const avail = availability[shift.ship_id]?.[s.id];
      if (!avail || !shift.start_time) return true;
      return availabilityCoversShift(avail, shift.start_time);
    });
  }

  async function toggleStatus(ship: Ship, key: StatusKey) {
    await ctx.patchShip(ship, { [key]: !ship[key] } as Partial<Ship>);
  }
  async function toggleConfirm(ship: Ship, staffId: string) {
    const supabase = createClient();
    const current = assignment[ship.id]?.[staffId];
    if (!current) return;
    const next = !current.confirmed;
    setShifts((p) =>
      p.map((s) =>
        s.ship_id === ship.id && s.assigned_staff_id === staffId
          ? { ...s, confirmed: next }
          : s,
      ),
    );
    if (supabase) {
      await supabase
        .from("shifts")
        .update({ confirmed: next })
        .eq("ship_id", ship.id)
        .eq("assigned_staff_id", staffId);
      ctx.bumpSync();
    }
  }

  if (ctx.ships.length === 0) {
    return (
      <div className="bg-vb-panel rounded-vb border border-vb-border p-8 text-center">
        <p className="text-sm text-vb-muted">No ships this month yet.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-vb-muted mb-3">
        Cells: availability period · <span className="bg-yellow-200 px-1 rounded">yellow</span> assigned ·{" "}
        <span className="bg-green-200 px-1 rounded">green</span> confirmed (click to toggle) ·{" "}
        <span className="text-amber-700 font-semibold">amber border</span> cross-ship same-day conflict ·{" "}
        <strong>ALL</strong> = AM+PM+EV.
      </p>
      <div className="bg-vb-panel rounded-vb border border-vb-border overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="border-b border-vb-border">
              <th className={`px-1 py-2 ${FROZEN_DATE} text-left font-semibold`}>Date</th>
              <th className={`px-1 py-2 ${FROZEN_SHIP} text-left font-semibold`}>Ship</th>
              {STATUS_COLS.map((c) => (
                <th key={c.key} className="px-1 py-2 font-semibold whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-1 py-2 font-semibold whitespace-nowrap">Shifts</th>
              {staffCols.map((st) => (
                <th key={st.id} className="px-1 py-2 font-semibold align-bottom max-w-[64px]">
                  <div className="truncate text-[11px]" title={st.display_name}>{st.display_name}</div>
                  <div className="text-[9px] text-vb-muted font-normal">
                    {stats[st.id]?.assigned ?? 0}/{stats[st.id]?.available ?? 0}
                    {stats[st.id]?.available
                      ? ` · ${Math.round((stats[st.id].assigned / stats[st.id].available) * 100)}%`
                      : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ctx.ships.map((ship) => {
              const assignedCount = staffCols.filter((st) => assignment[ship.id]?.[st.id]).length;
              const availCount = staffCols.filter((st) => availability[ship.id]?.[st.id]).length;
              const shipShifts = shifts
                .filter((s) => s.ship_id === ship.id && s.role_type !== "volunteer")
                .sort((a, b) => a.role_type.localeCompare(b.role_type) || a.shift_number - b.shift_number);
              const isOpen = expanded === ship.id;
              return (
                <Fragment key={ship.id}>
                <tr className="border-b border-vb-border last:border-0">
                  <td className={`px-1 py-1.5 ${FROZEN_DATE} font-semibold whitespace-nowrap`}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : ship.id)}
                      className="mr-1 text-vb-muted"
                      title="Expand shifts"
                    >
                      {isOpen ? "▾" : "▸"}
                    </button>
                    {new Date(ship.date + "T00:00:00").toLocaleDateString("en-GB")}
                  </td>
                  <td className={`px-1 py-1.5 ${FROZEN_SHIP} font-semibold whitespace-nowrap`}>
                    {ship.ship_name}
                    {isLowStaffed(ship) && (
                      <span
                        className="ml-1 text-[9px] font-semibold text-amber-700 bg-amber-100 rounded px-1"
                        title="Available staff may be insufficient to cover required shifts"
                      >
                        Low
                      </span>
                    )}
                  </td>
                  {STATUS_COLS.map((c) => (
                    <td key={c.key} className="px-1 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(ship[c.key])}
                        onChange={() => toggleStatus(ship, c.key)}
                        className="accent-vb-teal w-3.5 h-3.5"
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1.5 text-center text-vb-muted whitespace-nowrap">
                    {assignedCount}/{availCount}
                  </td>
                  {staffCols.map((st) => {
                    const av = availability[ship.id]?.[st.id];
                    const asg = assignment[ship.id]?.[st.id];
                    const conflict = asg && hasConflict(st.id, ship);
                    let bg = "";
                    if (asg?.confirmed) bg = "bg-green-200";
                    else if (asg) bg = "bg-yellow-200";
                    else if (av) bg = "bg-vb-teal-tint";
                    return (
                      <td
                        key={st.id}
                        onClick={() => asg && toggleConfirm(ship, st.id)}
                        className={`px-1 py-1.5 text-center text-[11px] ${bg} ${
                          conflict ? "border-2 border-amber-500" : ""
                        } ${asg ? "cursor-pointer" : ""}`}
                        title={conflict ? "Conflict: same day/period on another ship" : ""}
                      >
                        {shortPeriod(av)}
                      </td>
                    );
                  })}
                </tr>
                {isOpen && (
                  <tr className="bg-vb-bg">
                    <td colSpan={7 + staffCols.length} className="px-4 py-2">
                      {shipShifts.length === 0 ? (
                        <p className="text-xs text-vb-muted">No shifts generated yet — open the rota to create them.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {shipShifts.map((sh) => (
                            <div key={sh.id} className="flex items-center gap-2 text-xs">
                              <span className="w-28 font-semibold capitalize">{sh.role_type.replace("_", " ")}</span>
                              <span className="w-24 text-vb-muted">
                                {sh.start_time?.slice(0, 5) ?? "—"}{sh.end_time ? `–${sh.end_time.slice(0, 5)}` : ""}
                              </span>
                              <span className="w-16 text-vb-muted">{sh.location ?? ""}</span>
                              <select
                                value={sh.assigned_staff_id ?? ""}
                                onChange={(e) => assignShift(sh, e.target.value || null)}
                                className="border border-vb-border rounded px-2 py-1 text-xs min-w-[160px]"
                              >
                                <option value="">— unassigned —</option>
                                {eligibleFor(sh).map((s) => (
                                  <option key={s.id} value={s.id}>{s.display_name}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function onlyVolunteer(s: { is_volunteer: boolean; is_ambassador: boolean; is_coordinator: boolean; is_travel_advisor: boolean }) {
  return s.is_volunteer && !s.is_ambassador && !s.is_coordinator && !s.is_travel_advisor;
}

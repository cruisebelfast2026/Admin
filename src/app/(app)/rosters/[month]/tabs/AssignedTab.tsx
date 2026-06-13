"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { periodsForStart } from "@/lib/rota-calc";
import type { Shift, Ship } from "@/lib/types";
import type { MonthContext } from "../MonthView";

type StatusKey = "info_received" | "rota_sent" | "volunteers_sent" | "confirmed";
const STATUS_COLS: { key: StatusKey; label: string }[] = [
  { key: "info_received", label: "Info" },
  { key: "rota_sent", label: "Rota Sent" },
  { key: "volunteers_sent", label: "Vols Sent" },
  { key: "confirmed", label: "Confirmed" },
];

export function AssignedTab({ ctx }: { ctx: MonthContext }) {
  // availability: shipId -> staffId -> period
  const [availability, setAvailability] = useState<Record<string, Record<string, string>>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);

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
  }, [ctx.ships]);

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
    if (supabase)
      await supabase
        .from("shifts")
        .update({ confirmed: next })
        .eq("ship_id", ship.id)
        .eq("assigned_staff_id", staffId);
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
        <span className="text-amber-700 font-semibold">amber border</span> cross-ship same-day conflict.
      </p>
      <div className="bg-vb-panel rounded-vb border border-vb-border overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="border-b border-vb-border">
              <th className="px-2 py-2 sticky-col text-left font-semibold">Date</th>
              <th className="px-2 py-2 text-left font-semibold">Ship</th>
              {STATUS_COLS.map((c) => (
                <th key={c.key} className="px-2 py-2 font-semibold whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-2 py-2 font-semibold whitespace-nowrap">Shifts</th>
              {staffCols.map((st) => (
                <th key={st.id} className="px-2 py-2 font-semibold whitespace-nowrap align-bottom">
                  <div className="rotate-0">{st.display_name}</div>
                  <div className="text-[10px] text-vb-muted font-normal">
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
              return (
                <tr key={ship.id} className="border-b border-vb-border last:border-0">
                  <td className="px-2 py-1.5 sticky-col font-semibold whitespace-nowrap">
                    {new Date(ship.date + "T00:00:00").toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-2 py-1.5 font-semibold whitespace-nowrap">{ship.ship_name}</td>
                  {STATUS_COLS.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(ship[c.key])}
                        onChange={() => toggleStatus(ship, c.key)}
                        className="accent-vb-teal w-3.5 h-3.5"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center text-vb-muted whitespace-nowrap">
                    {assignedCount}/{availCount}
                    {availCount ? ` (${Math.round((assignedCount / availCount) * 100)}%)` : ""}
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
                        className={`px-2 py-1.5 text-center ${bg} ${
                          conflict ? "border-2 border-amber-500" : ""
                        } ${asg ? "cursor-pointer" : ""}`}
                        title={conflict ? "Conflict: same day/period on another ship" : ""}
                      >
                        {av ?? ""}
                      </td>
                    );
                  })}
                </tr>
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

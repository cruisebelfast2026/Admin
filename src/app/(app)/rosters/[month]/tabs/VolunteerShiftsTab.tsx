"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Shift } from "@/lib/types";
import type { MonthContext } from "../MonthView";

/** shipId -> [slot0, slot1, slot2] of assigned staff ids (or null). */
type SlotMap = Record<string, (string | null)[]>;

export function VolunteerShiftsTab({ ctx }: { ctx: MonthContext }) {
  const [slots, setSlots] = useState<SlotMap>({});
  const volunteers = ctx.staff.filter((s) => s.is_volunteer);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || ctx.ships.length === 0) return;
    const ids = ctx.ships.map((s) => s.id);
    (async () => {
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("role_type", "volunteer")
        .in("ship_id", ids);
      const map: SlotMap = {};
      for (const sh of (data as Shift[]) ?? []) {
        const arr = (map[sh.ship_id] ??= [null, null, null]);
        const idx = Math.min(2, Math.max(0, (sh.shift_number ?? 1) - 1));
        arr[idx] = sh.assigned_staff_id;
      }
      setSlots(map);
    })();
  }, [ctx.ships, ctx.syncVersion]);

  async function setSlot(shipId: string, idx: number, staffId: string | null) {
    setSlots((p) => {
      const arr = [...(p[shipId] ?? [null, null, null])];
      arr[idx] = staffId;
      return { ...p, [shipId]: arr };
    });
    const supabase = createClient();
    if (!supabase) return;
    const shipShifts = ctx.ships.find((s) => s.id === shipId);
    const firstAmb = await supabase
      .from("shifts")
      .select("start_time")
      .eq("ship_id", shipId)
      .eq("role_type", "ambassador")
      .order("shift_number")
      .limit(1)
      .maybeSingle();
    const startTime = firstAmb.data?.start_time ?? shipShifts?.arrival_time ?? null;

    // Upsert this volunteer slot as shift_number = idx+1.
    await supabase
      .from("shifts")
      .delete()
      .eq("ship_id", shipId)
      .eq("role_type", "volunteer")
      .eq("shift_number", idx + 1);
    if (staffId) {
      await supabase.from("shifts").insert({
        ship_id: shipId,
        role_type: "volunteer",
        shift_number: idx + 1,
        start_time: startTime,
        end_time: null,
        location: shipShifts?.dock ?? null,
        assigned_staff_id: staffId,
      });
    }
    ctx.bumpSync();
    ctx.toast("Volunteer updated");
  }

  if (ctx.ships.length === 0) {
    return (
      <div className="bg-vb-panel rounded-vb border border-vb-border p-8 text-center">
        <p className="text-sm text-vb-muted">No ships this month yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-vb-panel rounded-vb border border-vb-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-vb-muted border-b border-vb-border">
            <th className="px-3 py-2 sticky-col">Date</th>
            <th className="px-3 py-2">Ship</th>
            <th className="px-3 py-2">Dock</th>
            <th className="px-3 py-2">Volunteer 1</th>
            <th className="px-3 py-2">Volunteer 2</th>
            <th className="px-3 py-2">Volunteer 3</th>
          </tr>
        </thead>
        <tbody>
          {ctx.ships.map((ship) => {
            const arr = slots[ship.id] ?? [null, null, null];
            return (
              <tr key={ship.id} className="border-b border-vb-border last:border-0">
                <td className="px-3 py-2 sticky-col font-semibold whitespace-nowrap">
                  {new Date(ship.date + "T00:00:00").toLocaleDateString("en-GB")}
                </td>
                <td className="px-3 py-2 font-semibold">{ship.ship_name}</td>
                <td className="px-3 py-2">{ship.dock ?? "—"}</td>
                {[0, 1, 2].map((idx) => (
                  <td key={idx} className="px-3 py-2">
                    <select
                      value={arr[idx] ?? ""}
                      onChange={(e) => setSlot(ship.id, idx, e.target.value || null)}
                      className="border border-vb-border rounded px-2 py-1 text-sm min-w-[120px]"
                    >
                      <option value="">—</option>
                      {volunteers.map((v) => (
                        <option key={v.id} value={v.id}>{v.display_name}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

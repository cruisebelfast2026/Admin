"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logChange } from "@/lib/changelog";
import { nullEmpty } from "@/lib/sanitize";
import type { ShipRequest } from "@/lib/types";
import type { MonthContext } from "../MonthView";

type ReqDraft = Partial<ShipRequest>;

export function ShipRequestsTab({ ctx }: { ctx: MonthContext }) {
  const [requests, setRequests] = useState<Record<string, ReqDraft>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || ctx.ships.length === 0) return;
    const ids = ctx.ships.map((s) => s.id);
    (async () => {
      const { data } = await supabase.from("ship_requests").select("*").in("ship_id", ids);
      const map: Record<string, ReqDraft> = {};
      for (const r of (data as ShipRequest[]) ?? []) map[r.ship_id] = r;
      setRequests(map);
    })();
  }, [ctx.ships]);

  function update(shipId: string, patch: ReqDraft) {
    setRequests((p) => ({ ...p, [shipId]: { ...p[shipId], ...patch } }));
  }

  async function save(shipId: string) {
    const supabase = createClient();
    const draft = requests[shipId] ?? {};
    if (supabase) {
      // Strip server-managed columns and coerce empty time strings to null.
      const { id: _id, updated_at: _u, ...rest } = draft;
      const payload = nullEmpty({ ...rest, ship_id: shipId }, [
        "requested_start_time",
        "requested_end_time",
      ]);
      await supabase
        .from("ship_requests")
        .upsert(payload, { onConflict: "ship_id" });
      await logChange(supabase, {
        action_type: "ship_request_updated",
        entity_type: "ship_request",
        entity_id: shipId,
        new_value: payload,
      });
    }
    ctx.toast("Ship request saved");
    setOpenId(null);
  }

  if (ctx.ships.length === 0) {
    return (
      <div className="bg-vb-panel rounded-vb border border-vb-border p-8 text-center">
        <p className="text-sm text-vb-muted">No ships this month yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-vb-muted">
        A standalone record of what each cruise line requested. Changes here do
        not affect the operational rota.
      </p>
      {ctx.ships.map((ship) => {
        const r = requests[ship.id] ?? {};
        const open = openId === ship.id;
        return (
          <div key={ship.id} className="bg-vb-panel rounded-vb border border-vb-border">
            <button
              onClick={() => setOpenId(open ? null : ship.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-semibold text-sm">
                {ship.ship_name}
                <span className="text-vb-muted font-normal ml-2">
                  {new Date(ship.date + "T00:00:00").toLocaleDateString("en-GB")} · {ship.cruise_line ?? "—"}
                </span>
              </span>
              <span className="text-vb-muted text-sm">{open ? "−" : "+"}</span>
            </button>
            {open && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumF label="Ambassadors requested" value={r.ambassador_count ?? undefined}
                  onChange={(v) => update(ship.id, { ambassador_count: v })} />
                <Txt label="Requested locations" value={r.requested_locations ?? ""}
                  onChange={(v) => update(ship.id, { requested_locations: v })} />
                <Txt label="Requested start" value={r.requested_start_time ?? ""} type="time"
                  onChange={(v) => update(ship.id, { requested_start_time: v })} />
                <Txt label="Requested finish" value={r.requested_end_time ?? ""} type="time"
                  onChange={(v) => update(ship.id, { requested_end_time: v })} />
                <Txt label="Shuttle times requested" value={r.shuttle_times_requested ?? ""}
                  onChange={(v) => update(ship.id, { shuttle_times_requested: v })} />
                <Txt label="Agent / contact" value={r.agent_name ?? ""}
                  onChange={(v) => update(ship.id, { agent_name: v })} />
                <Txt label="Company" value={r.company ?? ""}
                  onChange={(v) => update(ship.id, { company: v })} />
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-vb-muted">Notes</span>
                  <textarea value={r.notes ?? ""} onChange={(e) => update(ship.id, { notes: e.target.value })}
                    className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5" rows={2} />
                </label>
                <div className="sm:col-span-2">
                  <button onClick={() => save(ship.id)}
                    className="bg-vb-navy hover:bg-vb-navy-dark text-white text-sm font-semibold rounded-vb px-4 py-2">
                    Save request
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Txt({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-vb-muted">{label}</span>
      <input type={type ?? "text"} step={type === "time" ? 900 : undefined}
        value={type === "time" ? value.slice(0, 5) : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5" />
    </label>
  );
}
function NumF({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-vb-muted">{label}</span>
      <input type="number" value={value ?? ""} min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5" />
    </label>
  );
}

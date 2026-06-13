"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { DOCKS, ROTA_STATUSES, type RotaStatus } from "@/lib/constants";
import { addShip, assignSeasonNumbers } from "@/lib/ships-store";
import type { Ship } from "@/lib/types";
import { RotaPanel } from "./RotaPanel";
import type { MonthContext } from "../MonthView";

const STATUS_ORDER: RotaStatus[] = [
  "draft_no_info",
  "draft_requirements",
  "complete_not_sent",
  "complete_sent",
  "complete_confirmed",
];

export function RostersTab({ ctx }: { ctx: MonthContext }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Ship>>({});
  const [deleteTarget, setDeleteTarget] = useState<Ship | null>(null);
  const [openShip, setOpenShip] = useState<Ship | null>(null);

  function startEdit(s: Ship) {
    setEditingId(s.id);
    setDraft({ ...s });
  }
  async function saveEdit(s: Ship) {
    await ctx.patchShip(s, draft);
    setEditingId(null);
    setDraft({});
    ctx.toast("Ship saved");
  }

  async function onAdd() {
    const supabase = createClient();
    const ship = await addShip(supabase, ctx.ships, ctx.year, ctx.monthValue);
    ctx.setShips((prev) => assignSeasonNumbers([...prev, ship]));
    startEdit(ship);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await ctx.removeShip(deleteTarget);
    ctx.toast("Ship deleted");
    setDeleteTarget(null);
  }

  async function setStatus(s: Ship, status: RotaStatus) {
    await ctx.patchShip(s, { rota_status: status });
    ctx.toast("Status updated");
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={onAdd}
          className="bg-vb-navy hover:bg-vb-navy-dark text-white text-sm font-semibold rounded-vb px-4 py-2"
        >
          + Add ship
        </button>
      </div>

      {ctx.ships.length === 0 ? (
        <div className="bg-vb-panel rounded-vb border border-vb-border p-8 text-center">
          <p className="text-sm text-vb-muted">
            No ships yet. Import a schedule from the <strong>Schedule Upload</strong>{" "}
            tab, or add one manually.
          </p>
        </div>
      ) : (
        <div className="bg-vb-panel rounded-vb border border-vb-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-vb-muted border-b border-vb-border">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2 sticky-col">Date</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Ship</th>
                <th className="px-3 py-2">Arr</th>
                <th className="px-3 py-2">Dep</th>
                <th className="px-3 py-2">Dock</th>
                <th className="px-3 py-2">Cruise line</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ctx.ships.map((s) => {
                const editing = editingId === s.id;
                return (
                  <tr key={s.id} className="border-b border-vb-border last:border-0 align-top">
                    <td className="px-3 py-2 text-vb-muted">
                      {String(s.season_number ?? "").padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2 sticky-col">
                      {editing ? (
                        <input
                          type="date"
                          value={draft.date ?? ""}
                          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                          className="border border-vb-border rounded px-1.5 py-1 text-xs"
                        />
                      ) : (
                        <span className="font-semibold">
                          {new Date(s.date + "T00:00:00").toLocaleDateString("en-GB")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(s.date + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "short",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          value={draft.ship_name ?? ""}
                          onChange={(e) => setDraft({ ...draft, ship_name: e.target.value })}
                          className="border border-vb-border rounded px-1.5 py-1 text-xs w-32"
                        />
                      ) : (
                        <span className="font-semibold">{s.ship_name}</span>
                      )}
                    </td>
                    <Cell editing={editing} value={s.arrival_time} type="time"
                      onChange={(v) => setDraft({ ...draft, arrival_time: v })}
                      draftValue={draft.arrival_time} />
                    <Cell editing={editing} value={s.departure_time} type="time"
                      onChange={(v) => setDraft({ ...draft, departure_time: v })}
                      draftValue={draft.departure_time} />
                    <td className="px-3 py-2">
                      {editing ? (
                        <select
                          value={draft.dock ?? ""}
                          onChange={(e) => setDraft({ ...draft, dock: e.target.value })}
                          className="border border-vb-border rounded px-1.5 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {DOCKS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        s.dock ?? "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          value={draft.cruise_line ?? ""}
                          onChange={(e) => setDraft({ ...draft, cruise_line: e.target.value })}
                          className="border border-vb-border rounded px-1.5 py-1 text-xs w-28"
                        />
                      ) : (
                        s.cruise_line ?? "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          type="number"
                          value={draft.capacity ?? ""}
                          onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })}
                          className="border border-vb-border rounded px-1.5 py-1 text-xs w-20"
                        />
                      ) : (
                        s.capacity?.toLocaleString() ?? "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={s.rota_status}
                        onChange={(e) => setStatus(s, e.target.value as RotaStatus)}
                        className="text-[11px] border border-vb-border rounded px-1 py-1 max-w-[150px]"
                        title="Draft statuses are system-set; Complete statuses are admin-set"
                      >
                        {STATUS_ORDER.map((st) => (
                          <option key={st} value={st}>
                            {ROTA_STATUSES[st].emoji} {ROTA_STATUSES[st].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {editing ? (
                        <>
                          <button onClick={() => saveEdit(s)} className="text-vb-teal font-semibold hover:underline mr-2">Save</button>
                          <button onClick={() => { setEditingId(null); setDraft({}); }} className="text-vb-muted hover:underline">Cancel</button>
                        </>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setOpenShip(s)} className="text-vb-teal font-semibold hover:underline">Open Rota</button>
                          <button onClick={() => startEdit(s)} className="text-vb-muted hover:underline">Edit</button>
                          <button onClick={() => setDeleteTarget(s)} className="text-red-600 hover:underline">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete ship?"
        message={`Delete ${deleteTarget?.ship_name ?? ""} (${
          deleteTarget ? new Date(deleteTarget.date + "T00:00:00").toLocaleDateString("en-GB") : ""
        })? This removes its rota and assignments.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {openShip && (
        <RotaPanel ship={openShip} ctx={ctx} onClose={() => setOpenShip(null)} />
      )}
    </div>
  );
}

function Cell({
  editing,
  value,
  draftValue,
  onChange,
  type,
}: {
  editing: boolean;
  value: string | null;
  draftValue: string | null | undefined;
  onChange: (v: string) => void;
  type: string;
}) {
  return (
    <td className="px-3 py-2">
      {editing ? (
        <input
          type={type}
          step={type === "time" ? 900 : undefined}
          value={(draftValue ?? "").slice(0, 5)}
          onChange={(e) => onChange(e.target.value)}
          className="border border-vb-border rounded px-1.5 py-1 text-xs"
        />
      ) : (
        value?.slice(0, 5) ?? "—"
      )}
    </td>
  );
}

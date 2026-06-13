"use client";

import { useEffect, useMemo, useState } from "react";
import { SidePanel } from "@/components/ui";
import { DEFAULT_SETTINGS, LOCATIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  ambassadorWindow,
  availabilityCoversShift,
  defaultShiftLocation,
  splitShift,
  travelAdvisorShifts,
  type CalcSettings,
} from "@/lib/rota-calc";
import { quarterHourOptions } from "@/lib/time";
import { nullEmpty, numOrNull } from "@/lib/sanitize";
import { downloadRotaPdf } from "@/lib/output/pdf";
import { downloadRotaXlsx } from "@/lib/output/xlsx";
import { rotaFileName } from "@/lib/output/filename";
import { signageForCruiseLine, signageUrl } from "@/lib/signage";
import type { Ship, Shuttle, Staff } from "@/lib/types";
import type { MonthContext } from "../MonthView";

interface LocalShift {
  id: string;
  role_type: "coordinator" | "travel_advisor" | "ambassador" | "volunteer";
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  assigned_staff_id: string | null;
  confirmed: boolean;
}

interface LocalShuttle {
  id: string;
  bus_type: "double_decker" | "single";
  bus_count: number;
  first_from_dock: string | null;
  last_from_city: string | null;
  frequency_minutes: number | null;
}

const TIMES = quarterHourOptions();

export function RotaPanel({
  ship,
  ctx,
  onClose,
}: {
  ship: Ship;
  ctx: MonthContext;
  onClose: () => void;
}) {
  const settings = { ...DEFAULT_SETTINGS, ...ctx.settings } as CalcSettings;
  const [shifts, setShifts] = useState<LocalShift[]>(() => [coordinatorRow(ship)]);
  const [shuttles, setShuttles] = useState<LocalShuttle[]>([]);
  const [vbwcHours, setVbwcHours] = useState(ship.vbwc_opening_hours ?? "");
  const [payment, setPayment] = useState(ship.payment_notes ?? "");
  const [ambDock, setAmbDock] = useState(1);
  const [ambVbwc, setAmbVbwc] = useState(1);
  const [shuttleWarning, setShuttleWarning] = useState(false);
  const [availability, setAvailability] = useState<Record<string, string>>({});

  // Load existing rota data.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const [sh, bus, avail] = await Promise.all([
        supabase.from("shifts").select("*").eq("ship_id", ship.id),
        supabase.from("shuttles").select("*").eq("ship_id", ship.id).order("sort_order"),
        supabase.from("availability").select("staff_id, period").eq("ship_id", ship.id),
      ]);
      if (sh.data) {
        let next = sh.data as LocalShift[];
        if (!next.some((s) => s.role_type === "coordinator"))
          next = [...next, coordinatorRow(ship)];
        setShifts(next);
      }
      if (bus.data)
        setShuttles(
          (bus.data as Shuttle[]).map((b) => ({
            id: b.id,
            bus_type: b.bus_type,
            bus_count: b.bus_count,
            first_from_dock: b.first_from_dock,
            last_from_city: b.last_from_city,
            frequency_minutes: b.frequency_minutes,
          })),
        );
      if (avail.data) {
        const map: Record<string, string> = {};
        for (const a of avail.data as { staff_id: string; period: string }[])
          map[a.staff_id] = a.period;
        setAvailability(map);
      }
    })();
  }, [ship]);

  const coordinators = ctx.staff.filter((s) => s.is_coordinator);
  const travelAdvisors = ctx.staff.filter((s) => s.is_travel_advisor);
  const ambassadors = ctx.staff.filter((s) => s.is_ambassador);
  const volunteers = ctx.staff.filter((s) => s.is_volunteer);

  const firstShuttle = shuttles[0]?.first_from_dock ?? null;
  const lastShuttle = shuttles[0]?.last_from_city ?? null;

  function addShuttle() {
    setShuttles((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        bus_type: "double_decker",
        bus_count: 1,
        first_from_dock: null,
        last_from_city: null,
        frequency_minutes: 15,
      },
    ]);
  }

  function updateShuttle(id: string, patch: Partial<LocalShuttle>) {
    setShuttles((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    if (shifts.some((s) => s.role_type === "ambassador")) setShuttleWarning(true);
  }

  // 9.4 — generate ambassador shifts from the shuttle window + counts.
  function generateAmbassadors() {
    if (!firstShuttle || !lastShuttle) {
      ctx.toast("Enter the first and last shuttle times first");
      return;
    }
    const win = ambassadorWindow(firstShuttle, lastShuttle, settings);
    const total = Math.max(1, ambDock + ambVbwc);
    const dockSpans = splitShift(win.dock, settings);
    // Build `total` ambassador shift rows, distributing splits.
    const spans = total <= dockSpans.length ? dockSpans.slice(0, total) : padSpans(dockSpans, total);
    const dock = ship.dock ?? "D1";
    const newShifts: LocalShift[] = spans.map((sp, i) => ({
      id: crypto.randomUUID(),
      role_type: "ambassador",
      shift_number: i + 1,
      start_time: i < ambVbwc ? win.vbwc.start : sp.start,
      end_time: i < ambVbwc ? win.vbwc.end : sp.end,
      location: defaultShiftLocation(i, total, dock),
      assigned_staff_id: null,
      confirmed: false,
    }));
    setShifts((p) => [...p.filter((s) => s.role_type !== "ambassador"), ...newShifts]);
    setShuttleWarning(false);
    ctx.toast(`Generated ${newShifts.length} ambassador shift(s)`);
  }

  // 9.3 — generate TA shifts.
  function generateTAs() {
    if (!ship.arrival_time) {
      ctx.toast("Set the ship arrival time first");
      return;
    }
    const dock = ship.dock ?? "D1";
    const ta = travelAdvisorShifts(ship.arrival_time, ship.capacity ?? 0, dock, settings);
    const newShifts: LocalShift[] = Array.from({ length: ta.count }, (_, i) => ({
      id: crypto.randomUUID(),
      role_type: "travel_advisor",
      shift_number: i + 1,
      start_time: ta.span.start,
      end_time: ta.span.end,
      location: ta.location,
      assigned_staff_id: null,
      confirmed: false,
    }));
    setShifts((p) => [...p.filter((s) => s.role_type !== "travel_advisor"), ...newShifts]);
    ctx.toast(`Generated ${ta.count} TA shift(s)`);
  }

  function setAssignment(shiftId: string, staffId: string | null) {
    setShifts((p) =>
      p.map((s) => (s.id === shiftId ? { ...s, assigned_staff_id: staffId } : s)),
    );
  }
  function updateShift(shiftId: string, patch: Partial<LocalShift>) {
    setShifts((p) => p.map((s) => (s.id === shiftId ? { ...s, ...patch } : s)));
  }

  function addVolunteerRow() {
    const firstAmb = shifts.find((s) => s.role_type === "ambassador");
    if (shifts.filter((s) => s.role_type === "volunteer").length >= 3) {
      ctx.toast("Maximum 3 volunteers per ship");
      return;
    }
    setShifts((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        role_type: "volunteer",
        shift_number: p.filter((s) => s.role_type === "volunteer").length + 1,
        start_time: firstAmb?.start_time ?? ship.arrival_time,
        end_time: null,
        location: ship.dock,
        assigned_staff_id: null,
        confirmed: false,
      },
    ]);
  }

  async function save() {
    const supabase = createClient();
    await ctx.patchShip(ship, {
      vbwc_opening_hours: vbwcHours || null,
      payment_notes: payment || null,
      // 8.2 — auto-set to "requirements inputted" once shuttle + ambassador data exist.
      rota_status:
        firstShuttle && shifts.some((s) => s.role_type === "ambassador") && ship.rota_status === "draft_no_info"
          ? "draft_requirements"
          : ship.rota_status,
    });
    if (supabase) {
      await supabase.from("shifts").delete().eq("ship_id", ship.id);
      await supabase.from("shuttles").delete().eq("ship_id", ship.id);
      if (shifts.length)
        await supabase.from("shifts").insert(
          shifts.map((s) => ({
            ...nullEmpty(stripId(s), ["start_time", "end_time", "location", "assigned_staff_id"]),
            ship_id: ship.id,
          })),
        );
      if (shuttles.length)
        await supabase.from("shuttles").insert(
          shuttles.map((s, i) => ({
            ...nullEmpty(stripId(s), ["first_from_dock", "last_from_city"]),
            bus_count: numOrNull(s.bus_count),
            frequency_minutes: numOrNull(s.frequency_minutes),
            ship_id: ship.id,
            sort_order: i,
          })),
        );
      ctx.bumpSync();
    }
    ctx.toast("Rota saved");
  }

  function download(kind: "pdf" | "xlsx") {
    const payload = {
      ship,
      shifts,
      shuttles,
      vbwcHours,
      payment,
      staffName: (id: string | null) =>
        ctx.staff.find((s) => s.id === id)?.display_name ?? "—",
    };
    const fileName = rotaFileName(ship);
    if (kind === "pdf") downloadRotaPdf(payload, fileName);
    else downloadRotaXlsx(payload, fileName);
  }

  async function downloadSignage() {
    const supabase = createClient();
    if (!supabase) {
      ctx.toast("Signage needs Supabase configured");
      return;
    }
    const row = await signageForCruiseLine(supabase, ship.cruise_line);
    if (!row) {
      ctx.toast(`No signage uploaded for ${ship.cruise_line ?? "this cruise line"}`);
      return;
    }
    const url = await signageUrl(supabase, row.storage_path);
    if (url) window.open(url, "_blank");
  }

  const sectionShifts = (role: LocalShift["role_type"]) =>
    shifts.filter((s) => s.role_type === role).sort((a, b) => a.shift_number - b.shift_number);

  return (
    <SidePanel
      open
      onClose={onClose}
      title={`Rota — ${ship.ship_name}`}
      actions={
        <div className="flex gap-2">
          <button onClick={() => download("pdf")} className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-vb px-3 py-1.5">PDF</button>
          <button onClick={() => download("xlsx")} className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-vb px-3 py-1.5">XLS</button>
          <button onClick={downloadSignage} className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-vb px-3 py-1.5">Signage</button>
          <button onClick={save} className="bg-vb-teal hover:bg-vb-teal-dark text-white text-xs font-semibold rounded-vb px-3 py-1.5">Save</button>
        </div>
      }
    >
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="font-heading font-bold text-vb-navy text-lg">CRUISE WELCOME AMBASSADOR ROTA</h2>
        <p className="text-sm text-vb-muted">
          {new Date(ship.date + "T00:00:00").toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-vb-panel rounded-vb border border-vb-border p-4 mb-5 text-sm">
        <Field label="Ship">{ship.ship_name}</Field>
        <Field label="Dock">{ship.dock ?? "—"}</Field>
        <Field label="Time in Port">
          {ship.arrival_time?.slice(0, 5) ?? "—"} – {ship.departure_time?.slice(0, 5) ?? "—"}
        </Field>
        <Field label="Capacity">{ship.capacity?.toLocaleString() ?? "—"}</Field>
        <label className="block">
          <span className="text-xs font-semibold text-vb-muted">VBWC Opening Hours</span>
          <input value={vbwcHours} onChange={(e) => setVbwcHours(e.target.value)}
            placeholder="09:00–17:00"
            className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-vb-muted">Payment</span>
          <input value={payment} onChange={(e) => setPayment(e.target.value)}
            placeholder="TBC"
            className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5" />
        </label>
      </div>

      {shuttleWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-vb px-4 py-2.5 mb-4">
          ⚠ Shuttle times changed after ambassador shifts were generated. Shift
          times are <strong>not</strong> auto-recalculated — regenerate or adjust
          manually if needed.
        </div>
      )}

      {/* Shuttles */}
      <Section title="Buses / Shuttles" action={<AddBtn onClick={addShuttle} label="Add bus" />}>
        {shuttles.length === 0 ? (
          <Empty>No shuttle rows. Add a bus and enter first/last departure times.</Empty>
        ) : (
          <div className="space-y-2">
            {shuttles.map((b) => (
              <div key={b.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <Sel label="Type" value={b.bus_type} onChange={(v) => updateShuttle(b.id, { bus_type: v as LocalShuttle["bus_type"] })}
                  options={[["double_decker", "Double Decker"], ["single", "Single"]]} />
                <NumF label="Buses" value={b.bus_count} onChange={(v) => updateShuttle(b.id, { bus_count: v })} />
                <TimeSel label="First from dock" value={b.first_from_dock} onChange={(v) => updateShuttle(b.id, { first_from_dock: v })} />
                <TimeSel label="Last from city" value={b.last_from_city} onChange={(v) => updateShuttle(b.id, { last_from_city: v })} />
                <NumF label="Every (min)" value={b.frequency_minutes ?? 15} onChange={(v) => updateShuttle(b.id, { frequency_minutes: v })} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Coordinator */}
      <Section title="Coordinator">
        {sectionShifts("coordinator").map((s) => (
          <ShiftRow key={s.id} shift={s} staff={coordinators} onAssign={setAssignment} onChange={updateShift} availability={availability} />
        ))}
      </Section>

      {/* Travel Advisors */}
      <Section title="Travel Advisors" action={<AddBtn onClick={generateTAs} label="Auto-generate" />}>
        {sectionShifts("travel_advisor").length === 0 ? (
          <Empty>Auto-generate TA shifts (arrival + 30 min, 4h; 2 TAs if capacity ≥ {settings.ta_capacity_threshold}).</Empty>
        ) : (
          sectionShifts("travel_advisor").map((s) => (
            <ShiftRow key={s.id} shift={s} staff={travelAdvisors} onAssign={setAssignment} onChange={updateShift} availability={availability} />
          ))
        )}
      </Section>

      {/* Ambassadors */}
      <Section
        title="Ambassadors"
        action={<AddBtn onClick={generateAmbassadors} label="Auto-calculate" />}
      >
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumF label="# at Dock" value={ambDock} onChange={setAmbDock} />
          <NumF label="# at VBWC" value={ambVbwc} onChange={setAmbVbwc} />
        </div>
        {sectionShifts("ambassador").length === 0 ? (
          <Empty>Set counts and shuttle times, then auto-calculate shift times (split per duration rules).</Empty>
        ) : (
          sectionShifts("ambassador").map((s) => (
            <ShiftRow key={s.id} shift={s} staff={ambassadors} onAssign={setAssignment} onChange={updateShift} availability={availability} editableTimes />
          ))
        )}
      </Section>

      {/* Volunteers */}
      <Section title="Volunteers" action={<AddBtn onClick={addVolunteerRow} label="Add volunteer" />}>
        {sectionShifts("volunteer").length === 0 ? (
          <Empty>Add up to 3 volunteers. Start time defaults to the first ambassador shift.</Empty>
        ) : (
          sectionShifts("volunteer").map((s) => (
            <ShiftRow key={s.id} shift={s} staff={volunteers} onAssign={setAssignment} onChange={updateShift} availability={availability} noEnd />
          ))
        )}
      </Section>
    </SidePanel>
  );
}

function coordinatorRow(ship: Ship): LocalShift {
  return {
    id: crypto.randomUUID(),
    role_type: "coordinator",
    shift_number: 1,
    start_time: ship.arrival_time,
    end_time: ship.departure_time,
    location: ship.dock,
    assigned_staff_id: null,
    confirmed: false,
  };
}

function padSpans(spans: { start: string; end: string }[], total: number) {
  const out = [...spans];
  while (out.length < total) out.push(spans[spans.length - 1]);
  return out;
}
function stripId<T extends { id: string }>(o: T) {
  const { id: _id, ...rest } = o;
  return rest;
}

/* ---- small presentational helpers ---- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-semibold text-vb-muted">{label}</span>
      <p className="font-semibold">{children}</p>
    </div>
  );
}
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-vb-panel rounded-vb border border-vb-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-vb-navy text-sm uppercase tracking-wide">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-vb-muted">{children}</p>;
}
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-xs font-semibold text-vb-teal hover:underline">
      {label}
    </button>
  );
}
function NumF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-vb-muted">{label}</span>
      <input type="number" value={value} min={0} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5" />
    </label>
  );
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-vb-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
function TimeSel({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-vb-muted">{label}</span>
      <select value={value?.slice(0, 5) ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-vb-border rounded px-2 py-1 text-sm mt-0.5">
        <option value="">—</option>
        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  );
}

function ShiftRow({
  shift,
  staff,
  onAssign,
  onChange,
  availability,
  editableTimes,
  noEnd,
}: {
  shift: LocalShift;
  staff: Staff[];
  onAssign: (id: string, staffId: string | null) => void;
  onChange: (id: string, patch: Partial<LocalShift>) => void;
  availability: Record<string, string>;
  editableTimes?: boolean;
  noEnd?: boolean;
}) {
  // Filter to staff available for the shift's period (Section 9.4.5).
  const eligible = useMemo(() => {
    if (!shift.start_time) return staff;
    return staff.filter((s) => {
      const avail = availability[s.id];
      if (!avail) return true; // no availability data → show all
      return availabilityCoversShift(avail, shift.start_time!);
    });
  }, [staff, availability, shift.start_time]);

  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5 border-b border-vb-border last:border-0">
      <select
        value={shift.assigned_staff_id ?? ""}
        onChange={(e) => onAssign(shift.id, e.target.value || null)}
        className="border border-vb-border rounded px-2 py-1 text-sm min-w-[140px] flex-1"
      >
        <option value="">— unassigned —</option>
        {eligible.map((s) => (
          <option key={s.id} value={s.id}>{s.display_name}</option>
        ))}
      </select>

      {editableTimes ? (
        <>
          <TimeMini value={shift.start_time} onChange={(v) => onChange(shift.id, { start_time: v })} />
          {!noEnd && <TimeMini value={shift.end_time} onChange={(v) => onChange(shift.id, { end_time: v })} />}
        </>
      ) : (
        <span className="text-sm text-vb-muted whitespace-nowrap">
          {shift.start_time?.slice(0, 5) ?? "—"}
          {!noEnd && ` – ${shift.end_time?.slice(0, 5) ?? "—"}`}
        </span>
      )}

      <select
        value={shift.location ?? ""}
        onChange={(e) => onChange(shift.id, { location: e.target.value })}
        className="border border-vb-border rounded px-2 py-1 text-sm"
      >
        <option value="">—</option>
        {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
  );
}
function TimeMini({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <select value={value?.slice(0, 5) ?? ""} onChange={(e) => onChange(e.target.value)}
      className="border border-vb-border rounded px-1.5 py-1 text-sm">
      <option value="">—</option>
      {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

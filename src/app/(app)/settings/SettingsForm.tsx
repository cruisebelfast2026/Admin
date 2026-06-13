"use client";

import { useState } from "react";
import { LOCATIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { logChange } from "@/lib/changelog";
import { EmailSettingsManager } from "@/components/EmailSettingsManager";
import { ShuttleSignageManager } from "@/components/ShuttleSignageManager";
import type { Settings } from "@/lib/types";

const DAYS = [
  ["vbwc_hours_mon", "Monday"],
  ["vbwc_hours_tue", "Tuesday"],
  ["vbwc_hours_wed", "Wednesday"],
  ["vbwc_hours_thu", "Thursday"],
  ["vbwc_hours_fri", "Friday"],
  ["vbwc_hours_sat", "Saturday"],
  ["vbwc_hours_sun", "Sunday"],
] as const;

export function SettingsForm({
  initial,
  configured,
}: {
  initial: Partial<Settings>;
  configured: boolean;
}) {
  const [s, setS] = useState<Partial<Settings>>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    const supabase = createClient();
    if (!supabase) {
      setToast("Demo mode — settings not saved");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setBusy(true);
    const { id, ...rest } = s;
    // Drop empty values so cleared time inputs never hit NOT NULL columns
    // (omitting a key keeps the column's existing/default value).
    const payload = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== "" && v !== undefined),
    );
    const query = id
      ? supabase.from("settings").update(payload).eq("id", id)
      : supabase.from("settings").insert(payload);
    const { error } = await query;
    if (!error) {
      await logChange(supabase, {
        action_type: "settings_updated",
        entity_type: "settings",
        entity_id: id ?? null,
        new_value: payload,
      });
      setToast("Settings saved");
    } else {
      setToast("Error: " + error.message);
    }
    setBusy(false);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-vb px-4 py-3">
          Supabase not configured — running in <strong>demo mode</strong>. Edits
          are not persisted.
        </div>
      )}

      {/* 14.1 Time offsets */}
      <Card title="Default Time Offsets">
        <Grid>
          <Num label="Ambassador start at Dock (mins vs first shuttle)" v={s.ambassador_dock_offset_mins} on={(x) => set("ambassador_dock_offset_mins", x)} />
          <Num label="Ambassador start at VBWC (mins vs first shuttle)" v={s.ambassador_vbwc_offset_mins} on={(x) => set("ambassador_vbwc_offset_mins", x)} />
          <Num label="Ambassador finish at Dock (mins vs last shuttle)" v={s.ambassador_finish_dock_offset_mins} on={(x) => set("ambassador_finish_dock_offset_mins", x)} />
          <Num label="TA start time (mins after arrival)" v={s.ta_start_offset_mins} on={(x) => set("ta_start_offset_mins", x)} />
          <Num label="TA shift duration (hours)" v={s.ta_duration_hours} on={(x) => set("ta_duration_hours", x)} />
          <Num label="Shift split threshold — 2 shifts (hours)" v={s.shift_split_threshold_hours} on={(x) => set("shift_split_threshold_hours", x)} />
          <Num label="Shift split threshold — 3 shifts (hours)" v={s.shift_3way_threshold_hours} on={(x) => set("shift_3way_threshold_hours", x)} />
        </Grid>
        <p className="text-xs text-vb-muted mt-2">
          Ambassador finish at VBWC is fixed to the same time as the last shuttle
          from the city.
        </p>
      </Card>

      {/* 14.3 Availability periods */}
      <Card title="Availability Period Definitions">
        <Grid>
          <Time label="AM start" v={s.am_start} on={(x) => set("am_start", x)} />
          <Time label="AM end" v={s.am_end} on={(x) => set("am_end", x)} />
          <Time label="PM start" v={s.pm_start} on={(x) => set("pm_start", x)} />
          <Time label="PM end" v={s.pm_end} on={(x) => set("pm_end", x)} />
          <Time label="EV start" v={s.ev_start} on={(x) => set("ev_start", x)} />
          <Time label="EV end" v={s.ev_end} on={(x) => set("ev_end", x)} />
        </Grid>
      </Card>

      {/* 14.4 Capacity threshold */}
      <Card title="Capacity Thresholds">
        <Grid>
          <Num label="TA count threshold (passengers — at/above = 2 TAs)" v={s.ta_capacity_threshold} on={(x) => set("ta_capacity_threshold", x)} />
        </Grid>
      </Card>

      {/* 14.2 VBWC opening hours */}
      <Card title="VBWC Opening Hours (default per day of week)">
        <Grid>
          {DAYS.map(([key, label]) => (
            <Txt
              key={key}
              label={label}
              v={(s[key] as string) ?? ""}
              placeholder="09:00–17:00"
              on={(x) => set(key, x)}
            />
          ))}
        </Grid>
      </Card>

      {/* 14.5 Locations */}
      <Card title="Locations">
        <p className="text-sm text-vb-muted mb-2">
          Dock/location names used throughout the system.
        </p>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((l) => (
            <span
              key={l}
              className="bg-vb-teal-tint text-vb-navy text-sm font-semibold rounded-vb px-3 py-1.5"
            >
              {l}
            </span>
          ))}
        </div>
      </Card>

      {/* 14.6 Shuttle signage */}
      <Card title="Shuttle Signage PDFs">
        <ShuttleSignageManager />
      </Card>

      {/* 14.7 Email stub */}
      <Card title="Email Notifications (stub — inactive)">
        <EmailSettingsManager />
      </Card>

      <div className="flex items-center gap-3 sticky bottom-0 bg-vb-bg py-3">
        <button
          onClick={save}
          disabled={busy}
          className="bg-vb-navy hover:bg-vb-navy-dark text-white font-semibold rounded-vb px-6 py-2.5 text-sm transition disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {toast && <span className="text-sm text-vb-teal-dark font-semibold">{toast}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-vb-panel rounded-vb border border-vb-border p-5">
      <h2 className="font-heading font-semibold text-vb-navy mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
function Num({ label, v, on }: { label: string; v?: number; on: (x: number) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1">{label}</span>
      <input
        type="number"
        value={v ?? ""}
        onChange={(e) => on(Number(e.target.value))}
        className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal"
      />
    </label>
  );
}
function Time({ label, v, on }: { label: string; v?: string; on: (x: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1">{label}</span>
      <input
        type="time"
        step={900}
        value={(v ?? "").slice(0, 5)}
        onChange={(e) => on(e.target.value)}
        className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal"
      />
    </label>
  );
}
function Txt({
  label,
  v,
  on,
  placeholder,
  disabled,
}: {
  label: string;
  v?: string;
  on: (x: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1">{label}</span>
      <input
        type="text"
        value={v ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => on(e.target.value)}
        className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal disabled:bg-vb-bg disabled:text-vb-muted"
      />
    </label>
  );
}

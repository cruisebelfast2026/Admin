/**
 * Ship data operations with a graceful demo fallback when Supabase is not
 * configured. All mutations also write a change-log entry when persisted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logChange } from "./changelog";
import type { ParsedShipRow } from "./parse-schedule";
import type { Ship } from "./types";

/** Order ships by date and assign sequential season numbers (client fallback). */
export function assignSeasonNumbers(ships: Ship[]): Ship[] {
  const sorted = [...ships].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((s, i) => ({ ...s, season_number: i + 1 }));
}

/** Re-sequence season numbers across the whole year in the database. */
export async function resequenceSeason(
  supabase: SupabaseClient,
  year: number,
): Promise<void> {
  await supabase.rpc("resequence_season_numbers", { p_year: year });
}

/** Fetch a single month's ships (date-ordered). */
export async function fetchMonthShips(
  supabase: SupabaseClient,
  year: number,
  month: number,
): Promise<Ship[]> {
  const { data } = await supabase
    .from("ships")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .order("date", { ascending: true });
  return (data as Ship[]) ?? [];
}

function demoShip(partial: Partial<Ship>, year: number, month: number): Ship {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    year,
    month,
    season_number: 0,
    date: partial.date ?? now.slice(0, 10),
    arrival_time: partial.arrival_time ?? null,
    departure_time: partial.departure_time ?? null,
    dock: partial.dock ?? null,
    cruise_line: partial.cruise_line ?? null,
    ship_name: partial.ship_name ?? "New Ship",
    capacity: partial.capacity ?? null,
    rota_status: "draft_no_info",
    vbwc_opening_hours: null,
    payment_notes: null,
    info_received: false,
    rota_sent: false,
    volunteers_sent: false,
    confirmed: false,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

export async function importSchedule(
  supabase: SupabaseClient | null,
  parsed: ParsedShipRow[],
  year: number,
  month: number,
): Promise<Ship[]> {
  const newShips = parsed.map((p) =>
    demoShip(
      {
        date: p.date ?? new Date().toISOString().slice(0, 10),
        arrival_time: p.arrival_time,
        departure_time: p.departure_time,
        dock: p.dock,
        cruise_line: p.cruise_line,
        ship_name: p.ship_name ?? "Unknown",
        capacity: p.capacity,
      },
      year,
      month,
    ),
  );
  const sequenced = assignSeasonNumbers(newShips);

  if (!supabase) return sequenced;

  // Replace existing month data (Section 5.2 — re-upload replaces).
  await supabase.from("ships").delete().eq("year", year).eq("month", month);
  const rows = sequenced.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest);
  await supabase.from("ships").insert(rows);
  await logChange(supabase, {
    action_type: "schedule_imported",
    entity_type: "ship",
    new_value: { year, month, count: rows.length },
  });
  // Number sequentially across the whole season, then return the fresh month.
  await resequenceSeason(supabase, year);
  return fetchMonthShips(supabase, year, month);
}

export async function addShip(
  supabase: SupabaseClient | null,
  existing: Ship[],
  year: number,
  month: number,
): Promise<Ship> {
  const ship = demoShip({}, year, month);
  if (!supabase) return ship;
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = ship;
  const { data } = await supabase.from("ships").insert(rest).select().single();
  await logChange(supabase, {
    action_type: "ship_added",
    entity_type: "ship",
    entity_id: (data as Ship)?.id,
    new_value: data,
  });
  return (data as Ship) ?? ship;
}

export async function updateShip(
  supabase: SupabaseClient | null,
  ship: Ship,
  patch: Partial<Ship>,
): Promise<Ship> {
  const next = { ...ship, ...patch, updated_at: new Date().toISOString() };
  if (!supabase) return next;
  const { data } = await supabase
    .from("ships")
    .update(patch)
    .eq("id", ship.id)
    .select()
    .single();
  await logChange(supabase, {
    action_type: "ship_updated",
    entity_type: "ship",
    entity_id: ship.id,
    old_value: ship,
    new_value: patch,
  });
  return (data as Ship) ?? next;
}

export async function deleteShip(
  supabase: SupabaseClient | null,
  ship: Ship,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("ships").delete().eq("id", ship.id);
  await logChange(supabase, {
    action_type: "ship_deleted",
    entity_type: "ship",
    entity_id: ship.id,
    old_value: ship,
  });
}

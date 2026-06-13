/**
 * Rota auto-calculation engine (Build Brief Section 9).
 * Pure functions — no I/O — so they can be unit tested and reused on both
 * server and client.
 */

import { DEFAULT_SETTINGS } from "./constants";
import { addMinutes, durationHours, roundTo15, toMinutes, toTime } from "./time";

export interface CalcSettings {
  ambassador_dock_offset_mins: number; // default -15
  ambassador_vbwc_offset_mins: number; // default +15
  ambassador_finish_dock_offset_mins: number; // default +15
  ta_start_offset_mins: number; // default +30
  ta_duration_hours: number; // default 4
  shift_split_threshold_hours: number; // default 4
  shift_3way_threshold_hours: number; // default 10
  ta_capacity_threshold: number; // default 1200
  am_start: string;
  am_end: string;
  pm_start: string;
  pm_end: string;
  ev_start: string;
  ev_end: string;
}

export const DEFAULT_CALC_SETTINGS: CalcSettings = {
  ...DEFAULT_SETTINGS,
};

export interface ShiftSpan {
  start: string;
  end: string;
}

// ---------------------------------------------------------------------------
// 9.4.2 — Ambassador window from the shuttle schedule
// ---------------------------------------------------------------------------
export interface AmbassadorWindow {
  dock: ShiftSpan;
  vbwc: ShiftSpan;
}

export function ambassadorWindow(
  firstShuttleFromDock: string,
  lastShuttleFromCity: string,
  s: CalcSettings = DEFAULT_CALC_SETTINGS,
): AmbassadorWindow {
  return {
    dock: {
      start: addMinutes(firstShuttleFromDock, s.ambassador_dock_offset_mins),
      end: addMinutes(lastShuttleFromCity, s.ambassador_finish_dock_offset_mins),
    },
    vbwc: {
      start: addMinutes(firstShuttleFromDock, s.ambassador_vbwc_offset_mins),
      end: lastShuttleFromCity,
    },
  };
}

// ---------------------------------------------------------------------------
// 9.4.3 — Shift splitting
// ---------------------------------------------------------------------------
export function splitShift(
  span: ShiftSpan,
  s: CalcSettings = DEFAULT_CALC_SETTINGS,
): ShiftSpan[] {
  const start = toMinutes(span.start);
  const end = toMinutes(span.end);
  if (start == null || end == null || end <= start) return [span];

  const total = (end - start) / 60;
  let parts = 1;
  if (total > s.shift_3way_threshold_hours) parts = 3;
  else if (total > s.shift_split_threshold_hours) parts = 2;

  if (parts === 1) return [span];

  const segment = (end - start) / parts;
  const spans: ShiftSpan[] = [];
  for (let i = 0; i < parts; i++) {
    const segStart = i === 0 ? start : roundTo15(start + segment * i);
    const segEnd = i === parts - 1 ? end : roundTo15(start + segment * (i + 1));
    spans.push({ start: toTime(segStart), end: toTime(segEnd) });
  }
  return spans;
}

// ---------------------------------------------------------------------------
// 9.4.4 — Default location per split
// ---------------------------------------------------------------------------
export function defaultShiftLocation(
  index: number,
  total: number,
  dock: string,
): string {
  if (total <= 1) return "VBWC";
  // 1 at VBWC, the rest at the dock.
  return index === 0 ? "VBWC" : dock;
}

// ---------------------------------------------------------------------------
// 9.3 — Travel Advisor auto-generation
// ---------------------------------------------------------------------------
export function travelAdvisorShifts(
  arrivalTime: string,
  capacity: number,
  dock: string,
  s: CalcSettings = DEFAULT_CALC_SETTINGS,
): { count: number; span: ShiftSpan; location: string } {
  const start = addMinutes(arrivalTime, s.ta_start_offset_mins);
  const end = addMinutes(start, s.ta_duration_hours * 60);
  const count = capacity >= s.ta_capacity_threshold ? 2 : 1;
  return { count, span: { start, end }, location: dock };
}

// ---------------------------------------------------------------------------
// 9.4.5 — Availability period(s) for a shift start time
// AM if start < 13:00, PM if 12:00–17:30, EV if start >= 16:00 (overlapping).
// ---------------------------------------------------------------------------
export type Period = "AM" | "PM" | "EV";

export function periodsForStart(
  startTime: string,
  s: CalcSettings = DEFAULT_CALC_SETTINGS,
): Period[] {
  const t = toMinutes(startTime);
  if (t == null) return [];
  const periods: Period[] = [];
  if (t < (toMinutes(s.am_end) ?? 780)) periods.push("AM"); // < 13:00
  if (
    t >= (toMinutes(s.pm_start) ?? 720) &&
    t <= (toMinutes(s.pm_end) ?? 1050)
  )
    periods.push("PM"); // 12:00–17:30
  if (t >= (toMinutes(s.ev_start) ?? 960)) periods.push("EV"); // >= 16:00
  return periods;
}

/** A staff availability marker (e.g. "AM+PM") covers the given shift periods. */
export function availabilityCoversShift(
  availability: string,
  shiftStart: string,
  s: CalcSettings = DEFAULT_CALC_SETTINGS,
): boolean {
  const have = new Set(availability.split("+").map((p) => p.trim()));
  return periodsForStart(shiftStart, s).some((p) => have.has(p));
}

// ---------------------------------------------------------------------------
// 9.4.1/9.4.2 — Build the full set of ambassador shift spans for a location
// count split across the calculated window.
// ---------------------------------------------------------------------------
export function ambassadorShiftSpans(
  window: ShiftSpan,
  s: CalcSettings = DEFAULT_CALC_SETTINGS,
): ShiftSpan[] {
  return splitShift(window, s);
}

export { durationHours };

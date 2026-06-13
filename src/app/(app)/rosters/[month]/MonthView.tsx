"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { TABS } from "@/lib/constants";
import type { Ship } from "@/lib/types";

export function MonthView({ ships }: { ships: Ship[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["slug"]>("rosters");

  return (
    <div>
      <div className="flex gap-1 border-b border-vb-border mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTab(t.slug)}
            className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 whitespace-nowrap transition ${
              tab === t.slug
                ? "border-vb-teal text-vb-navy"
                : "border-transparent text-vb-muted hover:text-vb-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rosters" && <RostersTab ships={ships} />}
      {tab === "assigned" && (
        <Scaffold
          phase="Phase 4"
          title="Assigned — master availability & assignment grid"
          points={[
            "Ships as rows, staff as columns; frozen Date + Ship columns.",
            "Yellow = assigned, green = confirmed; amber flag for cross-ship same-day conflicts.",
            "Assignment dropdowns filtered by availability period and role.",
            "Two-way sync with the individual rota; per-staff assigned/available stats.",
          ]}
        />
      )}
      {tab === "availability" && (
        <Scaffold
          phase="Phase 4"
          title="Staff Availability Upload"
          points={[
            "Upload Excel / CSV / PDF availability sheet for the month.",
            "Re-upload replaces the entire month after confirmation (no merge).",
            "Cells marked AM / PM / EV map to staff via display name.",
          ]}
        />
      )}
      {tab === "ship-requests" && (
        <Scaffold
          phase="Phase 5"
          title="Ship Requests — what each cruise line requested"
          points={[
            "Standalone record, independent of the operational rota.",
            "Ambassador numbers / times / locations requested, shuttle times, agent contact, notes.",
          ]}
        />
      )}
      {tab === "schedule" && (
        <Scaffold
          phase="Phase 2"
          title="Schedule Upload"
          points={[
            "Upload Excel / CSV / PDF monthly ship schedule with auto-parse.",
            "Each row creates an editable ship entry; re-upload replaces after confirmation.",
            "Ships numbered sequentially for the season (e.g. #08).",
          ]}
        />
      )}
      {tab === "volunteers" && (
        <Scaffold
          phase="Phase 5"
          title="Volunteer Shifts"
          points={[
            "All ships with up to 3 volunteer dropdown columns.",
            "Start time auto-populated from first Ambassador shift; two-way sync with the rota.",
          ]}
        />
      )}
    </div>
  );
}

function RostersTab({ ships }: { ships: Ship[] }) {
  if (ships.length === 0) {
    return (
      <div className="bg-vb-panel rounded-vb border border-vb-border p-8 text-center">
        <p className="text-sm text-vb-muted">
          No ships for this month yet. Import a schedule from the{" "}
          <strong>Schedule Upload</strong> tab (Phase 2) or add ships manually.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-vb-panel rounded-vb border border-vb-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-vb-muted border-b border-vb-border">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold sticky-col">Date</th>
            <th className="px-3 py-2 font-semibold">Day</th>
            <th className="px-3 py-2 font-semibold">Ship</th>
            <th className="px-3 py-2 font-semibold">Arr</th>
            <th className="px-3 py-2 font-semibold">Dep</th>
            <th className="px-3 py-2 font-semibold">Dock</th>
            <th className="px-3 py-2 font-semibold">Cruise line</th>
            <th className="px-3 py-2 font-semibold">Capacity</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {ships.map((s) => (
            <tr key={s.id} className="border-b border-vb-border last:border-0">
              <td className="px-3 py-2.5 text-vb-muted">
                {String(s.season_number ?? "").padStart(2, "0")}
              </td>
              <td className="px-3 py-2.5 font-semibold sticky-col">
                {new Date(s.date + "T00:00:00").toLocaleDateString("en-GB")}
              </td>
              <td className="px-3 py-2.5">
                {new Date(s.date + "T00:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                })}
              </td>
              <td className="px-3 py-2.5 font-semibold">{s.ship_name}</td>
              <td className="px-3 py-2.5">{s.arrival_time?.slice(0, 5) ?? "—"}</td>
              <td className="px-3 py-2.5">{s.departure_time?.slice(0, 5) ?? "—"}</td>
              <td className="px-3 py-2.5">{s.dock ?? "—"}</td>
              <td className="px-3 py-2.5">{s.cruise_line ?? "—"}</td>
              <td className="px-3 py-2.5">{s.capacity?.toLocaleString() ?? "—"}</td>
              <td className="px-3 py-2.5">
                <StatusBadge status={s.rota_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Scaffold({
  phase,
  title,
  points,
}: {
  phase: string;
  title: string;
  points: string[];
}) {
  return (
    <div className="bg-vb-panel rounded-vb border border-vb-border p-6">
      <span className="inline-block text-[11px] font-semibold bg-vb-teal-tint text-vb-navy rounded-vb px-2 py-1 mb-3">
        {phase}
      </span>
      <h3 className="font-heading font-semibold text-vb-navy mb-3">{title}</h3>
      <ul className="space-y-1.5 text-sm text-vb-muted list-disc pl-5">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

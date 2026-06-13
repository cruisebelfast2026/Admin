"use client";

import { useCallback, useState } from "react";
import { TABS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Settings, Ship, Staff } from "@/lib/types";
import { assignSeasonNumbers, deleteShip, updateShip } from "@/lib/ships-store";
import { useToast } from "@/components/ui";
import { RostersTab } from "./tabs/RostersTab";
import { ScheduleUploadTab } from "./tabs/ScheduleUploadTab";
import { AvailabilityUploadTab } from "./tabs/AvailabilityUploadTab";
import { AssignedTab } from "./tabs/AssignedTab";
import { VolunteerShiftsTab } from "./tabs/VolunteerShiftsTab";
import { ShipRequestsTab } from "./tabs/ShipRequestsTab";

export interface MonthContext {
  ships: Ship[];
  staff: Staff[];
  settings: Partial<Settings>;
  year: number;
  monthValue: number;
  configured: boolean;
  setShips: (updater: (prev: Ship[]) => Ship[]) => void;
  patchShip: (ship: Ship, patch: Partial<Ship>) => Promise<void>;
  removeShip: (ship: Ship) => Promise<void>;
  toast: (msg: string) => void;
}

export function MonthView({
  monthValue,
  year,
  initialShips,
  staff,
  settings,
  configured,
}: {
  monthValue: number;
  year: number;
  initialShips: Ship[];
  staff: Staff[];
  settings: Partial<Settings>;
  configured: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["slug"]>("rosters");
  const [ships, setShips] = useState<Ship[]>(initialShips);
  const { show, node } = useToast();

  const patchShip = useCallback(
    async (ship: Ship, patch: Partial<Ship>) => {
      const supabase = createClient();
      const next = await updateShip(supabase, ship, patch);
      setShips((prev) => prev.map((s) => (s.id === ship.id ? next : s)));
    },
    [],
  );

  const removeShip = useCallback(async (ship: Ship) => {
    const supabase = createClient();
    await deleteShip(supabase, ship);
    setShips((prev) =>
      assignSeasonNumbers(prev.filter((s) => s.id !== ship.id)),
    );
  }, []);

  const ctx: MonthContext = {
    ships,
    staff,
    settings,
    year,
    monthValue,
    configured,
    setShips,
    patchShip,
    removeShip,
    toast: show,
  };

  return (
    <div>
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-vb px-4 py-2.5 mb-4">
          Demo mode — Supabase not configured. Changes are not persisted.
        </div>
      )}

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

      {tab === "rosters" && <RostersTab ctx={ctx} />}
      {tab === "assigned" && <AssignedTab ctx={ctx} />}
      {tab === "availability" && <AvailabilityUploadTab ctx={ctx} />}
      {tab === "ship-requests" && <ShipRequestsTab ctx={ctx} />}
      {tab === "schedule" && <ScheduleUploadTab ctx={ctx} />}
      {tab === "volunteers" && <VolunteerShiftsTab ctx={ctx} />}

      {node}
    </div>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SEASON_MONTHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Ship } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB");
}
function dayName(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  let ships: Ship[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("ships")
      .select("*")
      .eq("year", year)
      .order("date", { ascending: true });
    ships = (data as Ship[]) ?? [];
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Iso = in7.toISOString().slice(0, 10);

  const todaysShips = ships.filter((s) => s.date === todayIso);
  const upcoming = ships.filter((s) => s.date > todayIso && s.date <= in7Iso);
  const gaps = ships.filter(
    (s) =>
      s.rota_status === "draft_no_info" ||
      s.rota_status === "draft_requirements",
  );

  const perMonth = SEASON_MONTHS.map((m) => {
    const monthShips = ships.filter((s) => s.month === m.value);
    const complete = monthShips.filter((s) =>
      s.rota_status.startsWith("complete"),
    ).length;
    return {
      ...m,
      count: monthShips.length,
      pct: monthShips.length
        ? Math.round((complete / monthShips.length) * 100)
        : 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${year} cruise season · summary & planning overview`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Ships */}
        <Panel title="Today's Ships">
          {todaysShips.length === 0 ? (
            <Empty>No ship calls today.</Empty>
          ) : (
            <ul className="divide-y divide-vb-border">
              {todaysShips.map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{s.ship_name}</p>
                    <p className="text-xs text-vb-muted">
                      {s.dock ?? "—"} · {s.arrival_time?.slice(0, 5) ?? "--:--"}–
                      {s.departure_time?.slice(0, 5) ?? "--:--"}
                    </p>
                  </div>
                  <StatusBadge status={s.rota_status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Upcoming Ships */}
        <Panel title="Upcoming Ships (next 7 days)">
          {upcoming.length === 0 ? (
            <Empty>No ships scheduled in the next 7 days.</Empty>
          ) : (
            <ul className="divide-y divide-vb-border">
              {upcoming.map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {s.ship_name}
                      <span className="text-vb-muted font-normal ml-2 text-xs">
                        {dayName(s.date)} {fmtDate(s.date)}
                      </span>
                    </p>
                    <p className="text-xs text-vb-muted">{s.dock ?? "—"}</p>
                  </div>
                  <StatusBadge status={s.rota_status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Staffing Gaps */}
        <Panel title="Staffing Gaps">
          {gaps.length === 0 ? (
            <Empty>No outstanding rotas — all ships have requirements inputted.</Empty>
          ) : (
            <ul className="divide-y divide-vb-border">
              {gaps.slice(0, 8).map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{s.ship_name}</p>
                    <p className="text-xs text-vb-muted">{fmtDate(s.date)}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-vb px-2 py-1">
                    Needs attention
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Season Overview */}
        <Panel title="Season Overview">
          <ul className="space-y-3">
            {perMonth.map((m) => (
              <li key={m.value}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <Link
                    href={`/rosters/${m.name.toLowerCase()}`}
                    className="font-semibold hover:text-vb-teal"
                  >
                    {m.name}
                  </Link>
                  <span className="text-vb-muted text-xs">
                    {m.count} ships · {m.pct}% complete
                  </span>
                </div>
                <div className="h-2 bg-vb-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vb-teal rounded-full"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Quick Links */}
      <div className="mt-5 flex flex-wrap gap-3">
        <QuickLink href={`/rosters/${currentSeasonMonth()}`} label="Current Month Roster" />
        <QuickLink href="/staff" label="Staff Setup" />
        <QuickLink href="/settings" label="Settings" />
      </div>
    </div>
  );
}

function currentSeasonMonth() {
  const m = new Date().getMonth() + 1;
  const match = SEASON_MONTHS.find((s) => s.value === m);
  return (match ?? SEASON_MONTHS[0]).name.toLowerCase();
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-vb-panel rounded-vb border border-vb-border p-5">
      <h2 className="font-heading font-semibold text-vb-navy text-sm uppercase tracking-wide mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-vb-muted py-4 text-center">{children}</p>;
}
function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="bg-vb-navy hover:bg-vb-navy-dark text-white text-sm font-semibold rounded-vb px-4 py-2.5 transition"
    >
      {label}
    </Link>
  );
}

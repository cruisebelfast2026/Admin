import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SEASON_MONTHS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function ShipRequestsPage() {
  return (
    <div>
      <PageHeader
        title="Ship Requests"
        subtitle="A standalone record of what each cruise line formally requested — independent of the operational rota."
      />
      <div className="bg-vb-panel rounded-vb border border-vb-border p-6">
        <span className="inline-block text-[11px] font-semibold bg-vb-teal-tint text-vb-navy rounded-vb px-2 py-1 mb-3">
          Phase 5
        </span>
        <p className="text-sm text-vb-muted mb-4 max-w-2xl">
          Each ship records the cruise line&apos;s requested Ambassador numbers,
          times and locations, requested shuttle times, the agent/company
          contact, and free-text notes. Changes to the rota&apos;s operational
          times never affect this record.
        </p>
        <p className="text-sm text-vb-muted mb-2">
          Open a month to work with its ship requests:
        </p>
        <div className="flex flex-wrap gap-2">
          {SEASON_MONTHS.map((m) => (
            <Link
              key={m.value}
              href={`/rosters/${m.name.toLowerCase()}`}
              className="bg-vb-navy hover:bg-vb-navy-dark text-white text-sm font-semibold rounded-vb px-4 py-2 transition"
            >
              {m.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

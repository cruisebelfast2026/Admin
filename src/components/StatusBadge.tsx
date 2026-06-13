import { ROTA_STATUSES, type RotaStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: RotaStatus }) {
  const s = ROTA_STATUSES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-vb px-2.5 py-1 text-[11px] font-semibold text-white whitespace-nowrap"
      style={{ backgroundColor: s.colorVar }}
    >
      {s.label}
    </span>
  );
}

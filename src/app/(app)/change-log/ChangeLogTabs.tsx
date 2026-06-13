"use client";

import { useMemo, useState } from "react";
import type { ChangeLogEntry } from "@/lib/types";

export function ChangeLogTabs({
  entries,
  changelog,
}: {
  entries: ChangeLogEntry[];
  changelog: string;
}) {
  const [tab, setTab] = useState<"admin" | "code">("admin");

  return (
    <div>
      <div className="flex gap-1 border-b border-vb-border mb-5">
        <TabButton active={tab === "admin"} onClick={() => setTab("admin")}>
          Admin Activity Log
        </TabButton>
        <TabButton active={tab === "code"} onClick={() => setTab("code")}>
          Code / Deployment Log
        </TabButton>
      </div>

      {tab === "admin" ? (
        <AdminLog entries={entries} />
      ) : (
        <CodeLog changelog={changelog} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition ${
        active
          ? "border-vb-teal text-vb-navy"
          : "border-transparent text-vb-muted hover:text-vb-text"
      }`}
    >
      {children}
    </button>
  );
}

function AdminLog({ entries }: { entries: ChangeLogEntry[] }) {
  const [admin, setAdmin] = useState("");
  const [action, setAction] = useState("");

  const admins = useMemo(
    () => Array.from(new Set(entries.map((e) => e.admin_name))).sort(),
    [entries],
  );
  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action_type))).sort(),
    [entries],
  );

  const filtered = entries.filter(
    (e) =>
      (!admin || e.admin_name === admin) &&
      (!action || e.action_type === action),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select label="Admin" value={admin} onChange={setAdmin} options={admins} />
        <Select label="Action type" value={action} onChange={setAction} options={actions} />
      </div>

      <div className="bg-vb-panel rounded-vb border border-vb-border overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-vb-muted px-4 py-8 text-center">
            No admin activity recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-vb-muted border-b border-vb-border">
                <th className="px-4 py-2 font-semibold">Timestamp</th>
                <th className="px-4 py-2 font-semibold">Admin</th>
                <th className="px-4 py-2 font-semibold">Action</th>
                <th className="px-4 py-2 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-vb-border last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-vb-muted">
                    {fmtTs(e.created_at)}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{e.admin_name}</td>
                  <td className="px-4 py-2.5">{prettyAction(e.action_type)}</td>
                  <td className="px-4 py-2.5 text-vb-muted">{e.entity_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CodeLog({ changelog }: { changelog: string }) {
  return (
    <div className="bg-vb-panel rounded-vb border border-vb-border p-6">
      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-vb-text">
        {changelog}
      </pre>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm">
      <span className="block text-xs font-semibold mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-vb border border-vb-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-vb-teal"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {prettyAction(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function fmtTs(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB") +
    " " +
    d.toLocaleTimeString("en-GB", { hour12: false })
  );
}
function prettyAction(a: string) {
  return a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

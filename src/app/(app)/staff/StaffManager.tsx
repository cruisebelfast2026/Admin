"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logChange } from "@/lib/changelog";
import type { Staff } from "@/lib/types";

type RoleKey =
  | "is_ambassador"
  | "is_coordinator"
  | "is_travel_advisor"
  | "is_volunteer";

const ROLE_LABELS: { key: RoleKey; label: string }[] = [
  { key: "is_ambassador", label: "Ambassador" },
  { key: "is_coordinator", label: "Coordinator" },
  { key: "is_travel_advisor", label: "Travel Advisor" },
  { key: "is_volunteer", label: "Volunteer" },
];

const blankForm = {
  first_name: "",
  last_initial: "",
  is_ambassador: false,
  is_coordinator: false,
  is_travel_advisor: false,
  is_volunteer: false,
};

export function StaffManager({
  initialStaff,
  configured,
}: {
  initialStaff: Staff[];
  configured: boolean;
}) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { team, volunteers } = useMemo(() => {
    const team = staff.filter((s) => !onlyVolunteer(s));
    const volunteers = staff.filter((s) => onlyVolunteer(s));
    return { team, volunteers };
  }, [staff]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function resetForm() {
    setForm(blankForm);
    setEditingId(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_initial.trim()) return;

    const supabase = createClient();
    if (!supabase) {
      // Offline/demo mode — update local state only.
      const display = `${form.first_name} ${form.last_initial.toUpperCase()}`;
      if (editingId) {
        setStaff((p) =>
          p.map((s) =>
            s.id === editingId
              ? { ...s, ...form, last_initial: form.last_initial.toUpperCase(), display_name: display }
              : s,
          ),
        );
      } else {
        setStaff((p) => [
          ...p,
          {
            id: crypto.randomUUID(),
            ...form,
            last_initial: form.last_initial.toUpperCase(),
            display_name: display,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      flash(editingId ? "Staff updated (demo)" : "Staff added (demo)");
      resetForm();
      return;
    }

    setBusy(true);
    const payload = {
      first_name: form.first_name.trim(),
      last_initial: form.last_initial.trim().toUpperCase().slice(0, 1),
      is_ambassador: form.is_ambassador,
      is_coordinator: form.is_coordinator,
      is_travel_advisor: form.is_travel_advisor,
      is_volunteer: form.is_volunteer,
    };

    if (editingId) {
      const before = staff.find((s) => s.id === editingId);
      const { data, error } = await supabase
        .from("staff")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (!error && data) {
        setStaff((p) => p.map((s) => (s.id === editingId ? (data as Staff) : s)));
        await logChange(supabase, {
          action_type: "staff_updated",
          entity_type: "staff",
          entity_id: editingId,
          old_value: before,
          new_value: data,
        });
        flash("Staff updated");
      }
    } else {
      const { data, error } = await supabase
        .from("staff")
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setStaff((p) => [...p, data as Staff]);
        await logChange(supabase, {
          action_type: "staff_added",
          entity_type: "staff",
          entity_id: (data as Staff).id,
          new_value: data,
        });
        flash("Staff added");
      }
    }
    setBusy(false);
    resetForm();
  }

  function edit(s: Staff) {
    setEditingId(s.id);
    setForm({
      first_name: s.first_name,
      last_initial: s.last_initial,
      is_ambassador: s.is_ambassador,
      is_coordinator: s.is_coordinator,
      is_travel_advisor: s.is_travel_advisor,
      is_volunteer: s.is_volunteer,
    });
  }

  async function toggleActive(s: Staff) {
    const next = !s.is_active;
    setStaff((p) => p.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
    const supabase = createClient();
    if (supabase) {
      await supabase.from("staff").update({ is_active: next }).eq("id", s.id);
      await logChange(supabase, {
        action_type: next ? "staff_reactivated" : "staff_deactivated",
        entity_type: "staff",
        entity_id: s.id,
        old_value: { is_active: s.is_active },
        new_value: { is_active: next },
      });
    }
    flash(next ? "Staff reactivated" : "Staff deactivated");
  }

  const display =
    form.first_name && form.last_initial
      ? `${form.first_name} ${form.last_initial.toUpperCase()}`
      : "—";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Form */}
      <form
        onSubmit={save}
        className="bg-vb-panel rounded-vb border border-vb-border p-5 h-fit lg:sticky lg:top-6"
      >
        <h2 className="font-heading font-semibold text-vb-navy mb-4">
          {editingId ? "Edit staff member" : "Add staff member"}
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-1">First name</label>
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Last initial</label>
            <input
              maxLength={1}
              value={form.last_initial}
              onChange={(e) => setForm({ ...form, last_initial: e.target.value })}
              className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm uppercase focus:outline-none focus:border-vb-teal"
            />
          </div>
        </div>

        <div className="mb-3">
          <span className="block text-xs font-semibold mb-1">Display name</span>
          <div className="rounded-vb bg-vb-teal-tint px-3 py-2 text-sm font-semibold text-vb-navy">
            {display}
          </div>
        </div>

        <fieldset className="mb-4">
          <legend className="text-xs font-semibold mb-2">Role(s)</legend>
          <div className="space-y-2">
            {ROLE_LABELS.map((r) => (
              <label key={r.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[r.key]}
                  onChange={(e) => setForm({ ...form, [r.key]: e.target.checked })}
                  className="accent-vb-teal w-4 h-4"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-vb-navy hover:bg-vb-navy-dark text-white font-semibold rounded-vb py-2 text-sm transition disabled:opacity-60"
          >
            {editingId ? "Save changes" : "Add staff"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-vb border border-vb-border px-4 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Lists */}
      <div className="lg:col-span-2 space-y-5">
        {!configured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-vb px-4 py-3">
            Supabase is not configured — running in <strong>demo mode</strong>.
            Changes are not saved. Set the Supabase env vars to persist data.
          </div>
        )}

        <StaffTable
          title="Team (Ambassadors · Travel Advisors · Coordinators)"
          rows={team}
          onEdit={edit}
          onToggle={toggleActive}
        />

        <VolunteerList rows={volunteers} onEdit={edit} onToggle={toggleActive} />
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-vb-navy text-white text-sm rounded-vb px-4 py-2.5 shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function onlyVolunteer(s: Staff) {
  return (
    s.is_volunteer &&
    !s.is_ambassador &&
    !s.is_coordinator &&
    !s.is_travel_advisor
  );
}

function RolePills({ s }: { s: Staff }) {
  const roles = [
    s.is_ambassador && "Ambassador",
    s.is_coordinator && "Coordinator",
    s.is_travel_advisor && "TA",
    s.is_volunteer && "Volunteer",
  ].filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="text-[10px] bg-vb-teal-tint text-vb-navy rounded px-1.5 py-0.5 font-semibold"
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function StaffTable({
  title,
  rows,
  onEdit,
  onToggle,
}: {
  title: string;
  rows: Staff[];
  onEdit: (s: Staff) => void;
  onToggle: (s: Staff) => void;
}) {
  return (
    <section className="bg-vb-panel rounded-vb border border-vb-border overflow-hidden">
      <h2 className="font-heading font-semibold text-vb-navy text-sm px-4 py-3 border-b border-vb-border">
        {title} <span className="text-vb-muted font-normal">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-vb-muted px-4 py-6 text-center">No staff yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-vb-muted border-b border-vb-border">
              <th className="px-4 py-2 font-semibold">Display name</th>
              <th className="px-4 py-2 font-semibold">Roles</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className={`border-b border-vb-border last:border-0 ${
                  s.is_active ? "" : "opacity-50"
                }`}
              >
                <td className="px-4 py-2.5 font-semibold">{s.display_name}</td>
                <td className="px-4 py-2.5">
                  <RolePills s={s} />
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-[11px] font-semibold rounded-vb px-2 py-0.5 ${
                      s.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(s)}
                    className="text-vb-teal hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggle(s)}
                    className="text-vb-muted hover:underline"
                  >
                    {s.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function VolunteerList({
  rows,
  onEdit,
  onToggle,
}: {
  rows: Staff[];
  onEdit: (s: Staff) => void;
  onToggle: (s: Staff) => void;
}) {
  return (
    <section className="bg-vb-panel rounded-vb border border-vb-border overflow-hidden">
      <h2 className="font-heading font-semibold text-vb-navy text-sm px-4 py-3 border-b border-vb-border">
        Volunteers{" "}
        <span className="text-vb-muted font-normal">
          (name-only list · {rows.length})
        </span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-vb-muted px-4 py-6 text-center">
          No volunteers yet. Tick only the Volunteer role to add a name-only
          volunteer.
        </p>
      ) : (
        <ul className="divide-y divide-vb-border">
          {rows.map((s) => (
            <li
              key={s.id}
              className={`px-4 py-2.5 flex items-center justify-between ${
                s.is_active ? "" : "opacity-50"
              }`}
            >
              <span className="font-semibold text-sm">{s.display_name}</span>
              <span className="whitespace-nowrap">
                <button
                  onClick={() => onEdit(s)}
                  className="text-vb-teal hover:underline text-sm mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onToggle(s)}
                  className="text-vb-muted hover:underline text-sm"
                >
                  {s.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

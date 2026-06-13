"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface EmailSettings {
  id?: string;
  enabled: boolean;
  provider: string;
  from_address: string | null;
  api_key: string | null;
  notify_on_rota_sent: boolean;
  notify_on_shift_confirmed: boolean;
}

const BLANK: EmailSettings = {
  enabled: false,
  provider: "resend",
  from_address: "",
  api_key: "",
  notify_on_rota_sent: true,
  notify_on_shift_confirmed: true,
};

export function EmailSettingsManager() {
  const [s, setS] = useState<EmailSettings>(BLANK);
  const [configured] = useState(() => isSupabaseConfigured());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setS({ ...BLANK, ...data });
      });
  }, []);

  async function save() {
    const supabase = createClient();
    if (!supabase) return;
    const { id, ...rest } = s;
    const q = id
      ? supabase.from("email_settings").update(rest).eq("id", id)
      : supabase.from("email_settings").insert(rest);
    const { error } = await q;
    setToast(error ? "Error: " + error.message : "Email settings saved");
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div>
      <p className="text-sm text-vb-muted mb-3">
        Infrastructure is wired but <strong>inactive</strong> — notifications are
        not sent yet. Configuration is stored for a future release.
      </p>

      {!configured && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-vb px-3 py-2 mb-3">
          Configure Supabase to persist email settings.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm mb-3">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => setS({ ...s, enabled: e.target.checked })}
          className="accent-vb-teal w-4 h-4"
        />
        Enable notifications (master switch — currently a stub)
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Provider (resend / sendgrid / smtp)" value={s.provider}
          onChange={(v) => setS({ ...s, provider: v })} />
        <Field label="From address" value={s.from_address ?? ""} placeholder="rota@…"
          onChange={(v) => setS({ ...s, from_address: v })} />
        <Field label="API key" value={s.api_key ?? ""} placeholder="••••••" password
          onChange={(v) => setS({ ...s, api_key: v })} />
      </div>

      <div className="space-y-1.5 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.notify_on_rota_sent}
            onChange={(e) => setS({ ...s, notify_on_rota_sent: e.target.checked })}
            className="accent-vb-teal w-4 h-4" />
          Notify on Rota Sent
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.notify_on_shift_confirmed}
            onChange={(e) => setS({ ...s, notify_on_shift_confirmed: e.target.checked })}
            className="accent-vb-teal w-4 h-4" />
          Notify on Shift Confirmed
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={!configured}
          className="bg-vb-navy hover:bg-vb-navy-dark text-white text-sm font-semibold rounded-vb px-4 py-2 disabled:opacity-60">
          Save email settings
        </button>
        {toast && <span className="text-sm text-vb-teal-dark font-semibold">{toast}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, password }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; password?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1">{label}</span>
      <input type={password ? "password" : "text"} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal" />
    </label>
  );
}

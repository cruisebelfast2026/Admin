"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  deleteSignage,
  listSignage,
  signageUrl,
  uploadSignage,
  type SignageRow,
} from "@/lib/signage";

export function ShuttleSignageManager() {
  const [rows, setRows] = useState<SignageRow[]>([]);
  const [cruiseLine, setCruiseLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured] = useState(() => isSupabaseConfigured());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    listSignage(supabase).then(setRows).catch(() => {});
  }, []);

  async function onUpload() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!cruiseLine.trim() || !file) {
      setError("Enter a cruise line and choose a PDF.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase not configured.");
      return;
    }
    setBusy(true);
    try {
      const row = await uploadSignage(supabase, cruiseLine, file);
      if (row) setRows((p) => [...p.filter((r) => r.cruise_line !== row.cruise_line), row]);
      setCruiseLine("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(row: SignageRow) {
    const supabase = createClient();
    if (!supabase) return;
    const url = await signageUrl(supabase, row.storage_path);
    if (url) window.open(url, "_blank");
  }

  async function onDelete(row: SignageRow) {
    const supabase = createClient();
    if (!supabase) return;
    await deleteSignage(supabase, row);
    setRows((p) => p.filter((r) => r.id !== row.id));
  }

  return (
    <div>
      <p className="text-sm text-vb-muted mb-3">
        Upload one PDF per cruise line. On the rota download screen the system
        matches the ship&apos;s cruise line and offers the relevant signage PDF.
      </p>

      {!configured ? (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-vb px-3 py-2">
          Configure Supabase (and create a Storage bucket named{" "}
          <code>signage</code>) to upload signage PDFs.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <label className="block">
              <span className="text-xs font-semibold text-vb-muted">Cruise line</span>
              <input
                value={cruiseLine}
                onChange={(e) => setCruiseLine(e.target.value)}
                placeholder="e.g. P&O Cruises"
                className="block border border-vb-border rounded px-2 py-1.5 text-sm mt-0.5"
              />
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="text-sm file:mr-2 file:rounded-vb file:border-0 file:bg-vb-navy file:text-white file:px-3 file:py-1.5 file:font-semibold file:cursor-pointer"
            />
            <button
              onClick={onUpload}
              disabled={busy}
              className="bg-vb-teal hover:bg-vb-teal-dark text-white text-sm font-semibold rounded-vb px-4 py-1.5 disabled:opacity-60"
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

          {rows.length > 0 && (
            <ul className="divide-y divide-vb-border border border-vb-border rounded-vb">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{r.cruise_line}</span>
                    <span className="text-vb-muted ml-2 text-xs">{r.file_name}</span>
                  </span>
                  <span className="whitespace-nowrap">
                    <button onClick={() => onDownload(r)} className="text-vb-teal hover:underline mr-3">Download</button>
                    <button onClick={() => onDelete(r)} className="text-red-600 hover:underline">Remove</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

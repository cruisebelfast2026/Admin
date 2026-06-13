/**
 * Shuttle signage PDFs (Build Brief Sections 14.6 / 13.4).
 * One PDF per cruise line, stored in the Supabase Storage bucket `signage`
 * with a mapping row in `shuttle_signage`. On the rota download screen the
 * ship's cruise line is matched to offer the relevant PDF.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const SIGNAGE_BUCKET = "signage";

export interface SignageRow {
  id: string;
  cruise_line: string;
  storage_path: string;
  file_name: string | null;
  uploaded_at: string;
}

export async function listSignage(
  supabase: SupabaseClient,
): Promise<SignageRow[]> {
  const { data } = await supabase
    .from("shuttle_signage")
    .select("*")
    .order("cruise_line");
  return (data as SignageRow[]) ?? [];
}

export async function uploadSignage(
  supabase: SupabaseClient,
  cruiseLine: string,
  file: File,
): Promise<SignageRow | null> {
  const safe = cruiseLine.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${safe}/${Date.now()}-${file.name}`;
  const up = await supabase.storage
    .from(SIGNAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (up.error) throw new Error(up.error.message);

  const { data } = await supabase
    .from("shuttle_signage")
    .upsert(
      { cruise_line: cruiseLine.trim(), storage_path: path, file_name: file.name },
      { onConflict: "cruise_line" },
    )
    .select()
    .single();
  return (data as SignageRow) ?? null;
}

/** Resolve a temporary signed URL for downloading a signage PDF. */
export async function signageUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(SIGNAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  return data?.signedUrl ?? null;
}

/** Find the signage row for a ship's cruise line (case-insensitive). */
export async function signageForCruiseLine(
  supabase: SupabaseClient,
  cruiseLine: string | null,
): Promise<SignageRow | null> {
  if (!cruiseLine) return null;
  const { data } = await supabase
    .from("shuttle_signage")
    .select("*")
    .ilike("cruise_line", cruiseLine.trim())
    .maybeSingle();
  return (data as SignageRow) ?? null;
}

export async function deleteSignage(
  supabase: SupabaseClient,
  row: SignageRow,
): Promise<void> {
  await supabase.storage.from(SIGNAGE_BUCKET).remove([row.storage_path]);
  await supabase.from("shuttle_signage").delete().eq("id", row.id);
}

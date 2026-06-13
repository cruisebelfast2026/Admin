import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (client components).
 * Returns null when env vars are not configured so the UI can degrade
 * gracefully in preview/build environments without a Supabase project.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

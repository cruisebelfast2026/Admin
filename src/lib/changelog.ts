import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Records an admin action in the change_log table (Section 15.1).
 * Snapshots the acting admin's name at the time of the change.
 * Best-effort — logging failures never block the underlying action.
 */
export async function logChange(
  supabase: SupabaseClient,
  entry: {
    action_type: string;
    entity_type: string;
    entity_id?: string | null;
    old_value?: unknown;
    new_value?: unknown;
  },
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let adminName = "Unknown";
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      adminName =
        (profile?.full_name as string) ??
        (user.email?.split("@")[0] ?? "Unknown");
    }

    await supabase.from("change_log").insert({
      user_id: user?.id ?? null,
      admin_name: adminName,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      old_value: entry.old_value ?? null,
      new_value: entry.new_value ?? null,
    });
  } catch {
    // Swallow — logging is non-critical.
  }
}

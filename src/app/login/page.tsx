"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-vb-navy px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl text-white tracking-tight">
            Rota Manager
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Visit Belfast · Cruise Welcome Ambassador Operations
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-vb shadow-lg p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-vb-text mb-1">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-vb-text mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-vb border border-vb-border px-3 py-2 text-sm focus:outline-none focus:border-vb-teal"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-vb px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vb-navy hover:bg-vb-navy-dark text-white font-semibold rounded-vb py-2.5 text-sm transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {!isSupabaseConfigured() && (
            <p className="text-[11px] text-vb-muted text-center pt-1">
              Configure Supabase env vars to enable authentication.
            </p>
          )}
        </form>

        <p className="text-center text-white/40 text-[11px] mt-6">
          Internal tool · Authorised personnel only
        </p>
      </div>
    </div>
  );
}

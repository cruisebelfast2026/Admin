"use client";

import { useEffect, useState } from "react";

/**
 * Season year selector. Defaults to the current year and preserves all
 * historical years. Persisted to localStorage so the choice survives reloads.
 * (Phase 1: drives a shared client value; wired into data queries in later
 * phases.)
 */
const STORAGE_KEY = "rota-manager-year";

export function YearSelector() {
  const current = new Date().getFullYear();
  const [year, setYear] = useState<number>(current);

  useEffect(() => {
    // Sync from the browser store once after mount (SSR-safe; no window during render).
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setYear(Number(stored));
  }, []);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const y = Number(e.target.value);
    setYear(y);
    window.localStorage.setItem(STORAGE_KEY, String(y));
    window.dispatchEvent(new CustomEvent("rota-year-change", { detail: y }));
  }

  // Show a window of historical + near-future seasons.
  const years = [];
  for (let y = current + 1; y >= 2024; y--) years.push(y);

  return (
    <select
      value={year}
      onChange={onChange}
      className="w-full bg-white/10 text-white text-sm rounded-vb px-3 py-2 border border-white/20 focus:outline-none focus:border-vb-teal"
    >
      {years.map((y) => (
        <option key={y} value={y} className="text-vb-text">
          {y} Season
        </option>
      ))}
    </select>
  );
}

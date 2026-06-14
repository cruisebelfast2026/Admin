"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SEASON_YEAR_COOKIE } from "@/lib/constants";

/**
 * Season year selector. Defaults to the current year and preserves all
 * historical years. The choice is stored in a cookie so server components
 * (Dashboard, monthly rosters) scope their queries to the selected year.
 */
function readCookieYear(): number | null {
  const m = document.cookie.match(new RegExp(`${SEASON_YEAR_COOKIE}=(\\d{4})`));
  return m ? Number(m[1]) : null;
}

export function YearSelector() {
  const router = useRouter();
  const current = new Date().getFullYear();
  const [year, setYear] = useState<number>(current);

  useEffect(() => {
    const stored = readCookieYear();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setYear(stored);
  }, []);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const y = Number(e.target.value);
    setYear(y);
    // 1 year expiry; path=/ so every page sees it.
    document.cookie = `${SEASON_YEAR_COOKIE}=${y}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

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

import { cookies } from "next/headers";
import { SEASON_YEAR_COOKIE } from "./constants";

/** The selected season year (from the cookie), defaulting to the current year. */
export async function getSeasonYear(): Promise<number> {
  const store = await cookies();
  const raw = store.get(SEASON_YEAR_COOKIE)?.value;
  const year = raw ? Number(raw) : NaN;
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

import { addDays, todayInAppTz } from "./timezone";

/**
 * Project an estimated goal-weight date from weigh-in history.
 *
 * Fits a least-squares linear trend to all weigh-ins (value vs. days), which
 * captures the user's *average pace* and how long they've been at it, then
 * extends that line to the goal weight. Unit-agnostic — pass values and the
 * goal in the same unit (lbs or kg). Pure and safe on client or server.
 */

export type WeighPoint = { date: string; value: number };

export type ForecastStatus =
  | "reached" // already at/past the goal
  | "insufficient" // not enough history to estimate
  | "stalled" // trend is essentially flat
  | "diverging" // trending away from the goal
  | "on_track"; // has a projected date

export type GoalForecast = {
  status: ForecastStatus;
  current: number | null; // latest actual weigh-in
  goal: number;
  baseline: number | null; // start weight used for the progress bar
  progress: number | null; // 0..1 toward goal from baseline
  ratePerWeek: number | null; // signed (negative = losing)
  etaDate: string | null; // YYYY-MM-DD
  daysRemaining: number | null;
  weeksRemaining: number | null;
};

// Tuning
const MIN_POINTS = 2;
const MIN_SPAN_DAYS = 7;
const STALL_PER_WEEK = 0.1; // |rate| below this (value units/wk) reads as flat
const REACHED_TOLERANCE = 0.2; // within this of goal counts as reached

function daysBetween(a: string, b: string): number {
  const msA = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const msB = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((msB - msA) / 86_400_000);
}

export function forecastGoal(
  input: WeighPoint[],
  goal: number | null | undefined,
  startWeight?: number | null,
): GoalForecast | null {
  if (goal == null) return null;

  const points = input
    .filter((p) => p && Number.isFinite(p.value) && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const current = points.length ? points[points.length - 1].value : null;
  const baseline = startWeight ?? (points.length ? points[0].value : null);

  let progress: number | null = null;
  if (baseline != null && current != null && baseline !== goal) {
    progress = Math.max(0, Math.min(1, (baseline - current) / (baseline - goal)));
  }

  const base = (
    status: ForecastStatus,
    extra: Partial<GoalForecast> = {},
  ): GoalForecast => ({
    status,
    current,
    goal,
    baseline,
    progress,
    ratePerWeek: null,
    etaDate: null,
    daysRemaining: null,
    weeksRemaining: null,
    ...extra,
  });

  if (current == null) return base("insufficient");

  const losing = goal < current;

  // Already there?
  if (
    (losing && current <= goal + REACHED_TOLERANCE) ||
    (!losing && current >= goal - REACHED_TOLERANCE)
  ) {
    return base("reached", { progress: progress ?? 1 });
  }

  if (points.length < MIN_POINTS) return base("insufficient");

  const first = points[0];
  const span = daysBetween(first.date, points[points.length - 1].date);
  if (span < MIN_SPAN_DAYS) return base("insufficient");

  // Least-squares regression: x = days since first weigh-in, y = value.
  const xs = points.map((p) => daysBetween(first.date, p.date));
  const ys = points.map((p) => p.value);
  const n = points.length;
  const xbar = xs.reduce((s, x) => s + x, 0) / n;
  const ybar = ys.reduce((s, y) => s + y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - xbar) ** 2;
    sxy += (xs[i] - xbar) * (ys[i] - ybar);
  }
  if (sxx === 0) return base("insufficient");

  const slopePerDay = sxy / sxx;
  const intercept = ybar - slopePerDay * xbar;
  const ratePerWeek = slopePerDay * 7;

  if (Math.abs(ratePerWeek) < STALL_PER_WEEK) {
    return base("stalled", { ratePerWeek });
  }

  const movingToward = losing ? slopePerDay < 0 : slopePerDay > 0;
  if (!movingToward) return base("diverging", { ratePerWeek });

  // Day index where the trend line crosses the goal.
  const xGoal = (goal - intercept) / slopePerDay;
  const today = todayInAppTz();
  const xToday = daysBetween(first.date, today);
  const daysRemaining = Math.max(0, Math.round(xGoal - xToday));
  const etaDate = addDays(today, daysRemaining);

  return base("on_track", {
    ratePerWeek,
    etaDate,
    daysRemaining,
    weeksRemaining: Math.round((daysRemaining / 7) * 10) / 10,
  });
}

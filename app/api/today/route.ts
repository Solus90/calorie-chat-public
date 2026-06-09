import { NextResponse } from "next/server";
import {
  getDailySummary,
  getLatestWeight,
  getRolling7DayAverage,
  getSettings,
  getWeekDailyTotals,
} from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import {
  isValidDateStr,
  isWithinLastDays,
  lastNDays,
  todayInAppTz,
} from "@/lib/timezone";
import { kgToDisplay, roundWeight, weightUnitLabel } from "@/lib/units";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profileId = await getActiveProfileId();
  const today = todayInAppTz();

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  let date = today;
  if (dateParam) {
    if (!isValidDateStr(dateParam)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (!isWithinLastDays(dateParam, 7, today)) {
      return NextResponse.json(
        { error: "Date must be within the last 7 days" },
        { status: 400 },
      );
    }
    date = dateParam;
  }

  const [summary, settings, latest, week, rollingAvg] = await Promise.all([
    getDailySummary(profileId, date),
    getSettings(profileId),
    date === today ? getLatestWeight(profileId) : Promise.resolve(null),
    getWeekDailyTotals(profileId),
    getRolling7DayAverage(profileId),
  ]);

  const unit = weightUnitLabel(settings.unit_system);

  return NextResponse.json({
    date: summary.date,
    today,
    total: summary.total,
    limit: summary.limit,
    remaining: summary.remaining,
    entries: summary.entries,
    week,
    rolling_avg_7d: rollingAvg,
    week_days: lastNDays(7, today),
    unit,
    goal_weight:
      settings.goal_weight_kg != null
        ? roundWeight(kgToDisplay(settings.goal_weight_kg, settings.unit_system))
        : null,
    latest_weight: latest
      ? {
          value: roundWeight(kgToDisplay(latest.weight_kg, settings.unit_system)),
          recorded_on: latest.recorded_on,
        }
      : null,
  });
}

import { NextResponse } from "next/server";
import { getCalorieSeries, getSettings, getWeightSeries } from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import { kgToDisplay, roundWeight, weightUnitLabel } from "@/lib/units";

export const dynamic = "force-dynamic";

export async function GET() {
  const profileId = await getActiveProfileId();
  const [settings, weights, calories] = await Promise.all([
    getSettings(profileId),
    getWeightSeries(profileId, 365),
    getCalorieSeries(profileId, 30),
  ]);

  const unit = weightUnitLabel(settings.unit_system);

  return NextResponse.json({
    unit,
    goal_weight:
      settings.goal_weight_kg != null
        ? roundWeight(kgToDisplay(settings.goal_weight_kg, settings.unit_system))
        : null,
    start_weight:
      settings.start_weight_kg != null
        ? roundWeight(kgToDisplay(settings.start_weight_kg, settings.unit_system))
        : null,
    daily_calorie_limit: settings.daily_calorie_limit,
    weights: weights.map((w) => ({
      date: w.recorded_on,
      weight: roundWeight(kgToDisplay(w.weight_kg, settings.unit_system)),
    })),
    calories,
  });
}

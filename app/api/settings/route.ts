import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/queries";
import {
  getActiveProfileId,
  getProfiles,
  updateProfileName,
} from "@/lib/profile";
import {
  displayToKg,
  kgToDisplay,
  roundWeight,
  weightUnitLabel,
  type UnitSystem,
} from "@/lib/units";

export const dynamic = "force-dynamic";

export async function GET() {
  const profileId = await getActiveProfileId();
  const [s, profiles] = await Promise.all([getSettings(profileId), getProfiles()]);
  const profileName = profiles.find((p) => p.id === profileId)?.name ?? "";
  return NextResponse.json({
    profile_id: profileId,
    profile_name: profileName,
    unit_system: s.unit_system,
    unit: weightUnitLabel(s.unit_system),
    daily_calorie_limit: s.daily_calorie_limit,
    goal_weight:
      s.goal_weight_kg != null
        ? roundWeight(kgToDisplay(s.goal_weight_kg, s.unit_system))
        : null,
    start_weight:
      s.start_weight_kg != null
        ? roundWeight(kgToDisplay(s.start_weight_kg, s.unit_system))
        : null,
    assistant_notes: s.assistant_notes ?? "",
  });
}

export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const body = await req.json();
  const unitSystem: UnitSystem =
    body.unit_system === "metric" ? "metric" : "imperial";

  const patch: Record<string, unknown> = { unit_system: unitSystem };

  if (body.daily_calorie_limit != null && body.daily_calorie_limit !== "") {
    patch.daily_calorie_limit = Math.round(Number(body.daily_calorie_limit));
  }
  if (body.goal_weight != null && body.goal_weight !== "") {
    patch.goal_weight_kg = displayToKg(Number(body.goal_weight), unitSystem);
  }
  if (body.start_weight != null && body.start_weight !== "") {
    patch.start_weight_kg = displayToKg(Number(body.start_weight), unitSystem);
  }
  if (typeof body.assistant_notes === "string") {
    patch.assistant_notes = body.assistant_notes.trim() || null;
  }

  if (typeof body.profile_name === "string" && body.profile_name.trim()) {
    await updateProfileName(profileId, body.profile_name);
  }

  const next = await updateSettings(profileId, patch);
  return NextResponse.json({
    unit_system: next.unit_system,
    unit: weightUnitLabel(next.unit_system),
    daily_calorie_limit: next.daily_calorie_limit,
    goal_weight:
      next.goal_weight_kg != null
        ? roundWeight(kgToDisplay(next.goal_weight_kg, next.unit_system))
        : null,
    start_weight:
      next.start_weight_kg != null
        ? roundWeight(kgToDisplay(next.start_weight_kg, next.unit_system))
        : null,
    assistant_notes: next.assistant_notes ?? "",
  });
}

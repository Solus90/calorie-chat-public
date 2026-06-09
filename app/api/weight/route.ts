import { NextResponse } from "next/server";
import { getSettings, logWeight } from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import { displayToKg } from "@/lib/units";

export async function POST(req: Request) {
  const body = await req.json();
  const value = Number(body.weight);
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
  }
  const profileId = await getActiveProfileId();
  const settings = await getSettings(profileId);
  await logWeight({
    profileId,
    weight_kg: displayToKg(value, settings.unit_system),
    recorded_on: body.recorded_on,
  });
  return NextResponse.json({ ok: true });
}

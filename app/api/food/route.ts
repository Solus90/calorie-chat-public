import { NextResponse } from "next/server";
import { logFood } from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import { isValidDateStr, isWithinLastDays, todayInAppTz } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const MEALS = new Set(["breakfast", "lunch", "dinner", "snack"]);

/** Manually log food (including backdated entries within the last 7 days). */
export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const today = todayInAppTz();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const description = String(body.description ?? "").trim();
  const calories = Number(body.calories);
  const mealRaw = body.meal != null ? String(body.meal) : undefined;
  const eatenOnRaw = body.eaten_on != null ? String(body.eaten_on) : today;

  if (!description) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }
  if (!Number.isFinite(calories) || calories <= 0) {
    return NextResponse.json({ error: "Calories must be a positive number" }, { status: 400 });
  }
  if (!isValidDateStr(eatenOnRaw)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!isWithinLastDays(eatenOnRaw, 7, today)) {
    return NextResponse.json(
      { error: "Can only log within the last 7 days" },
      { status: 400 },
    );
  }
  if (mealRaw && !MEALS.has(mealRaw)) {
    return NextResponse.json({ error: "Invalid meal" }, { status: 400 });
  }

  const { id } = await logFood({
    profileId,
    description,
    calories: Math.round(calories),
    meal: mealRaw as "breakfast" | "lunch" | "dinner" | "snack" | undefined,
    eaten_on: eatenOnRaw,
    source: "manual",
  });

  return NextResponse.json({ ok: true, id, eaten_on: eatenOnRaw });
}

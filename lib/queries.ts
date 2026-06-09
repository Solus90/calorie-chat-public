import { getSupabase } from "./supabase";
import { lastNDays } from "./timezone";
import { todayLocal, type UnitSystem } from "./units";

export type Settings = {
  goal_weight_kg: number | null;
  start_weight_kg: number | null;
  daily_calorie_limit: number | null;
  unit_system: UnitSystem;
  assistant_notes: string | null;
};

export type FoodEntry = {
  id: string;
  eaten_on: string;
  eaten_at: string;
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null;
  description: string;
  calories: number;
  source: "chat" | "manual";
};

export type WeightEntry = {
  recorded_on: string;
  weight_kg: number;
  note: string | null;
};

export type DailySummary = {
  date: string;
  limit: number | null;
  total: number;
  remaining: number | null;
  entries: FoodEntry[];
};

const SETTINGS_COLS =
  "goal_weight_kg, start_weight_kg, daily_calorie_limit, unit_system, assistant_notes";

const DEFAULT_SETTINGS: Settings = {
  goal_weight_kg: null,
  start_weight_kg: null,
  daily_calorie_limit: null,
  unit_system: "imperial",
  assistant_notes: null,
};

// ---------------------------------------------------------------------------
// Settings (one row per profile)
// ---------------------------------------------------------------------------
export async function getSettings(profileId: string): Promise<Settings> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("settings")
    .select(SETTINGS_COLS)
    .eq("profile_id", profileId)
    .single();

  if (error || !data) return { ...DEFAULT_SETTINGS };
  return data as Settings;
}

export async function updateSettings(
  profileId: string,
  patch: Partial<Settings>,
): Promise<Settings> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .select(SETTINGS_COLS)
    .single();

  if (error) throw new Error(error.message);
  return data as Settings;
}

// ---------------------------------------------------------------------------
// Food entries
// ---------------------------------------------------------------------------
export async function getDailySummary(
  profileId: string,
  date?: string,
): Promise<DailySummary> {
  const sb = getSupabase();
  const day = date ?? todayLocal();

  const [{ data: entries }, settings] = await Promise.all([
    sb
      .from("food_entries")
      .select("id, eaten_on, eaten_at, meal, description, calories, source")
      .eq("profile_id", profileId)
      .eq("eaten_on", day)
      .order("eaten_at", { ascending: true }),
    getSettings(profileId),
  ]);

  const list = (entries ?? []) as FoodEntry[];
  const total = list.reduce((sum, e) => sum + e.calories, 0);
  const limit = settings.daily_calorie_limit;

  return {
    date: day,
    limit,
    total,
    remaining: limit == null ? null : limit - total,
    entries: list,
  };
}

export async function logFood(input: {
  profileId: string;
  description: string;
  calories: number;
  meal?: FoodEntry["meal"];
  eaten_on?: string;
  source?: "chat" | "manual";
}): Promise<{ id: string }> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("food_entries")
    .insert({
      profile_id: input.profileId,
      description: input.description,
      calories: Math.round(input.calories),
      meal: input.meal ?? null,
      eaten_on: input.eaten_on ?? todayLocal(),
      source: input.source ?? "chat",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

/** Find one entry by id, or by fuzzy description match on a given day. */
export async function findFoodEntry(
  profileId: string,
  ref: { id?: string; description?: string },
  day?: string,
): Promise<FoodEntry | null> {
  const sb = getSupabase();
  const cols = "id, eaten_on, eaten_at, meal, description, calories, source";
  if (ref.id) {
    const { data } = await sb
      .from("food_entries")
      .select(cols)
      .eq("profile_id", profileId)
      .eq("id", ref.id)
      .maybeSingle();
    return (data as FoodEntry) ?? null;
  }
  if (ref.description) {
    const { data } = await sb
      .from("food_entries")
      .select(cols)
      .eq("profile_id", profileId)
      .eq("eaten_on", day ?? todayLocal())
      .ilike("description", `%${ref.description}%`)
      .order("eaten_at", { ascending: false })
      .limit(1);
    return ((data as FoodEntry[]) ?? [])[0] ?? null;
  }
  return null;
}

export async function editFoodEntry(
  profileId: string,
  id: string,
  patch: { description?: string; calories?: number; meal?: FoodEntry["meal"] },
): Promise<void> {
  const sb = getSupabase();
  const clean: Record<string, unknown> = {};
  if (patch.description != null) clean.description = patch.description;
  if (patch.calories != null) clean.calories = Math.round(patch.calories);
  if (patch.meal != null) clean.meal = patch.meal;
  const { error } = await sb
    .from("food_entries")
    .update(clean)
    .eq("profile_id", profileId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFoodEntry(
  profileId: string,
  id: string,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("food_entries")
    .delete()
    .eq("profile_id", profileId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Weight entries
// ---------------------------------------------------------------------------
export async function logWeight(input: {
  profileId: string;
  weight_kg: number;
  recorded_on?: string;
  note?: string;
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("weight_entries").upsert(
    {
      profile_id: input.profileId,
      recorded_on: input.recorded_on ?? todayLocal(),
      weight_kg: input.weight_kg,
      note: input.note ?? null,
    },
    { onConflict: "profile_id,recorded_on" },
  );
  if (error) throw new Error(error.message);
}

export async function getWeightSeries(
  profileId: string,
  limitDays = 365,
): Promise<WeightEntry[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("weight_entries")
    .select("recorded_on, weight_kg, note")
    .eq("profile_id", profileId)
    .order("recorded_on", { ascending: true })
    .limit(limitDays);
  return (data ?? []) as WeightEntry[];
}

export async function getLatestWeight(
  profileId: string,
): Promise<WeightEntry | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("weight_entries")
    .select("recorded_on, weight_kg, note")
    .eq("profile_id", profileId)
    .order("recorded_on", { ascending: false })
    .limit(1);
  return ((data as WeightEntry[]) ?? [])[0] ?? null;
}

// ---------------------------------------------------------------------------
// Progress (calorie history series)
// ---------------------------------------------------------------------------
export type CalorieDay = { date: string; total: number };

export type WeekDayTotal = { date: string; total: number };

/** Per-day calorie totals for the last 7 days (including days with zero). */
export async function getWeekDailyTotals(
  profileId: string,
): Promise<WeekDayTotal[]> {
  const days = lastNDays(7);
  const since = days[0];

  const sb = getSupabase();
  const { data } = await sb
    .from("food_entries")
    .select("eaten_on, calories")
    .eq("profile_id", profileId)
    .gte("eaten_on", since)
    .lte("eaten_on", days[days.length - 1]);

  const byDay = new Map<string, number>();
  for (const day of days) byDay.set(day, 0);
  for (const row of (data ?? []) as { eaten_on: string; calories: number }[]) {
    byDay.set(row.eaten_on, (byDay.get(row.eaten_on) ?? 0) + row.calories);
  }
  return days.map((date) => ({ date, total: byDay.get(date) ?? 0 }));
}

/** Rolling 7-day average (logged days only — days with no entries are excluded). */
export async function getRolling7DayAverage(
  profileId: string,
): Promise<number> {
  const totals = await getWeekDailyTotals(profileId);
  const active = totals.filter((d) => d.total > 0);
  if (active.length === 0) return 0;
  const sum = active.reduce((s, d) => s + d.total, 0);
  return Math.round(sum / active.length);
}

// ---------------------------------------------------------------------------
// Scanned products (7-day rolling cache for barcode lookups)
// ---------------------------------------------------------------------------
export type ScannedProduct = {
  barcode: string;
  name: string;
  calories: number;
  serving: string | null;
};

export async function upsertScannedProduct(
  profileId: string,
  product: ScannedProduct,
): Promise<void> {
  const sb = getSupabase();
  await sb.from("scanned_products").upsert(
    {
      profile_id: profileId,
      barcode: product.barcode,
      name: product.name,
      calories: product.calories,
      serving: product.serving ?? null,
      scanned_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,barcode" },
  );
}

/** Scans from the last 7 days, newest first. */
export async function getRecentScans(
  profileId: string,
): Promise<ScannedProduct[]> {
  const sb = getSupabase();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await sb
    .from("scanned_products")
    .select("barcode, name, calories, serving")
    .eq("profile_id", profileId)
    .gte("scanned_at", since)
    .order("scanned_at", { ascending: false })
    .limit(20);
  return (data ?? []) as ScannedProduct[];
}

/** Delete all scanned_products rows older than 7 days across all profiles. */
export async function deleteOldScans(): Promise<number> {
  const sb = getSupabase();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("scanned_products")
    .delete({ count: "exact" })
    .lt("scanned_at", cutoff);
  return count ?? 0;
}

export async function getCalorieSeries(
  profileId: string,
  days = 30,
): Promise<CalorieDay[]> {
  const sb = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceStr = since.toISOString().slice(0, 10);

  const { data } = await sb
    .from("food_entries")
    .select("eaten_on, calories")
    .eq("profile_id", profileId)
    .gte("eaten_on", sinceStr)
    .order("eaten_on", { ascending: true });

  const byDay = new Map<string, number>();
  for (const row of (data ?? []) as { eaten_on: string; calories: number }[]) {
    byDay.set(row.eaten_on, (byDay.get(row.eaten_on) ?? 0) + row.calories);
  }
  return [...byDay.entries()].map(([date, total]) => ({ date, total }));
}

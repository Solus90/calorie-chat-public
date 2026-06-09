import type { UIMessage } from "ai";
import { Masthead } from "@/components/Masthead";
import { TodayPageContent } from "@/components/TodayPageContent";
import { getDailySummary, getLatestWeight, getRolling7DayAverage, getSettings, getWeekDailyTotals } from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import { lastNDays, startOfDayUTC, todayInAppTz } from "@/lib/timezone";
import { kgToDisplay, roundWeight, weightUnitLabel } from "@/lib/units";

export const dynamic = "force-dynamic";

async function loadHistory(profileId: string, since: string): Promise<UIMessage[]> {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("chat_messages")
      .select("id, role, parts")
      .eq("profile_id", profileId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(200);
    return (data ?? []).map((m) => ({
      id: m.id as string,
      role: m.role as UIMessage["role"],
      parts: m.parts as UIMessage["parts"],
    }));
  } catch {
    return [];
  }
}

export default async function TodayPage() {
  const profileId = await getActiveProfileId();
  const today = todayInAppTz();
  const todayStart = startOfDayUTC(today);
  const [history, summary, settings, latest, week, rollingAvg] = await Promise.all([
    loadHistory(profileId, todayStart),
    getDailySummary(profileId),
    getSettings(profileId),
    getLatestWeight(profileId),
    getWeekDailyTotals(profileId),
    getRolling7DayAverage(profileId),
  ]);

  const unit = weightUnitLabel(settings.unit_system);
  const initialToday = {
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
  };

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-6xl min-w-0 px-4 py-4 sm:px-5 sm:py-5">
        <TodayPageContent
          profileId={profileId}
          initialMessages={history}
          initialToday={initialToday}
        />
      </main>
    </>
  );
}

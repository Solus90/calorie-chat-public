"use client";

import { useState } from "react";
import useSWR from "swr";
import type { UIMessage } from "ai";
import type { FoodEntry } from "@/lib/queries";
import { formatDayLabel } from "@/lib/timezone";
import { CalorieRing } from "./CalorieRing";
import { ChatPanel } from "./ChatPanel";
import { DayStrip } from "./DayStrip";
import { FoodLogAccordion, FoodLogPanel } from "./FoodLogAccordion";
import { QuickWeight } from "./QuickWeight";

type WeekDay = { date: string; total: number };

export type TodayData = {
  date: string;
  today: string;
  total: number;
  limit: number | null;
  remaining: number | null;
  entries: FoodEntry[];
  week: WeekDay[];
  rolling_avg_7d: number;
  week_days: string[];
  unit: string;
  goal_weight: number | null;
  latest_weight: { value: number; recorded_on: string } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const cardShadow =
  "shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]";

function CalorieCard({
  dayLabel,
  isToday,
  limit,
  week,
  today,
  activeDate,
  total,
  rollingAvg,
  onSelectDate,
}: {
  dayLabel: string;
  isToday: boolean;
  limit: number | null;
  week: WeekDay[];
  today: string;
  activeDate: string;
  total: number;
  rollingAvg: number;
  onSelectDate: (d: string) => void;
}) {
  return (
    <section
      className={`animate-rise rounded-xl border border-hairline bg-surface p-4 sm:p-6 ${cardShadow}`}
      style={{ animationDelay: "60ms" }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl text-ink">{dayLabel}</h2>
        {!limit && isToday && (
          <a
            href="/settings"
            className="label-mono shrink-0 text-accent hover:underline"
          >
            set a limit
          </a>
        )}
      </div>

      {week.length > 0 && (
        <div className="mt-3">
          <DayStrip
            days={week}
            today={today}
            selected={activeDate}
            onSelect={onSelectDate}
          />
        </div>
      )}

      <div className="mt-3 flex justify-center sm:mt-4">
        <CalorieRing consumed={total} limit={limit} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 sm:mt-4">
        <span className="label-mono">7-day average</span>
        <span className="font-display text-lg tabular-nums text-ink">
          {rollingAvg.toLocaleString()}{" "}
          <span className="font-mono text-xs text-ink-muted">kcal</span>
        </span>
      </div>
    </section>
  );
}

function WeightCard({
  unit,
  latest,
  goalWeight,
  showProgressLink = true,
}: {
  unit: string;
  latest: TodayData["latest_weight"];
  goalWeight: number | null;
  showProgressLink?: boolean;
}) {
  return (
    <section
      className={`animate-rise rounded-xl border border-hairline bg-surface p-4 sm:p-5 ${cardShadow}`}
      style={{ animationDelay: "180ms" }}
    >
      <QuickWeight unit={unit} latest={latest} />
      {goalWeight != null && (
        <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
          <span className="label-mono">Goal</span>
          <span className="font-display text-lg text-ink">
            {goalWeight}{" "}
            <span className="font-mono text-xs text-ink-muted">{unit}</span>
          </span>
        </div>
      )}
      {showProgressLink && (
        <a
          href="/progress"
          className="mt-4 block text-center text-sm text-accent hover:underline"
        >
          View progress →
        </a>
      )}
    </section>
  );
}

export function TodayPageContent({
  profileId,
  initialMessages,
  initialToday,
}: {
  profileId: string;
  initialMessages: UIMessage[];
  initialToday: TodayData;
}) {
  const today = initialToday.today ?? initialToday.date;
  const [selectedDate, setSelectedDate] = useState(initialToday.date);

  const swrKey = `/api/today?date=${selectedDate}`;
  const { data } = useSWR<TodayData>(swrKey, fetcher, {
    fallbackData:
      selectedDate === initialToday.date ? initialToday : undefined,
    revalidateOnFocus: true,
  });

  const activeDate = data?.date ?? selectedDate;
  const isToday = activeDate === (data?.today ?? today);
  const total = data?.total ?? 0;
  const limit = data?.limit ?? null;
  const unit = data?.unit ?? "lbs";
  const week = data?.week ?? [];
  const rollingAvg = data?.rolling_avg_7d ?? 0;
  const entries = data?.entries ?? [];
  const dayLabel = isToday ? "Today" : formatDayLabel(activeDate, data?.today);

  return (
    <>
      {/* Mobile: ring → chat → weight → accordion log */}
      <div className="flex flex-col gap-4 lg:hidden">
        <CalorieCard
          dayLabel={dayLabel}
          isToday={isToday}
          limit={limit}
          week={week}
          today={data?.today ?? today}
          activeDate={activeDate}
          total={total}
          rollingAvg={rollingAvg}
          onSelectDate={setSelectedDate}
        />

        <div className="min-h-[52dvh]">
          <ChatPanel key={profileId} initialMessages={initialMessages} />
        </div>

        {isToday && (
          <WeightCard
            unit={unit}
            latest={data?.latest_weight ?? null}
            goalWeight={data?.goal_weight ?? null}
          />
        )}

        <FoodLogAccordion
          entries={entries}
          isToday={isToday}
          dayLabel={dayLabel}
          date={activeDate}
          total={total}
        />
      </div>

      {/* Desktop: chat + sidebar rail */}
      <div className="hidden min-w-0 gap-5 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 lg:h-[calc(100dvh-7.5rem)]">
          <ChatPanel key={profileId} initialMessages={initialMessages} />
        </div>
        <aside className="flex min-w-0 flex-col gap-5 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto">
          <CalorieCard
            dayLabel={dayLabel}
            isToday={isToday}
            limit={limit}
            week={week}
            today={data?.today ?? today}
            activeDate={activeDate}
            total={total}
            rollingAvg={rollingAvg}
            onSelectDate={setSelectedDate}
          />
          <FoodLogPanel
            entries={entries}
            isToday={isToday}
            dayLabel={dayLabel}
            date={activeDate}
          />
          {isToday && (
            <WeightCard
              unit={unit}
              latest={data?.latest_weight ?? null}
              goalWeight={data?.goal_weight ?? null}
            />
          )}
        </aside>
      </div>
    </>
  );
}

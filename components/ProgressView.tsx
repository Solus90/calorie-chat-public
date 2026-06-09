"use client";

import useSWR from "swr";
import { WeightChart } from "./WeightChart";
import { CalorieHistoryChart } from "./CalorieHistoryChart";
import { GoalForecast } from "./GoalForecast";

type ProgressData = {
  unit: string;
  goal_weight: number | null;
  start_weight: number | null;
  daily_calorie_limit: number | null;
  weights: { date: string; weight: number }[];
  calories: { date: string; total: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Stat({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "olive" | "rust" | "accent";
}) {
  const color =
    tone === "olive"
      ? "text-olive"
      : tone === "rust"
        ? "text-rust"
        : tone === "accent"
          ? "text-accent"
          : "text-ink";
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(17,24,39,0.05)]">
      <p className="label-mono mb-1">{label}</p>
      <p className={`font-display text-2xl leading-none ${color}`}>{value}</p>
      {sub && <p className="mt-1 font-mono text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

export function ProgressView() {
  const { data, isLoading } = useSWR<ProgressData>("/api/progress", fetcher, {
    revalidateOnFocus: true,
  });

  const unit = data?.unit ?? "lbs";
  const weights = data?.weights ?? [];
  const latest = weights[weights.length - 1]?.weight ?? null;
  const first = weights[0]?.weight ?? null;
  const change = latest != null && first != null ? +(latest - first).toFixed(1) : null;
  const toGoal =
    latest != null && data?.goal_weight != null
      ? +(latest - data.goal_weight).toFixed(1)
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Current"
          value={latest != null ? `${latest}` : "—"}
          sub={unit}
          tone="accent"
        />
        <Stat
          label="Goal"
          value={data?.goal_weight != null ? `${data.goal_weight}` : "—"}
          sub={unit}
          tone="olive"
        />
        <Stat
          label="Change"
          value={change != null ? `${change > 0 ? "+" : ""}${change}` : "—"}
          sub={`${unit} so far`}
          tone={change != null && change < 0 ? "olive" : "ink"}
        />
        <Stat
          label="To goal"
          value={toGoal != null ? `${Math.abs(toGoal)}` : "—"}
          sub={toGoal != null ? `${unit} to go` : unit}
        />
      </div>

      {/* Goal-date forecast */}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-paper-deep/40" />
      ) : (
        <GoalForecast
          weights={weights}
          goal={data?.goal_weight ?? null}
          start={data?.start_weight ?? null}
          unit={unit}
        />
      )}

      {/* Weight chart */}
      <section className="rounded-xl border border-hairline bg-surface p-5 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)] sm:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl text-ink">Weight over time</h2>
          <span className="label-mono">{unit}</span>
        </div>
        {isLoading ? (
          <div className="h-72 animate-pulse rounded-xl bg-paper-deep/40" />
        ) : (
          <WeightChart data={weights} goal={data?.goal_weight ?? null} unit={unit} />
        )}
      </section>

      {/* Calorie history */}
      <section className="rounded-xl border border-hairline bg-surface p-5 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)] sm:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl text-ink">Daily calories</h2>
          <span className="label-mono">last 30 days</span>
        </div>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-paper-deep/40" />
        ) : (
          <CalorieHistoryChart
            data={data?.calories ?? []}
            limit={data?.daily_calorie_limit ?? null}
          />
        )}
      </section>
    </div>
  );
}

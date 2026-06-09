"use client";

import { forecastGoal, type WeighPoint } from "@/lib/forecast";

function fmtDate(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function humanizeDays(days: number): string {
  if (days <= 1) return "any day now";
  if (days < 14) return `about ${days} days`;
  if (days < 70) return `about ${Math.round(days / 7)} weeks`;
  if (days < 550) return `about ${Math.round(days / 30)} months`;
  return `about ${(days / 365).toFixed(1)} years`;
}

const cardShadow =
  "shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      className={`rounded-xl border border-hairline bg-surface p-5 sm:p-6 ${cardShadow}`}
    >
      <p className="label-mono mb-2">Projected goal date</p>
      {children}
    </section>
  );
}

function ProgressBar({
  progress,
  amount,
  total,
  unit,
  tone = "accent",
}: {
  progress: number;
  amount: number | null;
  total: number | null;
  unit: string;
  tone?: "accent" | "olive";
}) {
  const pct = Math.round(progress * 100);
  const fill = tone === "olive" ? "var(--olive)" : "var(--accent)";
  return (
    <div className="mt-4">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-paper-deep"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
      <p className="mt-1.5 font-mono text-xs text-ink-muted">
        {amount != null && total != null
          ? `${amount.toFixed(1)} of ${total.toFixed(1)} ${unit} · ${pct}%`
          : `${pct}% there`}
      </p>
    </div>
  );
}

export function GoalForecast({
  weights,
  goal,
  start,
  unit,
}: {
  weights: { date: string; weight: number }[];
  goal: number | null;
  start: number | null;
  unit: string;
}) {
  const points: WeighPoint[] = weights.map((w) => ({
    date: w.date,
    value: w.weight,
  }));
  const f = forecastGoal(points, goal, start);

  if (goal == null || f == null) {
    return (
      <Shell>
        <p className="font-display text-2xl text-ink">No goal set</p>
        <p className="mt-1 text-sm text-ink-muted">
          Set a goal weight in{" "}
          <a href="/settings" className="text-accent hover:underline">
            Settings
          </a>{" "}
          (or just tell the chat) to see your projected date.
        </p>
      </Shell>
    );
  }

  const amount =
    f.baseline != null && f.current != null
      ? Math.abs(f.baseline - f.current)
      : null;
  const total = f.baseline != null ? Math.abs(f.baseline - goal) : null;
  const verb = (f.ratePerWeek ?? 0) < 0 ? "losing" : "gaining";
  const rateStr =
    f.ratePerWeek != null ? `${Math.abs(f.ratePerWeek).toFixed(1)} ${unit}/wk` : "";

  if (f.status === "on_track" && f.etaDate && f.daysRemaining != null) {
    return (
      <Shell>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-display text-3xl leading-none text-ink">
            {fmtDate(f.etaDate)}
          </p>
          <p className="font-display text-lg text-accent">
            {humanizeDays(f.daysRemaining)}
          </p>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          At your average pace — {verb} {rateStr} — you&apos;ll reach{" "}
          {goal} {unit} around then.
        </p>
        {f.progress != null && (
          <ProgressBar
            progress={f.progress}
            amount={amount}
            total={total}
            unit={unit}
          />
        )}
      </Shell>
    );
  }

  if (f.status === "reached") {
    return (
      <Shell>
        <p className="font-display text-3xl leading-none text-olive">
          Goal reached ✓
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          You&apos;re at or past your {goal} {unit} goal. Nicely done.
        </p>
        {f.progress != null && (
          <ProgressBar
            progress={f.progress}
            amount={amount}
            total={total}
            unit={unit}
            tone="olive"
          />
        )}
      </Shell>
    );
  }

  if (f.status === "stalled") {
    return (
      <Shell>
        <p className="font-display text-2xl text-ink">No date yet</p>
        <p className="mt-1 text-sm text-ink-muted">
          Your weight&apos;s holding steady{rateStr ? ` (±${rateStr})` : ""}. Keep
          logging — a date appears once a trend forms.
        </p>
        {f.progress != null && (
          <ProgressBar
            progress={f.progress}
            amount={amount}
            total={total}
            unit={unit}
          />
        )}
      </Shell>
    );
  }

  if (f.status === "diverging") {
    return (
      <Shell>
        <p className="font-display text-2xl text-ink">No date yet</p>
        <p className="mt-1 text-sm text-ink-muted">
          You&apos;re currently {verb} {rateStr} — trending away from your{" "}
          {goal} {unit} goal.
        </p>
        {f.progress != null && (
          <ProgressBar
            progress={f.progress}
            amount={amount}
            total={total}
            unit={unit}
          />
        )}
      </Shell>
    );
  }

  // insufficient
  return (
    <Shell>
      <p className="font-display text-2xl text-ink">Not enough data yet</p>
      <p className="mt-1 text-sm text-ink-muted">
        Log your weight over a couple of weeks and I&apos;ll project when
        you&apos;ll hit {goal} {unit}.
      </p>
    </Shell>
  );
}

"use client";

import type { FoodEntry } from "@/lib/queries";

const mealLabel: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function LoggedItems({
  entries,
  isToday = true,
}: {
  entries: FoodEntry[];
  isToday?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-ink-muted">
        {isToday ? (
          <>
            Nothing logged yet today.
            <br />
            Tell me what you ate to begin.
          </>
        ) : (
          <>Nothing logged for this day.</>
        )}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {entries.map((e, i) => (
        <li
          key={e.id}
          className="animate-msg flex items-baseline justify-between gap-3 border-b border-hairline/70 py-2.5 last:border-0"
          style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
        >
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] leading-tight text-ink">
              {e.description}
            </p>
            {e.meal && (
              <span className="label-mono text-[0.6rem]">
                {mealLabel[e.meal] ?? e.meal}
              </span>
            )}
          </div>
          <span className="shrink-0 font-mono text-sm tabular-nums text-ink-muted">
            {e.calories}
          </span>
        </li>
      ))}
    </ul>
  );
}

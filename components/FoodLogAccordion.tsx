"use client";

import { useState } from "react";
import type { FoodEntry } from "@/lib/queries";
import { formatDayLabel } from "@/lib/timezone";
import { LoggedItems } from "./LoggedItems";
import { ManualFoodForm } from "./ManualFoodForm";

type FoodLogAccordionProps = {
  entries: FoodEntry[];
  isToday: boolean;
  dayLabel: string;
  date: string;
  total: number;
  defaultOpen?: boolean;
};

export function FoodLogAccordion({
  entries,
  isToday,
  dayLabel,
  date,
  total,
  defaultOpen = false,
}: FoodLogAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const count = entries.length;
  const title = isToday ? "Logged today" : `Logged · ${dayLabel}`;

  return (
    <section className="animate-rise rounded-xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <span className="label-mono block">{title}</span>
          <span className="mt-0.5 block text-sm text-ink-muted">
            {count === 0
              ? "Nothing logged yet"
              : `${count} item${count === 1 ? "" : "s"} · ${total.toLocaleString()} kcal`}
          </span>
        </div>
        <span
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-hairline px-4 pb-4 pt-2">
          <LoggedItems entries={entries} isToday={isToday} />
          <ManualFoodForm date={date} />
        </div>
      )}
    </section>
  );
}

/** Always-expanded log section for desktop sidebar. */
export function FoodLogPanel({
  entries,
  isToday,
  dayLabel,
  date,
}: Omit<FoodLogAccordionProps, "defaultOpen" | "total">) {
  return (
    <section
      className="animate-rise rounded-xl border border-hairline bg-surface p-5 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]"
      style={{ animationDelay: "140ms" }}
    >
      <h3 className="label-mono mb-1">
        {isToday ? "Logged today" : `Logged · ${dayLabel}`}
      </h3>
      <LoggedItems entries={entries} isToday={isToday} />
      <ManualFoodForm date={date} />
    </section>
  );
}

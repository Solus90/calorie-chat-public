"use client";

import { formatDayLabel } from "@/lib/timezone";

type DayStripProps = {
  days: { date: string; total: number }[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
};

export function DayStrip({ days, today, selected, onSelect }: DayStripProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Last 7 days"
    >
      {days.map((d) => {
        const isSelected = d.date === selected;
        const isToday = d.date === today;
        return (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(d.date)}
            className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-md border px-2 py-1.5 text-center transition ${
              isSelected
                ? "border-clay bg-clay text-white"
                : "border-hairline bg-paper-deep text-ink hover:border-clay/40"
            }`}
          >
            <span
              className={`font-mono text-[0.6rem] font-bold uppercase tracking-widest leading-tight ${
                isSelected ? "text-white/90" : "text-ink-muted"
              }`}
            >
              {isToday ? "Today" : formatDayLabel(d.date, today).split(",")[0]}
            </span>
            <span
              className={`mt-0.5 font-mono text-xs tabular-nums ${
                isSelected ? "text-white" : "text-ink"
              }`}
            >
              {d.total > 0 ? d.total : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

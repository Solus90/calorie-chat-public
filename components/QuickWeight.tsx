"use client";

import { useState } from "react";
import { mutate } from "swr";

export function QuickWeight({
  unit,
  latest,
}: {
  unit: string;
  latest: { value: number; recorded_on: string } | null;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return;
    setSaving(true);
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: num }),
    });
    setSaving(false);
    if (res.ok) {
      setValue("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      mutate((key) => typeof key === "string" && key.startsWith("/api/today"));
      mutate("/api/progress");
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono">Today&apos;s weight</span>
        {latest && (
          <span className="font-mono text-xs text-ink-muted">
            last: {latest.value} {unit}
          </span>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={latest ? String(latest.value) : "—"}
            className="w-full rounded-md border border-hairline bg-paper px-3 py-2 pr-10 text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/25"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-muted">
            {unit}
          </span>
        </div>
        <button
          type="submit"
          disabled={saving || !value}
          className="rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-clay-soft disabled:opacity-40"
        >
          {saved ? "✓" : saving ? "…" : "Log"}
        </button>
      </form>
    </div>
  );
}

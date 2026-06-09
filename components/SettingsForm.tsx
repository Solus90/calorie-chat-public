"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";

type SettingsData = {
  profile_id: string;
  profile_name: string;
  unit_system: "imperial" | "metric";
  unit: string;
  daily_calorie_limit: number | null;
  goal_weight: number | null;
  start_weight: number | null;
  assistant_notes: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="border-b border-hairline py-4 last:border-0">
      <label className="label-mono mb-2 block">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function SettingsForm() {
  const { data } = useSWR<SettingsData>("/api/settings", fetcher);

  const [name, setName] = useState("");
  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">("imperial");
  const [limit, setLimit] = useState("");
  const [goal, setGoal] = useState("");
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!data) return;
    setName(data.profile_name ?? "");
    setUnitSystem(data.unit_system);
    setLimit(data.daily_calorie_limit?.toString() ?? "");
    setGoal(data.goal_weight?.toString() ?? "");
    setStart(data.start_weight?.toString() ?? "");
    setNotes(data.assistant_notes ?? "");
  }, [data]);

  const unit = unitSystem === "imperial" ? "lbs" : "kg";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_name: name,
        unit_system: unitSystem,
        daily_calorie_limit: limit,
        goal_weight: goal,
        start_weight: start,
        assistant_notes: notes,
      }),
    });
    setStatus("saved");
    mutate("/api/settings");
    mutate("/api/profile");
    mutate((key) => typeof key === "string" && key.startsWith("/api/today"));
    mutate("/api/progress");
    setTimeout(() => setStatus("idle"), 1800);
  }

  const inputCls =
    "w-full rounded-md border border-hairline bg-paper px-4 py-2.5 text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/25";

  return (
    <form
      onSubmit={save}
      className="rounded-xl border border-hairline bg-surface p-6 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]"
    >
      <Field
        label="Your name"
        hint="Shown in the profile switcher. These settings apply to this profile only."
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          className="max-w-[220px] rounded-md border border-hairline bg-paper px-4 py-2.5 text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/25"
        />
      </Field>

      <Field label="Units" hint="Weight is converted automatically when you switch.">
        <div className="inline-flex rounded-md border border-hairline bg-paper p-1">
          {(["imperial", "metric"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnitSystem(u)}
              className={`rounded px-4 py-1.5 text-sm font-medium transition ${
                unitSystem === u
                  ? "bg-clay text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {u === "imperial" ? "Pounds (lbs)" : "Kilograms (kg)"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Daily calorie limit" hint="Your target ceiling for each day.">
        <div className="relative max-w-[220px]">
          <input
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="2000"
            className={inputCls}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-muted">
            kcal
          </span>
        </div>
      </Field>

      <Field label="Goal weight">
        <div className="relative max-w-[220px]">
          <input
            inputMode="decimal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="—"
            className={inputCls}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-muted">
            {unit}
          </span>
        </div>
      </Field>

      <Field
        label="Starting weight"
        hint="Optional — used as the baseline on your progress chart."
      >
        <div className="relative max-w-[220px]">
          <input
            inputMode="decimal"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="—"
            className={inputCls}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-muted">
            {unit}
          </span>
        </div>
      </Field>

      <Field
        label="Notes for the assistant"
        hint="Personal context the chat assistant reads on every message — dietary restrictions, foods you eat often, portion habits, brands you buy. Plain language."
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder={
            "e.g. Vegetarian, no dairy.\nI usually have black coffee (0 kcal).\nMy “bowl” of cereal is about 1.5 cups.\nI buy the 90% lean ground beef."
          }
          className="w-full resize-y rounded-md border border-hairline bg-paper px-4 py-2.5 text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/25"
        />
      </Field>

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-5 rounded-md bg-accent px-6 py-2.5 font-semibold text-white transition enabled:hover:bg-accent-soft disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
      </button>
    </form>
  );
}

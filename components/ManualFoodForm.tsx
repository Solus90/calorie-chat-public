"use client";

import { useState } from "react";
import { mutate } from "swr";
import { BarcodeScanner } from "./BarcodeScanner";

type ManualFoodFormProps = {
  date: string;
  onAdded?: () => void;
};

export function ManualFoodForm({ date, onAdded }: ManualFoodFormProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [meal, setMeal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  async function handleScan(code: string) {
    setScanning(false);
    setLookingUp(true);
    setError("");
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.found) {
        setDescription(data.description ?? "");
        setCalories(data.calories != null ? String(data.calories) : "");
      } else {
        setError("Product not found — enter calories manually.");
      }
    } catch {
      setError("Couldn't look up barcode — enter manually.");
    }
    setLookingUp(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        calories: Number(calories),
        eaten_on: date,
        ...(meal ? { meal } : {}),
      }),
    });
    if (res.ok) {
      setDescription("");
      setCalories("");
      setMeal("");
      setOpen(false);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/today"));
      mutate("/api/progress");
      onAdded?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save entry.");
    }
    setLoading(false);
  }

  if (scanning) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-md border border-dashed border-hairline py-2 text-sm text-ink-muted transition hover:border-accent hover:text-accent"
      >
        + Add manually
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-hairline pt-3">
      <p className="label-mono">Manual entry</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you eat?"
          className="min-w-0 flex-1 rounded-md border border-hairline bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/25"
          autoFocus
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={lookingUp}
          title="Scan barcode"
          className="shrink-0 rounded-md border border-hairline bg-paper px-3 py-2 text-ink-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {lookingUp ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" y1="8" x2="7" y2="16" />
              <line x1="10" y1="8" x2="10" y2="16" />
              <line x1="13" y1="8" x2="13" y2="16" />
              <line x1="16" y1="8" x2="16" y2="16" />
            </svg>
          )}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Calories"
          className="w-28 rounded-md border border-hairline bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/25"
        />
        <select
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-hairline bg-paper px-2 py-2 text-sm text-ink outline-none focus:border-clay"
          aria-label="Meal"
        >
          <option value="">Meal (optional)</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      {error && <p className="text-xs text-rust">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="flex-1 rounded-md py-2 text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !description.trim() || !calories}
          className="flex-1 rounded-md bg-accent py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/** Animate a number toward `value` whenever it changes. */
function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return display;
}

function zoneColor(pct: number): string {
  if (pct >= 1) return "var(--ring-over, var(--rust))";
  if (pct >= 0.8) return "var(--ring-warn, var(--amber))";
  return "var(--ring)";
}

export function CalorieRing({
  consumed,
  limit,
}: {
  consumed: number;
  limit: number | null;
}) {
  const size = 232;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const hasLimit = limit != null && limit > 0;
  const pct = hasLimit ? consumed / (limit as number) : 0;
  const clamped = Math.min(1, pct);
  const remaining = hasLimit ? (limit as number) - consumed : null;
  const color = hasLimit ? zoneColor(pct) : "var(--accent)";

  const animatedConsumed = useCountUp(consumed);
  const bigNumber = hasLimit ? (remaining as number) : consumed;
  const animatedBig = useCountUp(bigNumber);
  const over = remaining != null && remaining < 0;

  const dashoffset = circumference * (1 - clamped);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={
          hasLimit
            ? `${Math.abs(remaining as number)} calories ${over ? "over" : "remaining"}`
            : `${consumed} calories logged`
        }
      >
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={stroke}
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{
            transition:
              "stroke-dashoffset 0.9s cubic-bezier(0.2,0.8,0.2,1), stroke 0.6s ease",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="font-display leading-none tabular-nums"
          style={{
            fontSize: "3.6rem",
            fontWeight: 700,
            color: over ? "var(--rust)" : "var(--ink)",
          }}
        >
          {hasLimit ? Math.abs(animatedBig) : animatedBig}
        </span>
        <span className="label-mono mt-2">
          {hasLimit ? (over ? "over budget" : "kcal left") : "kcal today"}
        </span>
        {hasLimit && (
          <span className="mt-3 font-mono text-xs text-ink-muted">
            {animatedConsumed} / {limit}
          </span>
        )}
      </div>
    </div>
  );
}

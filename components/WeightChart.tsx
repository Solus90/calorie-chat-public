"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; weight: number };

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const axisStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--ink-muted)",
};

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 shadow-md">
      <p className="label-mono mb-0.5">{fmtDate(p.date)}</p>
      <p className="font-display text-lg leading-none text-ink">
        {p.weight}{" "}
        <span className="font-mono text-xs text-ink-muted">{unit}</span>
      </p>
    </div>
  );
}

export function WeightChart({
  data,
  goal,
  unit,
}: {
  data: Point[];
  goal: number | null;
  unit: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-center text-sm text-ink-muted">
        No weigh-ins yet.
        <br />
        Log your weight to start the line.
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const values = goal != null ? [...weights, goal] : weights;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.15);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--hairline)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={axisStyle}
          tickLine={false}
          axisLine={{ stroke: "var(--hairline)" }}
          minTickGap={28}
        />
        <YAxis
          domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <Tooltip
          content={<ChartTooltip unit={unit} />}
          cursor={{ stroke: "var(--ink-muted)", strokeDasharray: "3 3" }}
        />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="var(--olive)"
            strokeDasharray="6 5"
            strokeWidth={1.5}
            label={{
              value: `goal ${goal}`,
              position: "insideTopRight",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--olive)",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="weight"
          stroke="var(--accent)"
          strokeWidth={2.5}
          fill="url(#weightFill)"
          dot={{
            r: 4,
            fill: "var(--ink)",
            stroke: "var(--accent)",
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
            fill: "var(--accent)",
            stroke: "var(--ink)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

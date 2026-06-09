"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Day = { date: string; total: number };

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
  limit,
}: {
  active?: boolean;
  payload?: { payload: Day }[];
  limit: number | null;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const over = limit != null && p.total > limit;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 shadow-md">
      <p className="label-mono mb-0.5">{fmtDate(p.date)}</p>
      <p className="font-display text-lg leading-none">
        {p.total} <span className="font-mono text-xs text-ink-muted">kcal</span>
      </p>
      {limit != null && (
        <p className={`mt-1 font-mono text-xs ${over ? "text-rust" : "text-olive"}`}>
          {over ? `+${p.total - limit} over` : `${limit - p.total} under`}
        </p>
      )}
    </div>
  );
}

export function CalorieHistoryChart({
  data,
  limit,
}: {
  data: Day[];
  limit: number | null;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-ink-muted">
        No meals logged yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="var(--hairline)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={axisStyle}
          tickLine={false}
          axisLine={{ stroke: "var(--hairline)" }}
          minTickGap={20}
        />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          content={<ChartTooltip limit={limit} />}
          cursor={{ fill: "var(--paper-deep)", opacity: 0.5 }}
        />
        {limit != null && (
          <ReferenceLine
            y={limit}
            stroke="var(--ink-muted)"
            strokeDasharray="6 5"
            strokeWidth={1.5}
            label={{
              value: `limit ${limit}`,
              position: "insideTopRight",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--ink-muted)",
            }}
          />
        )}
        <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={34}>
          {data.map((d) => (
            <Cell
              key={d.date}
              fill={
                limit != null && d.total > limit ? "var(--rust)" : "var(--accent)"
              }
              fillOpacity={limit != null && d.total > limit ? 0.85 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

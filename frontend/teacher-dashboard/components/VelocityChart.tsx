"use client";

import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { measure: 1, required: 72, actual: 70 },
  { measure: 2, required: 72, actual: 68 },
  { measure: 3, required: 72, actual: 74 },
  { measure: 4, required: 72, actual: 71 },
  { measure: 5, required: 72, actual: 69 },
  { measure: 6, required: 72, actual: 73 },
  { measure: 7, required: 72, actual: 70 },
  { measure: 8, required: 72, actual: 72 },
  { measure: 9, required: 72, actual: 68 },
  { measure: 10, required: 72, actual: 65 },
  { measure: 11, required: 72, actual: 60 },
  { measure: 12, required: 72, actual: 45 },
  { measure: 13, required: 72, actual: 42 },
  { measure: 14, required: 72, actual: 48 },
  { measure: 15, required: 72, actual: 55 },
  { measure: 16, required: 72, actual: 66 },
];

export function VelocityChart() {
  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Key Velocity — Required vs Actual
      </h2>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2D3748" vertical={false} />
            <XAxis
              dataKey="measure"
              stroke="#9CA3AF"
              tickLine={false}
              tick={{ fontSize: 11 }}
              label={{ value: "Measure", position: "insideBottom", dy: 12, fill: "#9CA3AF" }}
            />
            <YAxis stroke="#9CA3AF" tickLine={false} domain={[0, 130]} />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 2 }}
              contentStyle={{
                background: "#0F1117",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: 8,
                color: "#ffffff",
              }}
            />
            <Area
              type="monotone"
              dataKey="required"
              stroke="#6B7280"
              strokeDasharray="5 5"
              fillOpacity={0}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#6C63FF"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="none"
              fill="#EF444433"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "Mon", minutes: 45 },
  { day: "Tue", minutes: 0 },
  { day: "Wed", minutes: 62 },
  { day: "Thu", minutes: 38 },
  { day: "Fri", minutes: 0 },
  { day: "Sat", minutes: 0 },
  { day: "Sun", minutes: 55 },
];

export function ConsistencyChart() {
  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Practice Consistency — Last 7 Days
      </h2>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2D3748" vertical={false} />
            <XAxis dataKey="day" stroke="#9CA3AF" tickLine={false} />
            <YAxis stroke="#9CA3AF" tickLine={false} domain={[0, 80]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.08)" }}
              contentStyle={{
                background: "#0F1117",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: 8,
                color: "#ffffff",
              }}
            />
            <Bar
              dataKey="minutes"
              fill="#6C63FF"
              radius={[6, 6, 0, 0]}
              background={{ fill: "#2D3748" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

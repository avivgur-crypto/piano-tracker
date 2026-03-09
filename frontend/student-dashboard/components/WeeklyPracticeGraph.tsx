"use client";

import { useMemo } from "react";

const practiceData = [
  { day: "Mon", minutes: 18 },
  { day: "Tue", minutes: 34 },
  { day: "Wed", minutes: 50 },
  { day: "Thu", minutes: 22 },
  { day: "Fri", minutes: 45 },
  { day: "Sat", minutes: 60 },
  { day: "Sun", minutes: 38 },
];

export function WeeklyPracticeGraph() {
  const maxMinutes = useMemo(() => Math.max(...practiceData.map((d) => d.minutes)), []);

  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">📈 Weekly Practice</h2>
        <span className="text-xs text-[#B0B7D6]">Keep the streak alive</span>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {practiceData.map((day) => {
          const heightPercent = (day.minutes / maxMinutes) * 100;
          return (
            <div key={day.day} className="flex min-w-[46px] flex-col items-center gap-2">
              <div className="relative flex h-28 w-10 items-end justify-center rounded-xl bg-white/5 p-1">
                <div
                  className="absolute bottom-1 w-full rounded-xl bg-gradient-to-t from-sky-400/90 to-purple-500"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-xs font-semibold text-white">{day.minutes}</span>
              </div>
              <span className="text-xs text-[#B0B7D6]">{day.day}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

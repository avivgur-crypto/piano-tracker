"use client";

import { useMemo } from "react";

const measures = Array.from({ length: 32 }, (_, index) => index + 1);

const errorRates: Record<number, number> = {
  15: 42,
  16: 55,
  17: 60,
  18: 65,
  19: 48,
  20: 40,
};

function getColorForRate(rate: number) {
  if (rate === 0) return "#1A1D27";
  if (rate <= 25) return "#2D1B69";
  if (rate <= 50) return "#7C3AED";
  return "#EF4444";
}

export function MistakeHeatmap() {
  const items = useMemo(
    () =>
      measures.map((measure) => {
        const rate = errorRates[measure] ?? Math.floor(Math.random() * 15);
        return {
          measure,
          rate,
          color: getColorForRate(rate),
        };
      }),
    []
  );

  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Mistake Heatmap — Current Piece
      </h2>

      <div className="grid grid-cols-8 gap-2">
        {items.map((item) => (
          <div
            key={item.measure}
            className="relative flex h-10 flex-col items-center justify-center rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: item.color }}
            title={`Measure ${item.measure} — ${item.rate}% errors`}
          >
            <span className="opacity-80">{item.measure}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: "#1A1D27" }} />
          Low
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: "#2D1B69" }} />
          1–25%
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: "#7C3AED" }} />
          26–50%
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: "#EF4444" }} />
          High
        </span>
      </div>
    </section>
  );
}

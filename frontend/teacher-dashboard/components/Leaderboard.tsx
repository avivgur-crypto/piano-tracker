const leaders = [
  { rank: 1, name: "Tom Katz", minutes: 187 },
  { rank: 2, name: "Maya Shapiro", minutes: 142 },
  { rank: 3, name: "Sarah Levi", minutes: 98 },
];

const RANK_MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function Leaderboard() {
  const maxMinutes = Math.max(...leaders.map((l) => l.minutes));

  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <h2 className="mb-6 text-lg font-semibold text-white">This Week&apos;s Stars ⭐</h2>

      <div className="space-y-4">
        {leaders.map((leader) => {
          const percent = Math.round((leader.minutes / maxMinutes) * 100);
          return (
            <div key={leader.rank} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{RANK_MEDALS[leader.rank] ?? "🎖️"}</span>
                  <span className="text-sm font-semibold text-white">{leader.name}</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  {leader.minutes} min
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

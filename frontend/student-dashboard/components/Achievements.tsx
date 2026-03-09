"use client";

const achievements = [
  {
    id: 1,
    title: "Practice Streak",
    value: "12 days",
    icon: "🔥",
    color: "bg-orange-500",
  },
  {
    id: 2,
    title: "Pieces Learned",
    value: "3",
    icon: "🎼",
    color: "bg-emerald-500",
  },
  {
    id: 3,
    title: "Daily Goal",
    value: "90%",
    icon: "🏅",
    color: "bg-sky-500",
  },
];

export function Achievements() {
  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">🏆 Achievements</h2>
        <span className="text-xs text-[#B0B7D6]">Keep going!</span>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {achievements.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-sm ${item.color}`}>
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{item.title}</div>
              <div className="text-xl font-semibold text-white">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

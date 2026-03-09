const activities = [
  { student: "Tom Katz", action: "completed a 45min session", time: "2h ago", type: "session" },
  { student: "Maya Shapiro", action: "practiced for 28min", time: "4h ago", type: "session" },
  { student: "Sarah Levi", action: "practiced for 15min", time: "Yesterday", type: "session" },
  { student: "Danny Cohen", action: "hasn't practiced", time: "5 days ago", type: "inactive" },
];

const TYPE_BORDER: Record<string, string> = {
  session: "border-[#6C63FF]",
  inactive: "border-[#EF4444]",
};

export function ActivityFeed() {
  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <h2 className="mb-6 text-lg font-semibold text-white">Live Activity 🎵</h2>

      <div className="max-h-[400px] space-y-3 overflow-y-auto">
        {activities.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between gap-4 rounded-xl border-l-4 bg-[rgba(255,255,255,0.03)] px-4 py-3 ${
              TYPE_BORDER[item.type] ?? "border-gray-400"
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">{item.student}</div>
              <div className="text-xs text-[var(--text-muted)]">{item.action}</div>
            </div>
            <div className="text-xs font-medium text-[var(--text-muted)]">{item.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

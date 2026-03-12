import Link from "next/link";

const students = [
  { id: 2, name: "Danny Cohen", status: "red", lastSession: "5 days ago" },
  { id: 3, name: "Sarah Levi", status: "yellow", lastSession: "2 days ago" },
  { id: 4, name: "Tom Katz", status: "green", lastSession: "Today" },
  { id: 5, name: "Maya Shapiro", status: "green", lastSession: "Yesterday" },
];

const STATUS_COLORS: Record<string, string> = {
  red: "bg-[#EF4444]",
  yellow: "bg-[#F59E0B]",
  green: "bg-[#10B981]",
};

export function TriageList() {
  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Student Status</h2>
        <span className="h-3 w-3 rounded-full bg-[#6C63FF]" />
      </div>

      <div className="space-y-3">
        {students.map((student) => {
          const statusColor = STATUS_COLORS[student.status] ?? "bg-gray-400";
          const initials = student.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.04)] px-4 py-3 transition hover:bg-[rgba(255,255,255,0.08)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${statusColor} text-sm font-semibold text-white`}
                >
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{student.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Last session: {student.lastSession}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {student.status === "red" ? (
                  <button className="rounded-full bg-[#EF4444] px-3 py-1 text-xs font-semibold text-white">
                    Send Nudge 👋
                  </button>
                ) : null}
                <span className={`h-3 w-3 rounded-full ${statusColor}`} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

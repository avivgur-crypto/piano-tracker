"use client";

const notes = [
  {
    id: 1,
    teacher: "Aviv Teacher",
    time: "2 hours ago",
    text: "Great session today! Your right hand is sounding much better. Focus on keeping the left hand softer.",
  },
  {
    id: 2,
    teacher: "Aviv Teacher",
    time: "3 days ago",
    text: "Remember to practice Hanon slowly before moving to the piece. Speed comes after accuracy!",
  },
];

export function TeacherNotes() {
  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">💬 Notes from your Teacher</h2>
      <div className="mt-4 space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex gap-4 rounded-xl border-l-4 border-purple-500 bg-[#1E2235] p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-sm font-semibold text-white">
              AT
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-white">{note.teacher}</div>
                <div className="text-xs text-[#B0B7D6]">{note.time}</div>
              </div>
              <div className="mt-2 text-sm text-white">{note.text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

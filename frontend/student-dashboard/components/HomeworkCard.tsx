"use client";

import { useMemo, useState } from "react";

type HomeworkItem = {
  id: number;
  title: string;
  instruction: string;
  deadline: "Yesterday" | "Today" | "Tomorrow";
  status: "pending" | "done";
};

const homework: HomeworkItem[] = [
  {
    id: 1,
    title: "Hanon Exercise #1",
    instruction: "Practice slowly, left hand only",
    deadline: "Tomorrow",
    status: "pending",
  },
  {
    id: 2,
    title: "Für Elise — measures 1-16",
    instruction: "Focus on smooth legato",
    deadline: "Today",
    status: "pending",
  },
  {
    id: 3,
    title: "C Major Scale",
    instruction: "Both hands, 3 octaves",
    deadline: "Yesterday",
    status: "done",
  },
];

const deadlineColor = (deadline: HomeworkItem["deadline"]) => {
  if (deadline === "Yesterday") return "text-[#FF4B4B]";
  if (deadline === "Today") return "text-[#FFD900]";
  return "text-[#58CC02]";
};

const statusBadge = (status: HomeworkItem["status"]) => {
  if (status === "done") {
    return (
      <span className="rounded-full bg-[#58CC02] px-3 py-1 text-xs font-semibold text-[#1C1F2E]">
        Done ✅
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#B0B7D6]">
      Pending
    </span>
  );
};

const borderColor = (status: HomeworkItem["status"]) => {
  if (status === "done") return "border-[#58CC02]";
  return "border-[#FFD900]";
};

export function HomeworkCard() {
  const [items, setItems] = useState(homework);

  const markDone = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "done" } : item
      )
    );
  };

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.status === "done" ? 1 : -1)),
    [items]
  );

  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">📚 Homework from Teacher</h2>
      <div className="mt-4 space-y-4">
        {sorted.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border-l-4 ${borderColor(item.status)} bg-[#1E2235] p-4`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-[#B0B7D6]">{item.instruction}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={"text-xs font-semibold " + deadlineColor(item.deadline)}>
                  ⏰ {item.deadline}
                </div>
                {statusBadge(item.status)}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => markDone(item.id)}
                disabled={item.status === "done"}
                className="rounded-full bg-[#58CC02] px-4 py-2 text-sm font-semibold text-[#1C1F2E] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark as Done
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

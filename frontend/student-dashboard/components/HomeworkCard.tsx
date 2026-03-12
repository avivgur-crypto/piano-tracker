"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL } from "../lib/api";
import { getStudentId, getStudentToken } from "../lib/auth";

type HomeworkItem = {
  id: number;
  title: string;
  instruction: string;
  deadline?: string;
  status: "pending" | "done";
};

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
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomework = useCallback(async () => {
    const studentId = getStudentId();
    const token = getStudentToken();
    if (!studentId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/communication/homework/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to load homework (${res.status})`);
      const data = await res.json();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load homework");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  useEffect(() => {
    const onFocus = () => fetchHomework();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchHomework]);

  const markDone = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/communication/homework/${id}/done`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getStudentToken()}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to update homework (${res.status})`);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "done" } : item
        )
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update homework");
    }
  };

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.status === "done" ? 1 : -1)),
    [items]
  );

  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">📚 Homework from Teacher</h2>

      {loading ? (
        <div className="mt-4 text-sm text-[#B0B7D6]">Loading homework…</div>
      ) : error ? (
        <div className="mt-4 rounded-xl bg-[#661010] px-4 py-3 text-sm text-[#FECACA]">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 text-sm text-[#B0B7D6]">No homework yet! 🎉</div>
      ) : (
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
                    ⏰ {item.deadline ? new Date(item.deadline).toLocaleDateString() : "—"}
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
      )}
    </section>
  );
}

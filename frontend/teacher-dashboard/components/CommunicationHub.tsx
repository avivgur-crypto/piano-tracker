"use client";

import { useMemo, useState } from "react";

const students = [
  { id: 2, name: "Danny Cohen" },
  { id: 3, name: "Sarah Levi" },
  { id: 4, name: "Tom Katz" },
  { id: 5, name: "Maya Shapiro" },
];

type Tab = "homework" | "notes";

function getToken() {
  // Token might be stored under different keys depending on auth implementation.
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

export function CommunicationHub() {
  const [activeTab, setActiveTab] = useState<Tab>("homework");
  const [studentId, setStudentId] = useState<number>(students[0].id);

  // Homework state
  const [hwTitle, setHwTitle] = useState("");
  const [hwInstruction, setHwInstruction] = useState("");
  const [hwDeadline, setHwDeadline] = useState("");

  // Note state
  const [noteText, setNoteText] = useState("");

  // Feedback
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: s.name })),
    []
  );

  const handleHomeworkSubmit = async () => {
    resetFeedback();
    setLoading(true);

    const token = getToken();
    if (!token) {
      setError("No authentication token found.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/communication/homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          title: hwTitle,
          instruction: hwInstruction,
          deadline: hwDeadline || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = (data && (data.detail || data.message)) || res.statusText;
        throw new Error(`${res.status} ${detail}`);
      }

      setMessage("✅ Homework assigned!");
      setHwTitle("");
      setHwInstruction("");
      setHwDeadline("");
    } catch (err: any) {
      setError(err?.message || "An error occurred while assigning homework.");
    } finally {
      setLoading(false);
    }
  };

  const handleNoteSubmit = async () => {
    resetFeedback();
    setLoading(true);

    const token = getToken();
    if (!token) {
      setError("No authentication token found.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/communication/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          text: noteText,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = (data && (data.detail || data.message)) || res.statusText;
        throw new Error(`${res.status} ${detail}`);
      }

      setMessage("✅ Note sent!");
      setNoteText("");
    } catch (err: any) {
      setError(err?.message || "An error occurred while sending note.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">📡 Communication Hub</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "homework"
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={() => {
              resetFeedback();
              setActiveTab("homework");
            }}
          >
            📚 Homework
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "notes"
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={() => {
              resetFeedback();
              setActiveTab("notes");
            }}
          >
            💬 Notes
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-white">
            Student
            <select
              className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
            >
              {studentOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {activeTab === "homework" ? (
            <label className="space-y-1 text-sm text-white">
              Deadline
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
                value={hwDeadline}
                onChange={(e) => setHwDeadline(e.target.value)}
              />
            </label>
          ) : (
            <div />
          )}
        </div>

        {activeTab === "homework" ? (
          <>
            <label className="space-y-1 text-sm text-white">
              Title
              <input
                type="text"
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                placeholder="e.g. Practice scales in C major"
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
              />
            </label>
            <label className="space-y-1 text-sm text-white">
              Instruction
              <textarea
                value={hwInstruction}
                onChange={(e) => setHwInstruction(e.target.value)}
                rows={4}
                placeholder="Add a note for the student..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
              />
            </label>
          </>
        ) : (
          <label className="space-y-1 text-sm text-white">
            Note
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              placeholder="Write a note for your student..."
              className="w-full resize-none rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
            />
          </label>
        )}

        <div className="flex flex-col gap-2">
          {message ? (
            <div className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={activeTab === "homework" ? handleHomeworkSubmit : handleNoteSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeTab === "homework" ? "Assign Homework 📚" : "Send Note 💬"}
          </button>
        </div>
      </div>
    </section>
  );
}

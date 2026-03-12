"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../lib/api";
import { getStudentId, getStudentToken } from "../lib/auth";

type TeacherNote = {
  id: number;
  teacher_id: number;
  student_id: number;
  text: string;
  created_at: string;
};

export function TeacherNotes() {
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const studentId = getStudentId();
    const token = getStudentToken();
    if (!studentId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/communication/notes/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to load notes (${res.status})`);
      const data = await res.json();
      setNotes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const onFocus = () => fetchNotes();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchNotes]);

  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">💬 Notes from your Teacher</h2>
      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="text-sm text-[#B0B7D6]">Loading notes…</div>
        ) : error ? (
          <div className="rounded-xl bg-[#661010] px-4 py-3 text-sm text-[#FECACA]">
            {error}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-sm text-[#B0B7D6]">No notes yet</div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="flex gap-4 rounded-xl border-l-4 border-purple-500 bg-[#1E2235] p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-sm font-semibold text-white">
                AT
              </div>
              <div className="flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-white">Your Teacher</div>
                  <div className="text-xs text-[#B0B7D6]">
                    {new Date(note.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 text-sm text-white">{note.text}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

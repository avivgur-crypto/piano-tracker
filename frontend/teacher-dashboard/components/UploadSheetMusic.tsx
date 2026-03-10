"use client";

import { useRef, useState } from "react";
import { getToken } from "../lib/auth";

interface Props {
  studentId: string;
}

export function UploadSheetMusic({ studentId }: Props) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setMessage(null);
    setError(null);
    setAnalysis(null);

    const token = getToken();
    if (!token) {
      setError("No authentication token found.");
      return;
    }
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a piece title.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("student_id", studentId);
      formData.append("title", title);

      const res = await fetch("http://localhost:8000/ai/upload-piece", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setMessage(`Sheet music "${data.title}" analyzed successfully!`);
      setAnalysis(data.analysis_json);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">🎼 Upload Sheet Music</h2>
      <p className="mt-1 text-sm text-[#B0B7D6]">
        Upload a PDF of sheet music to analyze with AI
      </p>

      <div className="mt-4 space-y-4">
        <label className="space-y-1 text-sm text-white">
          Piece Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Für Elise — Beethoven"
            className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
          />
        </label>

        <label className="space-y-1 text-sm text-white">
          Sheet Music (PDF)
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-purple-600 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white hover:file:bg-purple-500"
          />
        </label>

        {message && (
          <div className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        {analysis && (
          <div className="rounded-xl border border-purple-500/30 bg-[#111827] p-4">
            <h3 className="mb-2 text-sm font-semibold text-purple-300">
              AI Analysis Result
            </h3>
            <pre className="max-h-48 overflow-auto text-xs text-[#B0B7D6]">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Upload & Analyze 🎼"}
        </button>
      </div>
    </section>
  );
}

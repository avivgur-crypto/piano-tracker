"use client";

import { useRef, useState } from "react";
import { getToken } from "../lib/auth";

interface Props {
  studentId: number;
}

export function UploadSheetMusic({ studentId }: Props) {
  console.log("[upload] studentId prop:", studentId);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreSummary, setScoreSummary] = useState<{
    key_signature?: string;
    time_signature?: string;
    measure_count: number;
    total_notes: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setMessage(null);
    setError(null);
    setScoreSummary(null);

    const token = getToken();
    if (!token) {
      setError("No authentication token found.");
      return;
    }
    if (!file) {
      setError("Please select an .xml or .mxl file.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim() || "");
      formData.append("student_id", String(studentId));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);

      const res = await fetch("http://localhost:8000/ai/upload-piece", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data?.detail;
        let errMsg = `Upload failed (${res.status})`;
        if (typeof detail === "string") errMsg = detail;
        else if (Array.isArray(detail) && detail.length > 0) {
          const parts = detail.map((e: { msg?: string; loc?: unknown }) => e?.msg || String(e));
          errMsg = parts.join(". ");
        } else if (detail && typeof detail === "object") errMsg = JSON.stringify(detail);
        throw new Error(errMsg);
      }

      const data = await res.json();
      setMessage(`Sheet music "${data.title}" uploaded successfully!`);
      setScoreSummary(data.score_summary ?? null);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null
            ? JSON.stringify(err)
            : String(err);
      const isAbort = err instanceof Error && err.name === "AbortError";
      const friendly =
        msg === "Failed to fetch"
          ? "Cannot reach server (backend may be down or CORS). Check http://localhost:8000"
          : isAbort
            ? "Request timed out (120s). Try a smaller file or check the backend."
            : msg;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">🎼 Upload Sheet Music</h2>
      <p className="mt-1 text-sm text-[#B0B7D6]">
        Upload MusicXML sheet music (.xml or .mxl)
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
          Sheet Music (MusicXML)
          <input
            ref={fileRef}
            type="file"
            accept=".xml,.mxl,application/vnd.recordare.musicxml+xml,application/octet-stream"
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

        {scoreSummary && (
          <div className="rounded-xl border border-purple-500/30 bg-[#111827] p-4">
            <h3 className="mb-2 text-sm font-semibold text-purple-300">
              Parsed score summary
            </h3>
            <ul className="space-y-1 text-sm text-[#B0B7D6]">
              {scoreSummary.key_signature != null && (
                <li>Key: {scoreSummary.key_signature}</li>
              )}
              {scoreSummary.time_signature != null && (
                <li>Time: {scoreSummary.time_signature}</li>
              )}
              <li>Measures: {scoreSummary.measure_count}</li>
              <li>Total notes: {scoreSummary.total_notes}</li>
            </ul>
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Uploading..." : "Upload MusicXML 🎼"}
        </button>
      </div>
    </section>
  );
}

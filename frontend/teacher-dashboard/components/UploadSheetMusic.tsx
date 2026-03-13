"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";
import { cleanKeySignature } from "../lib/musicUtils";

interface Props {
  studentId: number;
}

type PieceItem = {
  id: number;
  title: string;
  student_id: number;
  created_at: string;
  score_summary?: {
    key_signature?: string;
    time_signature?: string;
    measure_count: number;
    total_notes: number;
  };
};

export function UploadSheetMusic({ studentId }: Props) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreSummary, setScoreSummary] = useState<{
    key_signature?: string;
    time_signature?: string;
    measure_count: number;
    total_notes: number;
  } | null>(null);
  const [pieces, setPieces] = useState<PieceItem[]>([]);
  const [piecesLoading, setPiecesLoading] = useState(true);
  const [piecesError, setPiecesError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPieces = useCallback(
    async (overrideToken?: string | null) => {
      const token = overrideToken !== undefined ? overrideToken : getToken();
      if (!token) {
        setPiecesLoading(false);
        setPiecesError("Not signed in.");
        return;
      }
      setPiecesLoading(true);
      setPiecesError(null);
      try {
        const res = await fetch(
          `${API_URL}/ai/pieces/student/${studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          throw new Error("Failed to load pieces");
        }
        const data: PieceItem[] = await res.json();
        setPieces(Array.isArray(data) ? data : []);
      } catch {
        setPieces([]);
        setPiecesError("Could not load pieces. Please refresh.");
      } finally {
        setPiecesLoading(false);
      }
    },
    [studentId]
  );

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  const handleSubmit = async () => {
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

      const res = await fetch(`${API_URL}/ai/upload-piece`, {
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
      setScoreSummary(data.score_summary ?? null);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await fetchPieces(token);
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
          ? "Cannot reach server. Check the backend is running."
          : isAbort
            ? "Request timed out (120s). Try a smaller file or check the backend."
            : msg;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pieceId: number) => {
    const token = getToken();
    if (!token) {
      setError("No authentication token found.");
      return;
    }
    setDeletingId(pieceId);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/ai/pieces/${pieceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        const data = (() => {
          try {
            return text ? JSON.parse(text) : {};
          } catch {
            return {};
          }
        })();
        throw new Error(typeof data?.detail === "string" ? data.detail : "Failed to delete piece");
      }
      await fetchPieces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete piece");
    } finally {
      setDeletingId(null);
    }
  };

  const summaryLine = scoreSummary
    ? [
        scoreSummary.key_signature ?? "—",
        `${scoreSummary.measure_count} measures`,
        `${scoreSummary.total_notes} notes`,
      ].join(" · ")
    : null;

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">Upload Sheet Music</h2>
      <p className="mt-0.5 text-sm text-[#8B92B0]">
        MusicXML (.xml or .mxl)
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Piece title"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
          />
          <label className="flex min-w-0 flex-1 cursor-pointer items-center rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-[#B0B7D6] file:mr-2 file:border-0 file:bg-transparent file:text-sm file:text-white">
            <input
              ref={fileRef}
              type="file"
              accept=".xml,.mxl,application/vnd.recordare.musicxml+xml,application/octet-stream"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f?.name) setTitle(f.name.replace(/\.[^/.]+$/, ""));
              }}
              className="hidden"
            />
            {file ? file.name : "Choose file…"}
          </label>
        </div>
        {summaryLine && (
          <p className="text-xs text-[#8B92B0]">{summaryLine}</p>
        )}
        {error && (
          <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-medium text-[#B0B7D6]">Uploaded pieces</h3>
        {piecesError && (
          <p className="mb-2 text-sm text-rose-300">{piecesError}</p>
        )}
        {piecesLoading ? (
          <p className="text-sm text-[#8B92B0]">Loading…</p>
        ) : pieces.length === 0 ? (
          <p className="text-sm text-[#8B92B0]">No pieces yet. Upload a file above.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {pieces.map((piece) => (
              <li key={piece.id} className="first:pt-0">
                <Link
                  href={`/pieces/${piece.id}`}
                  className="flex items-center gap-3 py-2.5 transition hover:bg-white/5 rounded-lg px-2 -mx-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                    {piece.title}
                  </span>
                  <span className="shrink-0 text-xs text-[#8B92B0]">
                    {[
                      cleanKeySignature(piece.score_summary?.key_signature),
                      piece.score_summary?.measure_count != null
                        ? `${piece.score_summary.measure_count} msr`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                  <span className="shrink-0 text-xs text-[#8B92B0]">
                    {new Date(piece.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    disabled={deletingId === piece.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(piece.id);
                    }}
                    className="shrink-0 rounded p-1.5 text-[#8B92B0] hover:bg-white/10 hover:text-rose-300 disabled:opacity-50"
                    title="Delete"
                    aria-label="Delete piece"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

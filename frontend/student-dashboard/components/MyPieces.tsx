"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/api";
import { getStudentId, getStudentToken } from "../lib/auth";
import { cleanKeySignature } from "../lib/music";

type PieceItem = {
  id: number;
  title: string;
  score_summary?: {
    key_signature?: string;
    measure_count?: number;
  };
};

export function MyPieces() {
  const [pieces, setPieces] = useState<PieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPieces = useCallback(async () => {
    const studentId = getStudentId();
    const token = getStudentToken();
    if (!studentId || !token) {
      setLoading(false);
      setError("Not signed in.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/ai/pieces/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        setError("Could not load pieces. Refresh the page.");
        setPieces([]);
        return;
      }
      const data: PieceItem[] = await res.json();
      setPieces(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load pieces. Refresh the page.");
      setPieces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  useEffect(() => {
    const onFocus = () => fetchPieces();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPieces]);

  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">My Pieces</h2>
      <p className="mt-0.5 text-sm text-[#B0B7D6]">
        Sheet music your teacher assigned
      </p>
      {error ? (
        <p className="mt-4 text-sm text-rose-300">{error}</p>
      ) : loading ? (
        <p className="mt-4 text-sm text-[#B0B7D6]">Loading…</p>
      ) : pieces.length === 0 ? (
        <p className="mt-4 text-sm text-[#B0B7D6]">No pieces assigned yet.</p>
      ) : (
        <ul className="mt-4 space-y-1">
          {pieces.map((piece) => (
            <li key={piece.id}>
              <Link
                href={`/pieces/${piece.id}`}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent px-4 py-3 transition hover:border-[#58CC02]/30 hover:bg-[#58CC02]/5"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-white group-hover:text-[#A3FFB5] transition">
                    {piece.title}
                  </span>
                  <span className="ml-3 text-sm text-[#8B92B0]">
                    {[
                      cleanKeySignature(piece.score_summary?.key_signature),
                      piece.score_summary?.measure_count != null
                        ? `${piece.score_summary.measure_count} msr`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </div>
                <span className="ml-2 text-[#8B92B0] transition group-hover:text-[#58CC02]">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

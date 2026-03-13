"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "../../../lib/api";
import { getStudentId, getStudentToken } from "../../../lib/auth";
import { cleanKeySignature } from "../../../lib/musicUtils";

type PieceData = {
  id: number;
  title: string;
  student_id: number;
  musicxml_data: string | null;
  score_summary?: {
    key_signature?: string;
    time_signature?: string;
    measure_count: number;
    total_notes: number;
  };
  created_at: string;
};

const DEVICE_ID = "keysight-pi";

export default function PieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<PieceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [osmdReady, setOsmdReady] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [startingPractice, setStartingPractice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPiece = useCallback(async () => {
    const token = getStudentToken();
    if (!token) { setLoading(false); setError("Not signed in."); return; }
    try {
      const res = await fetch(`${API_URL}/ai/pieces/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load piece (${res.status})`);
      setPiece(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load piece");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPiece(); }, [fetchPiece]);

  // Check if already practicing this piece
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/active/${DEVICE_ID}`);
        if (res.ok) {
          const data = await res.json();
          const studentId = getStudentId();
          if (studentId && data.student_id === studentId && data.piece_id === Number(id)) {
            setPracticing(true);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [id]);

  useEffect(() => {
    if (!piece?.musicxml_data || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled || !containerRef.current) return;

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
        });
        await osmd.load(piece.musicxml_data!);
        if (cancelled) return;
        osmd.render();
        setOsmdReady(true);
      } catch (err) {
        console.error("OSMD render error:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [piece?.musicxml_data]);

  const handleStartPractice = async () => {
    const token = getStudentToken();
    const studentId = getStudentId();
    if (!token || !studentId) return;

    setStartingPractice(true);
    try {
      const res = await fetch(`${API_URL}/sessions/active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device_id: DEVICE_ID,
          student_id: studentId,
          piece_id: Number(id),
        }),
      });
      if (res.ok) setPracticing(true);
    } catch { /* ignore */ }
    finally { setStartingPractice(false); }
  };

  const handleStopPractice = async () => {
    const token = getStudentToken();
    if (!token) return;
    try {
      await fetch(`${API_URL}/sessions/active/${DEVICE_ID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPracticing(false);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1C1F2E] px-6 pb-12 pt-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-[#B0B7D6]">Loading piece…</p>
        </div>
      </main>
    );
  }

  if (error || !piece) {
    return (
      <main className="min-h-screen bg-[#1C1F2E] px-6 pb-12 pt-8">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => router.back()} className="mb-4 text-sm text-[#B0B7D6] hover:text-white">
            ← Back
          </button>
          <div className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            {error || "Piece not found"}
          </div>
        </div>
      </main>
    );
  }

  const keySig = cleanKeySignature(piece.score_summary?.key_signature);
  const timeSig = piece.score_summary?.time_signature;

  return (
    <main className="min-h-screen bg-[#1C1F2E] px-6 pb-12 pt-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[#B0B7D6] transition hover:text-white">
          ← Back
        </button>

        {/* Header */}
        <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-white">{piece.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#B0B7D6]">
            {keySig && <span className="rounded-full bg-[#58CC02]/20 px-3 py-1 text-[#A3FFB5]">{keySig}</span>}
            {timeSig && <span className="rounded-full bg-white/5 px-3 py-1">{timeSig}</span>}
            {piece.score_summary && (
              <>
                <span className="rounded-full bg-white/5 px-3 py-1">{piece.score_summary.measure_count} measures</span>
                <span className="rounded-full bg-white/5 px-3 py-1">{piece.score_summary.total_notes} notes</span>
              </>
            )}
          </div>

          {/* Practice button */}
          <div className="mt-5">
            {practicing ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-[#1a2a1a] px-4 py-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#58CC02] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#58CC02]" />
                  </span>
                  <span className="text-sm font-semibold text-[#A3FFB5]">Practicing now 🎹</span>
                </div>
                <button
                  onClick={handleStopPractice}
                  className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Stop
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartPractice}
                disabled={startingPractice}
                className="rounded-xl bg-[#58CC02] px-6 py-3 text-lg font-bold text-[#1C1F2E] shadow-lg shadow-[#58CC02]/30 transition hover:bg-[#4AB800] disabled:opacity-50"
              >
                {startingPractice ? "Starting…" : "🎹 Start Practice Session"}
              </button>
            )}
          </div>
        </section>

        {/* Sheet Music */}
        <section className="rounded-2xl bg-white p-6 shadow-xl">
          {!piece.musicxml_data ? (
            <p className="text-sm text-zinc-500">No sheet music data available.</p>
          ) : (
            <>
              {!osmdReady && <p className="mb-4 text-sm text-zinc-400">Rendering sheet music…</p>}
              <div ref={containerRef} className="min-h-[200px]" />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

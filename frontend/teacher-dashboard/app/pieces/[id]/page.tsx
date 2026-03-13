"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { API_URL } from "../../../lib/api";
import { getToken } from "../../../lib/auth";
import { cleanKeySignature } from "../../../lib/music";

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

export default function PieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<PieceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [osmdReady, setOsmdReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<unknown>(null);

  const fetchPiece = useCallback(async () => {
    const token = getToken();
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
        osmdRef.current = osmd;
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

  if (loading) {
    return (
      <main className="min-h-full px-8 pt-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-zinc-400">Loading piece…</p>
        </div>
      </main>
    );
  }

  if (error || !piece) {
    return (
      <main className="min-h-full px-8 pt-24">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
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
    <main className="min-h-full px-8 pt-24 pb-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-white">{piece.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
            {keySig && <span className="rounded-full bg-purple-600/20 px-3 py-1 text-purple-300">{keySig}</span>}
            {timeSig && <span className="rounded-full bg-white/5 px-3 py-1">{timeSig}</span>}
            {piece.score_summary && (
              <>
                <span className="rounded-full bg-white/5 px-3 py-1">{piece.score_summary.measure_count} measures</span>
                <span className="rounded-full bg-white/5 px-3 py-1">{piece.score_summary.total_notes} notes</span>
              </>
            )}
            <span className="rounded-full bg-white/5 px-3 py-1">
              Uploaded {new Date(piece.created_at).toLocaleDateString()}
            </span>
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../lib/api";
import { getStudentId, getStudentToken } from "../lib/auth";

interface Piece {
  id: number;
  title: string;
}

const DEVICE_ID = "keysight-pi";

export function StartPracticing() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>("free");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPieces = useCallback(async () => {
    const token = getStudentToken();
    const studentId = getStudentId();
    if (!token || !studentId) return;

    try {
      const res = await fetch(
        `${API_URL}/ai/pieces/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data: Piece[] = await res.json();
        setPieces(data);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/active/${DEVICE_ID}`);
        if (res.ok) {
          const data = await res.json();
          const studentId = getStudentId();
          if (studentId && data.student_id === studentId) {
            setIsLive(true);
            if (data.piece_id) setSelectedPieceId(String(data.piece_id));
          }
        }
      } catch {
        /* ignore */
      }
    };
    checkActive();
  }, []);

  const handleStart = async () => {
    const token = getStudentToken();
    const studentId = getStudentId();
    if (!token || !studentId) return;

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        device_id: DEVICE_ID,
        student_id: studentId,
      };
      if (selectedPieceId !== "free") {
        body.piece_id = Number(selectedPieceId);
      }

      const res = await fetch(`${API_URL}/sessions/active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) setIsLive(true);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    const token = getStudentToken();
    if (!token) return;

    setLoading(true);
    try {
      await fetch(`${API_URL}/sessions/active/${DEVICE_ID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsLive(false);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="mb-4 text-xl font-bold text-white">Start Practicing</h2>

      {isLive ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#1a2a1a] px-5 py-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#58CC02] opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#58CC02]" />
            </span>
            <span className="text-lg font-semibold text-[#A3FFB5]">
              You are now live on the piano 🎹
            </span>
          </div>
          <button
            onClick={handleStop}
            disabled={loading}
            className="rounded-xl bg-red-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Stopping…" : "Stop Practicing"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="piece-select"
              className="mb-1 block text-sm font-medium text-[#B0B7D6]"
            >
              Choose a piece
            </label>
            <select
              id="piece-select"
              value={selectedPieceId}
              onChange={(e) => setSelectedPieceId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1C1F2E] px-4 py-2.5 text-white focus:border-[#58CC02] focus:outline-none"
            >
              <option value="free">Free Play / Improvisation</option>
              {pieces.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleStart}
            disabled={loading}
            className="rounded-xl bg-[#58CC02] px-8 py-3 text-lg font-bold text-[#1C1F2E] shadow-lg shadow-[#58CC02]/30 transition hover:bg-[#4AB800] disabled:opacity-50"
          >
            {loading ? "Starting…" : "🎹 Start Practicing"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";
import type { Session, SessionEvent } from "@/types/session";

type Piece = { id: number; title: string };
type AIReport = {
  id: number;
  session_id: number | null;
  student_id: number;
  teacher_report: string | null;
  created_at: string;
};

interface Props {
  studentId: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function pieceName(pieceId: number | null, pieces: Piece[]) {
  if (pieceId == null) return "Free Play 🎵";
  const p = pieces.find((x) => x.id === pieceId);
  return p ? p.title : `Piece #${pieceId}`;
}

function noteOnEvents(events: SessionEvent[]) {
  return events.filter((e) => e.type === "note_on" && e.velocity > 0);
}

function buildNoteDistribution(events: SessionEvent[]) {
  const counts: Record<string, number> = {};
  for (const e of noteOnEvents(events)) {
    counts[e.note] = (counts[e.note] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([note, count]) => ({ note, count }));
}

function buildVelocityTimeline(events: SessionEvent[]) {
  return noteOnEvents(events).map((e, i) => ({
    index: i,
    time: (e.time_offset_ms / 1000).toFixed(1) + "s",
    velocity: e.velocity,
  }));
}

// ── MIDI Playback via Tone.js PolySynth (piano-like) ─────────────────────────

function SessionRow({
  session,
  pieces,
  report,
}: {
  session: Session;
  pieces: Piece[];
  report: AIReport | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);
  const synthRef = useRef<unknown>(null);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (synthRef.current as any).dispose?.();
        synthRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    const Tone = (await import("tone")).default ?? (await import("tone"));
    await Tone.start();

    if (synthRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (synthRef.current as any).dispose?.();
    }

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.005,
        decay: 0.3,
        sustain: 0.1,
        release: 1.2,
      },
      volume: -6,
    }).toDestination();
    synthRef.current = synth;

    stopRef.current = false;
    setPlaying(true);

    const ons = noteOnEvents(session.events);
    const offs = session.events.filter(
      (e) => e.type === "note_off" || (e.type === "note_on" && e.velocity === 0)
    );

    for (const evt of ons) {
      if (stopRef.current) break;

      const offEvt = offs.find(
        (o) => o.note === evt.note && o.time_offset_ms > evt.time_offset_ms
      );
      const dur = offEvt
        ? Math.max(0.05, (offEvt.time_offset_ms - evt.time_offset_ms) / 1000)
        : 0.3;
      const vel = evt.velocity / 127;

      synth.triggerAttackRelease(evt.note, dur, undefined, vel);

      const idx = ons.indexOf(evt);
      const nextOn = ons[idx + 1];
      if (nextOn) {
        const gap = (nextOn.time_offset_ms - evt.time_offset_ms) / 1000;
        if (gap > 0) {
          await new Promise<void>((r) => setTimeout(r, gap * 1000));
        }
      }
    }

    setPlaying(false);
  };

  const handleStop = () => {
    stopRef.current = true;
    if (synthRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (synthRef.current as any).releaseAll?.();
    }
    setPlaying(false);
  };

  const noteDist = open ? buildNoteDistribution(session.events) : [];
  const velTimeline = open ? buildVelocityTimeline(session.events) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1D27]">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-white">
              {pieceName(session.piece_id, pieces)}
            </span>
            <span className="text-sm text-zinc-400">
              {formatDate(session.started_at)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-500">
            <span>{formatDuration(session.duration_seconds)}</span>
            <span>{session.total_notes} notes</span>
            <span>
              {report ? (
                <span className="text-[#6C63FF]">Has AI report</span>
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="space-y-6 border-t border-white/10 px-5 py-5">
          {/* Playback */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-zinc-300">
              MIDI Playback
            </h4>
            {playing ? (
              <button
                onClick={handleStop}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a52e0]"
              >
                ▶ Play
              </button>
            )}
          </div>

          {/* Note distribution */}
          {noteDist.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-300">
                Note Distribution
              </h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={noteDist}>
                    <XAxis
                      dataKey="note"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1A1D27",
                        border: "1px solid #333",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Velocity timeline */}
          {velTimeline.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-300">
                Velocity Timeline
              </h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velTimeline}>
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 127]}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1A1D27",
                        border: "1px solid #333",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="velocity"
                      stroke="#6C63FF"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Report link */}
          {report && (
            <button
              onClick={() => {
                document
                  .getElementById("ai-report-section")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-lg border border-[#6C63FF]/40 bg-[#6C63FF]/10 px-4 py-2 text-sm font-semibold text-[#6C63FF] transition hover:bg-[#6C63FF]/20"
            >
              📋 View AI Report
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionsList({ studentId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [sessRes, piecesRes, reportsRes] = await Promise.all([
        fetch(`${API_URL}/sessions?student_id=${studentId}`, { headers }),
        fetch(`${API_URL}/ai/pieces/student/${studentId}`, { headers }),
        fetch(`${API_URL}/ai/reports/student/${studentId}`, { headers }),
      ]);

      if (sessRes.ok) setSessions(await sessRes.json());
      if (piecesRes.ok) setPieces(await piecesRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const reportBySession = new Map<number, AIReport>();
  for (const r of reports) {
    if (r.session_id != null) reportBySession.set(r.session_id, r);
  }

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <h2 className="mb-4 text-lg font-semibold text-white">🎹 Sessions</h2>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-[#111827] p-6 text-center text-sm text-zinc-400">
          No sessions recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              pieces={pieces}
              report={reportBySession.get(s.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

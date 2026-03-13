"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
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

/* ── Helpers ─────────────────────────────────────────────────────────────── */

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

/* ── Global Piano Instrument (module-level singleton) ────────────────────── */

const SALAMANDER_URLS: Record<string, string> = {
  A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
  A7: "A7.mp3", C8: "C8.mp3",
};
const SALAMANDER_BASE = "https://tonejs.github.io/audio/salamander/";
const LOAD_TIMEOUT_MS = 20_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tone: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instrument: any = null;
let _instType: "sampler" | "synth" | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _loadPromise: Promise<any> | null = null;

/**
 * Initialise (or return cached) piano instrument.
 * MUST be called from a user-gesture handler to satisfy AudioContext policy.
 */
async function ensurePiano() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tone: any = _tone ?? (await import("tone"));
  _tone = Tone;
  await Tone.start();

  if (_instrument) return { tone: Tone, instrument: _instrument, type: _instType! };

  if (_loadPromise) {
    await _loadPromise;
    return { tone: Tone, instrument: _instrument!, type: _instType! };
  }

  _loadPromise = (async () => {
    try {
      const sampler = new Tone.Sampler({
        urls: SALAMANDER_URLS,
        baseUrl: SALAMANDER_BASE,
      }).toDestination();

      await Promise.race([
        Tone.loaded(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), LOAD_TIMEOUT_MS)
        ),
      ]);

      _instrument = sampler;
      _instType = "sampler";
      console.log("Salamander piano sampler loaded");
    } catch (err) {
      console.warn("Sampler failed, falling back to PolySynth:", err);
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1.0 },
      });
      _instrument = synth;
      _instType = "synth";
    }
  })();

  try {
    await _loadPromise;
    return { tone: Tone, instrument: _instrument!, type: _instType! };
  } catch {
    _loadPromise = null;
    throw new Error("Could not initialise audio");
  }
}

/** Stop Transport and release all sounding notes (synchronous-safe). */
function haltPlayback() {
  if (!_tone) return;
  const transport = _tone.getTransport();
  transport.stop();
  transport.cancel();
  _instrument?.releaseAll?.();
}

/* ── SessionRow ──────────────────────────────────────────────────────────── */

function SessionRow({
  session,
  pieces,
  report,
  playbackState,
  anyLoading,
  onPlay,
  onStop,
}: {
  session: Session;
  pieces: Piece[];
  report: AIReport | undefined;
  playbackState: "idle" | "loading" | "playing";
  anyLoading: boolean;
  onPlay: (sessionId: number, events: SessionEvent[]) => void;
  onStop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const noteDist = open ? buildNoteDistribution(session.events) : [];
  const velTimeline = open ? buildVelocityTimeline(session.events) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1D27]">
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

      {open && (
        <div className="space-y-6 border-t border-white/10 px-5 py-5">
          {/* Playback */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-zinc-300">
              MIDI Playback
            </h4>
            {playbackState === "loading" ? (
              <button
                disabled
                className="flex items-center gap-2 rounded-lg bg-[#6C63FF]/60 px-4 py-2 text-sm font-semibold text-white"
              >
                <Loader2 className="h-4 w-4 animate-spin" /> Loading piano…
              </button>
            ) : playbackState === "playing" ? (
              <button
                onClick={onStop}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                <Pause className="h-4 w-4" /> Pause
              </button>
            ) : (
              <button
                onClick={() => onPlay(session.id, session.events)}
                disabled={anyLoading}
                className="flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a52e0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" /> Play
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

/* ── SessionsList ────────────────────────────────────────────────────────── */

export function SessionsList({ studentId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [pianoReady, setPianoReady] = useState(false);
  const [pianoLoading, setPianoLoading] = useState(false);
  const [pianoError, setPianoError] = useState<string | null>(null);

  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingPlayId, setLoadingPlayId] = useState<number | null>(null);

  /* ── Fetch data ── */

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
      /* network error — ignore */
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── Pre-load piano (user-triggered) ── */

  const handlePreload = useCallback(async () => {
    setPianoLoading(true);
    setPianoError(null);
    try {
      await ensurePiano();
      setPianoReady(true);
    } catch (err) {
      setPianoError(
        err instanceof Error ? err.message : "Failed to load audio"
      );
    } finally {
      setPianoLoading(false);
    }
  }, []);

  /* ── Transport-scheduled playback ── */

  const handlePlay = useCallback(
    async (sessionId: number, events: SessionEvent[]) => {
      haltPlayback();
      setPlayingId(null);
      setLoadingPlayId(sessionId);

      try {
        const { tone, instrument } = await ensurePiano();
        setPianoReady(true);

        setLoadingPlayId(null);
        setPlayingId(sessionId);

        const transport = tone.getTransport();
        transport.cancel();
        transport.stop();
        transport.seconds = 0;

        const ons = noteOnEvents(events);
        const offs = events.filter(
          (e: SessionEvent) =>
            e.type === "note_off" ||
            (e.type === "note_on" && e.velocity === 0)
        );

        for (const evt of ons) {
          const timeSec = evt.time_offset_ms / 1000;
          const offEvt = offs.find(
            (o: SessionEvent) =>
              o.note === evt.note && o.time_offset_ms > evt.time_offset_ms
          );
          const dur = offEvt
            ? Math.max(
                0.05,
                (offEvt.time_offset_ms - evt.time_offset_ms) / 1000
              )
            : 0.3;
          const vel = evt.velocity / 127;

          transport.schedule((audioTime: number) => {
            instrument.triggerAttackRelease(evt.note, dur, audioTime, vel);
          }, timeSec);
        }

        const lastMs =
          ons.length > 0 ? ons[ons.length - 1].time_offset_ms : 0;
        transport.schedule((audioTime: number) => {
          tone.Draw.schedule(() => {
            setPlayingId(null);
          }, audioTime);
        }, lastMs / 1000 + 1.5);

        transport.start();
      } catch (err) {
        console.error("Playback error:", err);
        setLoadingPlayId(null);
        setPlayingId(null);
      }
    },
    []
  );

  const handleStop = useCallback(() => {
    haltPlayback();
    setPlayingId(null);
    setLoadingPlayId(null);
  }, []);

  /* ── Cleanup on unmount ── */

  useEffect(() => () => haltPlayback(), []);

  /* ── Render ── */

  const reportBySession = new Map<number, AIReport>();
  for (const r of reports) {
    if (r.session_id != null) reportBySession.set(r.session_id, r);
  }

  const anyLoading = loadingPlayId !== null || pianoLoading;

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">🎹 Sessions</h2>

        {sessions.length > 0 && !pianoReady && (
          <button
            onClick={handlePreload}
            disabled={pianoLoading}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-60"
          >
            {pianoLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading piano…
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                Load Piano
              </>
            )}
          </button>
        )}
      </div>

      {pianoError && (
        <p className="mb-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
          {pianoError}
        </p>
      )}

      {pianoReady && _instType === "synth" && (
        <p className="mb-3 text-xs text-amber-400">
          Using synthesiser fallback — Salamander samples could not be loaded.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-[#111827] p-6 text-center text-sm text-zinc-400">
          No sessions recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            let pbState: "idle" | "loading" | "playing" = "idle";
            if (loadingPlayId === s.id) pbState = "loading";
            else if (playingId === s.id) pbState = "playing";

            return (
              <SessionRow
                key={s.id}
                session={s}
                pieces={pieces}
                report={reportBySession.get(s.id)}
                playbackState={pbState}
                anyLoading={anyLoading}
                onPlay={handlePlay}
                onStop={handleStop}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

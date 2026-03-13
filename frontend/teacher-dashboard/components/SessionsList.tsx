"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
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

const DATE_FILTERS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "This Week" },
] as const;
type DateFilter = (typeof DATE_FILTERS)[number]["value"];

const CHART_TOOLTIP_STYLE = {
  background: "#1A1D27",
  border: "1px solid #333",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
} as const;

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

function fmtMmSs(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec) % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pieceName(pieceId: number | null, pieces: Piece[]) {
  if (pieceId == null) return "Free Play 🎵";
  const p = pieces.find((x) => x.id === pieceId);
  return p ? p.title : `Piece #${pieceId}`;
}

function noteOnEvents(events: SessionEvent[]) {
  return events.filter(
    (e): e is SessionEvent & { note: string; velocity: number; time_offset_ms: number } =>
      e.type === "note_on" && (e.velocity ?? 0) > 0
  );
}

/** Time in seconds for scheduling. Notes use time_offset_ms; sustain uses time (ms). */
function getEventTimeSec(e: SessionEvent): number {
  if (e.type === "sustain" && e.time != null) return e.time / 1000;
  return (e.time_offset_ms ?? 0) / 1000;
}

/** Sort order for same-time events: pedal up first, then note_off, note_on, then pedal down. */
function eventSortOrder(e: SessionEvent): number {
  if (e.type === "sustain") return (e.value ?? 0) > 0 ? 3 : 0;
  if (e.type === "note_off" || (e.type === "note_on" && (e.velocity ?? 0) === 0)) return 1;
  return 2; // note_on
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _initFallbackSynth(Tone: any) {
  console.warn("Initialising PolySynth fallback");
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.set({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1.0 },
  });
  synth.volume.value = 3;
  _instrument = synth;
  _instType = "synth";
}

/**
 * Initialise (or return cached) piano instrument.
 * MUST be called from a user-gesture handler to satisfy AudioContext policy.
 */
async function ensurePiano() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tone: any = _tone ?? (await import("tone"));
  _tone = Tone;

  await Tone.start();
  const ctx = Tone.getContext();
  if (ctx.state !== "running") await ctx.resume();

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
          setTimeout(
            () => rej(new Error("Sampler load timed out after " + LOAD_TIMEOUT_MS + "ms")),
            LOAD_TIMEOUT_MS
          )
        ),
      ]);

      sampler.volume.value = 3;
      _instrument = sampler;
      _instType = "sampler";
    } catch (err) {
      console.warn("Sampler failed, falling back to PolySynth:", err);
      _initFallbackSynth(Tone);
    }
  })();

  try {
    await _loadPromise;
  } catch (err) {
    console.warn("ensurePiano rejected, forcing synth fallback:", err);
    _loadPromise = null;
    if (!_instrument) _initFallbackSynth(Tone);
  }

  return { tone: Tone, instrument: _instrument!, type: _instType! };
}

/** Stop Transport and release all sounding notes (synchronous-safe). */
function haltPlayback() {
  if (!_tone) return;
  const transport = _tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.seconds = 0;
  _instrument?.releaseAll?.();
}

/* ── ProgressBar (rAF-driven, canvas waveform, click/drag seeking) ───────── */

function ProgressBar({
  totalSec,
  events,
  onSeek,
}: {
  totalSec: number;
  events: SessionEvent[];
  onSeek: (timeSec: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const isDragging = useRef(false);
  const dragTime = useRef(0);

  // Draw MIDI note ticks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track || totalSec <= 0) return;

    const rect = track.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const ons = noteOnEvents(events);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    for (const evt of ons) {
      const x = (evt.time_offset_ms / 1000 / totalSec) * rect.width;
      const h = Math.max(2, (evt.velocity / 127) * rect.height);
      ctx.fillRect(Math.round(x), rect.height - h, 1.5, h);
    }
  }, [events, totalSec]);

  // Animate progress via rAF (skips updates while user is dragging)
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (
        !isDragging.current &&
        _tone &&
        fillRef.current &&
        headRef.current &&
        textRef.current
      ) {
        const sec = _tone.getTransport().seconds;
        const pct = totalSec > 0 ? Math.min(100, (sec / totalSec) * 100) : 0;
        fillRef.current.style.width = `${pct}%`;
        headRef.current.style.left = `${pct}%`;
        textRef.current.textContent = `${fmtMmSs(sec)} / ${fmtMmSs(totalSec)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalSec]);

  // ── Seeking (pointer capture for click + drag) ──

  const pctFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || totalSec <= 0) return 0;
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [totalSec]
  );

  const applyVisualSeek = useCallback(
    (pct: number) => {
      const p = `${pct * 100}%`;
      if (fillRef.current) fillRef.current.style.width = p;
      if (headRef.current) headRef.current.style.left = p;
      if (textRef.current)
        textRef.current.textContent = `${fmtMmSs(pct * totalSec)} / ${fmtMmSs(totalSec)}`;
    },
    [totalSec]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      trackRef.current?.setPointerCapture(e.pointerId);
      isDragging.current = true;
      const pct = pctFromClientX(e.clientX);
      dragTime.current = pct * totalSec;
      applyVisualSeek(pct);
    },
    [totalSec, pctFromClientX, applyVisualSeek]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      const pct = pctFromClientX(e.clientX);
      dragTime.current = pct * totalSec;
      applyVisualSeek(pct);
    },
    [totalSec, pctFromClientX, applyVisualSeek]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      trackRef.current?.releasePointerCapture(e.pointerId);
      onSeek(dragTime.current);
    },
    [onSeek]
  );

  return (
    <div className="mt-3 flex items-center gap-3">
      {/* Pulsing "now playing" dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6C63FF] opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#6C63FF]" />
      </span>

      {/* Scrubber track */}
      <div
        ref={trackRef}
        className="relative flex-1 h-8 rounded-lg bg-white/5 overflow-hidden cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* MIDI note ticks (velocity waveform) */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {/* Progress fill overlay */}
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 bg-[#6C63FF]/20 pointer-events-none"
          style={{ width: "0%" }}
        />
        {/* Playhead line */}
        <div
          ref={headRef}
          className="absolute inset-y-0 w-0.5 bg-white/60 pointer-events-none"
          style={{ left: "0%" }}
        />
      </div>

      {/* Time */}
      <span
        ref={textRef}
        className="shrink-0 text-xs font-mono tabular-nums text-zinc-400 whitespace-nowrap"
      >
        0:00 / {fmtMmSs(totalSec)}
      </span>
    </div>
  );
}

/* ── SessionRow ──────────────────────────────────────────────────────────── */

function SessionRow({
  session,
  pieces,
  report,
  playbackState,
  playbackTotalSec,
  anyLoading,
  onPlay,
  onStop,
  onSeek,
  onDelete,
}: {
  session: Session;
  pieces: Piece[];
  report: AIReport | undefined;
  playbackState: "idle" | "loading" | "playing";
  playbackTotalSec: number;
  anyLoading: boolean;
  onPlay: (sessionId: number, events: SessionEvent[], durationSec: number) => void;
  onStop: () => void;
  onSeek: (timeSec: number) => void;
  onDelete: (sessionId: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const noteDist = open ? buildNoteDistribution(session.events) : [];
  const velTimeline = open ? buildVelocityTimeline(session.events) : [];

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(session.id);
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1D27]">
      {/* Header row */}
      <div
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition hover:bg-white/5"
        onClick={() => setOpen(!open)}
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400"
          title="Delete session"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div className="flex items-center justify-between border-t border-rose-500/20 bg-rose-500/10 px-5 py-3">
          <span className="text-sm text-rose-200">
            Permanently delete this session?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
              className="rounded-lg px-3 py-1 text-xs text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="space-y-6 border-t border-white/10 px-5 py-5">
          {/* ── Playback controls ── */}
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
                onClick={() =>
                  onPlay(session.id, session.events, session.duration_seconds)
                }
                disabled={anyLoading}
                className="flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a52e0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" /> Play
              </button>
            )}

            {/* Progress bar — only visible while playing */}
            {playbackState === "playing" && playbackTotalSec > 0 && (
              <ProgressBar
                totalSec={playbackTotalSec}
                events={session.events}
                onSeek={onSeek}
              />
            )}
          </div>

          {/* ── Note distribution ── */}
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
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Velocity timeline ── */}
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
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
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

          {/* ── AI Report link ── */}
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const [pianoReady, setPianoReady] = useState(false);
  const [pianoLoading, setPianoLoading] = useState(false);
  const [pianoError, setPianoError] = useState<string | null>(null);

  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingPlayId, setLoadingPlayId] = useState<number | null>(null);
  const [playbackTotalSec, setPlaybackTotalSec] = useState(0);

  const playingEventsRef = useRef<SessionEvent[]>([]);
  const playingTotalRef = useRef(0);

  /* ── Fetch data ── */

  const fetchAll = useCallback(
    async (filter: DateFilter = "all", options?: { silent?: boolean }) => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      if (!options?.silent) setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      let sessUrl = `${API_URL}/sessions?student_id=${studentId}`;
      if (filter !== "all") sessUrl += `&date_range=${filter}`;

      try {
        const [sessRes, piecesRes, reportsRes] = await Promise.all([
          fetch(sessUrl, { headers }),
          fetch(`${API_URL}/ai/pieces/student/${studentId}`, { headers }),
          fetch(`${API_URL}/ai/reports/student/${studentId}`, { headers }),
        ]);
        if (sessRes.ok) setSessions(await sessRes.json());
        if (piecesRes.ok) setPieces(await piecesRes.json());
        if (reportsRes.ok) setReports(await reportsRes.json());
      } catch {
        /* network error — ignore */
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [studentId]
  );

  useEffect(() => {
    fetchAll(dateFilter);
  }, [fetchAll, dateFilter]);

  /* Auto-refresh sessions every 30s so new uploads appear without manual refresh */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll(dateFilter, { silent: true });
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll, dateFilter]);

  /* ── Enable Audio (user-triggered preload) ── */

  const handleEnableAudio = useCallback(async () => {
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
    async (sessionId: number, events: SessionEvent[], durationSec: number) => {
      haltPlayback();
      setPlayingId(null);
      setPlaybackTotalSec(0);
      setLoadingPlayId(sessionId);
      setPianoError(null);

      try {
        const { tone, instrument } = await ensurePiano();
        setPianoReady(true);

        const transport = tone.getTransport();
        transport.cancel();
        transport.stop();
        transport.seconds = 0;

        const ons = noteOnEvents(events);

        // Sustain pedal state (updated by scheduled callbacks)
        let pedalDown = false;
        const heldNotes = new Set<string>();

        // All events sorted by time; same time: sustain_up → note_off → note_on → sustain_down
        const allEvents = [...events].filter(
          (e) =>
            e.type === "sustain" ||
            e.type === "note_on" ||
            e.type === "note_off"
        );
        allEvents.sort(
          (a, b) =>
            getEventTimeSec(a) - getEventTimeSec(b) ||
            eventSortOrder(a) - eventSortOrder(b)
        );

        for (const evt of allEvents) {
          const timeSec = getEventTimeSec(evt);

          if (evt.type === "sustain") {
            const value = evt.value ?? 0;
            transport.schedule((audioTime: number) => {
              if (value > 0) {
                pedalDown = true;
                (instrument as { pedalDown?: () => void }).pedalDown?.();
              } else {
                for (const note of heldNotes) {
                  instrument.triggerRelease(note, audioTime);
                }
                heldNotes.clear();
                pedalDown = false;
                (instrument as { pedalUp?: () => void }).pedalUp?.();
              }
            }, timeSec);
            continue;
          }

          const isOff =
            evt.type === "note_off" || (evt.type === "note_on" && (evt.velocity ?? 0) === 0);
          const note = evt.note!;
          const timeOffsetMs = evt.time_offset_ms ?? 0;

          if (isOff) {
            transport.schedule((audioTime: number) => {
              if (pedalDown) {
                heldNotes.add(note);
              } else {
                instrument.triggerRelease(note, audioTime);
              }
            }, timeSec);
          } else {
            // note_on with velocity > 0
            const vel = Math.min(
              1,
              Math.max(0.3, ((evt.velocity ?? 0) / 127) * 1.5)
            );
            transport.schedule((audioTime: number) => {
              instrument.triggerAttack(note, audioTime, vel);
            }, timeSec);
          }
        }

        const lastNoteMs = ons.length > 0 ? ons[ons.length - 1].time_offset_ms : 0;
        const lastSustainMs = Math.max(
          0,
          ...events.filter((e) => e.type === "sustain").map((e) => e.time ?? 0)
        );
        const lastMs = Math.max(lastNoteMs, lastSustainMs);
        const totalSec = Math.max(lastMs / 1000, durationSec);

        transport.schedule((audioTime: number) => {
          tone.Draw.schedule(() => {
            setPlayingId(null);
            setPlaybackTotalSec(0);
          }, audioTime);
        }, totalSec + 1.5);

        playingEventsRef.current = events;
        playingTotalRef.current = totalSec;
        setLoadingPlayId(null);
        setPlayingId(sessionId);
        setPlaybackTotalSec(totalSec);

        transport.start();
      } catch (err) {
        setPianoError(
          err instanceof Error ? err.message : "Playback failed"
        );
        setLoadingPlayId(null);
        setPlayingId(null);
        setPlaybackTotalSec(0);
      }
    },
    []
  );

  const handleStop = useCallback(() => {
    haltPlayback();
    setPlayingId(null);
    setLoadingPlayId(null);
    setPlaybackTotalSec(0);
  }, []);

  /* ── Seek to a specific time (re-schedules future events, restores pedal state) ── */

  const handleSeek = useCallback((timeSec: number) => {
    if (!_tone || !_instrument) return;

    const transport = _tone.getTransport();
    transport.stop();
    transport.cancel();
    _instrument.releaseAll();

    const events = playingEventsRef.current;
    const totalSec = playingTotalRef.current;

    // Replay events before timeSec to get correct pedal state (and held notes) at seek position
    let pedalDown = false;
    let heldNotes = new Set<string>();
    const allEvents = [...events].filter(
      (e) =>
        e.type === "sustain" || e.type === "note_on" || e.type === "note_off"
    );
    allEvents.sort(
      (a, b) =>
        getEventTimeSec(a) - getEventTimeSec(b) ||
        eventSortOrder(a) - eventSortOrder(b)
    );

    for (const evt of allEvents) {
      const evtTime = getEventTimeSec(evt);
      if (evtTime < timeSec - 0.001) {
        // Update pedal state for events before seek time
        if (evt.type === "sustain") {
          pedalDown = (evt.value ?? 0) > 0;
          if (!pedalDown) heldNotes = new Set();
        } else {
          const isOff =
            evt.type === "note_off" ||
            (evt.type === "note_on" && (evt.velocity ?? 0) === 0);
          const note = evt.note!;
          if (isOff) {
            if (pedalDown) heldNotes.add(note);
          }
        }
        continue;
      }

      if (evt.type === "sustain") {
        const value = evt.value ?? 0;
        transport.schedule((audioTime: number) => {
          if (value > 0) {
            pedalDown = true;
            (_instrument as { pedalDown?: () => void }).pedalDown?.();
          } else {
            for (const note of heldNotes) {
              _instrument.triggerRelease(note, audioTime);
            }
            heldNotes.clear();
            pedalDown = false;
            (_instrument as { pedalUp?: () => void }).pedalUp?.();
          }
        }, evtTime);
        continue;
      }

      const isOff =
        evt.type === "note_off" ||
        (evt.type === "note_on" && (evt.velocity ?? 0) === 0);
      const note = evt.note!;

      if (isOff) {
        transport.schedule((audioTime: number) => {
          if (pedalDown) {
            heldNotes.add(note);
          } else {
            _instrument.triggerRelease(note, audioTime);
          }
        }, evtTime);
      } else {
        const vel = Math.min(
          1,
          Math.max(0.3, ((evt.velocity ?? 0) / 127) * 1.5)
        );
        transport.schedule((audioTime: number) => {
          _instrument.triggerAttack(note, audioTime, vel);
        }, evtTime);
      }
    }

    transport.schedule((audioTime: number) => {
      _tone.Draw.schedule(() => {
        setPlayingId(null);
        setPlaybackTotalSec(0);
      }, audioTime);
    }, totalSec + 1.5);

    transport.seconds = timeSec;
    transport.start();
  }, []);

  /* ── Delete session ── */

  const handleDelete = useCallback(
    async (sessionId: number) => {
      const token = getToken();
      if (!token) return;

      if (playingId === sessionId) {
        haltPlayback();
        setPlayingId(null);
        setPlaybackTotalSec(0);
      }

      const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete session");

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [playingId]
  );

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">🎹 Sessions</h2>

        {/* Date filter pills + Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  dateFilter === f.value
                    ? "bg-[#6C63FF] text-white"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await fetchAll(dateFilter);
              setRefreshing(false);
            }}
            disabled={refreshing || loading}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Refresh sessions"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Enable Audio banner ── */}
      {sessions.length > 0 && !pianoReady && (
        <button
          onClick={handleEnableAudio}
          disabled={pianoLoading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 px-4 py-3 text-sm font-medium text-[#6C63FF] transition hover:bg-[#6C63FF]/20 disabled:opacity-60"
        >
          {pianoLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading piano samples…
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              Click to enable audio playback
            </>
          )}
        </button>
      )}

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
                playbackTotalSec={
                  playingId === s.id ? playbackTotalSec : 0
                }
                anyLoading={anyLoading}
                onPlay={handlePlay}
                onStop={handleStop}
                onSeek={handleSeek}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

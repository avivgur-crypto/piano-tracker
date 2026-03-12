"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";

type AIReportItem = {
  id: number;
  session_id: number | null;
  student_id: number;
  teacher_report: string | null;
  student_report: string | null;
  created_at: string;
};

type PeriodSummary = {
  period: string;
  session_count: number;
  summary: string | null;
};

interface Props {
  studentId: string;
}

const PERIODS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function firstLine(text: string | null): string {
  if (!text) return "(empty report)";
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > 100 ? line.slice(0, 100) + "…" : line;
}

function parseSummary(text: string) {
  const sections: { title: string; body: string }[] = [];
  const patterns = [
    { title: "Progress", re: /(?:^|\n)\s*\d*\.?\s*\*?\*?PROGRESS\*?\*?:?\s*/i },
    { title: "Common Errors", re: /(?:^|\n)\s*\d*\.?\s*\*?\*?COMMON\s*ERRORS?\*?\*?:?\s*/i },
    { title: "Recommendations", re: /(?:^|\n)\s*\d*\.?\s*\*?\*?RECOMMENDATIONS?\*?\*?:?\s*/i },
  ];

  const indices: { title: string; start: number }[] = [];
  for (const p of patterns) {
    const m = p.re.exec(text);
    if (m) indices.push({ title: p.title, start: m.index + m[0].length });
  }
  indices.sort((a, b) => a.start - b.start);

  for (let i = 0; i < indices.length; i++) {
    const end = i + 1 < indices.length ? indices[i + 1].start : text.length;
    const raw = text.slice(indices[i].start, end).trim();
    const cleaned = raw.replace(/^\d+\.\s*\*?\*?[A-Z ]+\*?\*?:?\s*/i, "").trim();
    sections.push({ title: indices[i].title, body: cleaned || raw });
  }

  if (sections.length === 0) {
    sections.push({ title: "Summary", body: text });
  }

  return sections;
}

function ReportRow({ report }: { report: AIReportItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div className="min-w-0 flex-1">
          <span className="text-xs text-zinc-400">
            {formatDate(report.created_at)}
          </span>
          <p className="mt-0.5 truncate text-sm text-zinc-300">
            {firstLine(report.teacher_report)}
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
      </button>
      {open && report.teacher_report && (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="whitespace-pre-wrap text-sm text-[#E5E7EB]">
            {report.teacher_report}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeacherAIReport({ studentId }: Props) {
  const [reports, setReports] = useState<AIReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<string>("week");
  const [periodData, setPeriodData] = useState<PeriodSummary | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);

  const [pastOpen, setPastOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${API_URL}/ai/reports/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to load reports (${res.status})`);
      setReports(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const fetchPeriod = useCallback(async (period: string) => {
    setSelectedPeriod(period);
    setPeriodLoading(true);
    setPeriodError(null);
    setPeriodData(null);
    const token = getToken();
    if (!token) { setPeriodLoading(false); return; }
    try {
      const res = await fetch(
        `${API_URL}/ai/reports/student/${studentId}/period?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.detail === "string" ? d.detail : `Failed (${res.status})`);
      }
      setPeriodData(await res.json());
    } catch (err) {
      setPeriodError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setPeriodLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchPeriod("week"); }, [fetchPeriod]);

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) { setError("No authentication token found."); return; }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/ai/analyze-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ student_id: Number(studentId), session_id: null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.detail === "string" ? d.detail : `Generation failed (${res.status})`);
      }
      await fetchReports();
      await fetchPeriod(selectedPeriod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const summSections = periodData?.summary ? parseSummary(periodData.summary) : [];

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      {/* Header + Generate button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">📋 AI Report</h2>
        <button
          type="button"
          disabled={generating || loading}
          onClick={handleGenerate}
          className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate AI Report"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* ── Period Summary ── */}
      <div className="mt-5">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => fetchPeriod(p.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedPeriod === p.key
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {periodLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg
                className="h-4 w-4 animate-spin text-purple-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  fill="currentColor"
                  className="opacity-75"
                />
              </svg>
              Synthesizing summary…
            </div>
          ) : periodError ? (
            <div className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
              {periodError}
            </div>
          ) : periodData && periodData.session_count === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-[#111827] p-5 text-center text-sm text-zinc-400">
              No reports for this period yet.
            </div>
          ) : periodData?.summary ? (
            <div>
              <p className="mb-3 text-xs text-zinc-400">
                Based on {periodData.session_count} session
                {periodData.session_count !== 1 ? "s" : ""}
              </p>
              <div className="space-y-3">
                {summSections.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-[#111827] p-4"
                  >
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-purple-400">
                      {s.title}
                    </h4>
                    <div className="whitespace-pre-wrap text-sm text-[#E5E7EB]">
                      {s.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Past Individual Reports ── */}
      <div className="mt-6 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => setPastOpen(!pastOpen)}
          className="flex w-full items-center gap-2 text-left"
        >
          <h3 className="text-sm font-semibold text-zinc-300">
            Individual Session Reports ({reports.length})
          </h3>
          {pastOpen ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {pastOpen && (
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-sm text-zinc-400">Loading…</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No individual reports yet. Generate a report after the student practices.
              </p>
            ) : (
              reports.map((r) => <ReportRow key={r.id} report={r} />)
            )}
          </div>
        )}
      </div>
    </section>
  );
}

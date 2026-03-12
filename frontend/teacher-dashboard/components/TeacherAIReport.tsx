"use client";

import { useCallback, useEffect, useState } from "react";
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

interface Props {
  studentId: string;
}

export function TeacherAIReport({ studentId }: Props) {
  const [report, setReport] = useState<AIReportItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/ai/reports/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to load reports (${res.status})`);
      const data: AIReportItem[] = await res.json();
      setReport(data.length > 0 ? data[0] : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI report");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) {
      setError("No authentication token found.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/ai/analyze-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: Number(studentId),
          session_id: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail =
          typeof data?.detail === "string" ? data.detail : `Generation failed (${res.status})`;
        throw new Error(detail);
      }
      await fetchReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
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

      {loading ? (
        <div className="mt-4 text-sm text-[#B0B7D6]">Loading report…</div>
      ) : error ? (
        <div className="mt-4 rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : !report || !report.teacher_report ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-[#111827] p-6 text-center text-sm text-[#B0B7D6]">
          No analysis yet. Generate a report after the student practices.
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs text-[#B0B7D6]">
            Last updated: {new Date(report.created_at).toLocaleString()}
          </p>
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-[#111827] p-4 text-sm text-[#E5E7EB]">
            {report.teacher_report}
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `http://localhost:8000/ai/reports/student/${studentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(`Failed to load reports (${res.status})`);
        const data: AIReportItem[] = await res.json();
        if (data.length > 0) setReport(data[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load AI report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [studentId]);

  if (loading) {
    return (
      <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">📋 AI Report (Teacher)</h2>
        <div className="mt-4 text-sm text-[#B0B7D6]">Loading report…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">📋 AI Report (Teacher)</h2>
        <div className="mt-4 rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      </section>
    );
  }

  if (!report || !report.teacher_report) {
    return (
      <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">📋 AI Report (Teacher)</h2>
        <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-[#111827] p-6 text-center text-sm text-[#B0B7D6]">
          No AI report yet. Run &quot;Analyze session&quot; after the student practices to generate a report.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[#1A1D27] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">📋 AI Report (Teacher)</h2>
      <p className="mt-1 text-xs text-[#B0B7D6]">
        Last updated: {new Date(report.created_at).toLocaleString()}
      </p>
      <div className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-[#111827] p-4 text-sm text-[#E5E7EB]">
        {report.teacher_report}
      </div>
    </section>
  );
}

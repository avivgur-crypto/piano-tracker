"use client";

import { useEffect, useState } from "react";
import { getStudentId, getStudentToken } from "../lib/auth";

type AIReport = {
  id: number;
  session_id: number | null;
  student_id: number;
  student_report: string | null;
  created_at: string;
};

function parseReport(text: string) {
  const sections = {
    wrongNotes: "",
    rhythm: "",
    dynamics: "",
    general: "",
  };

  const lines = text.split("\n");
  let current: keyof typeof sections = "general";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("wrong note") || lower.includes("note accuracy") || lower.includes("played") && lower.includes("expected")) {
      current = "wrongNotes";
    } else if (lower.includes("rhythm") || lower.includes("timing") || lower.includes("rushed") || lower.includes("tempo")) {
      current = "rhythm";
    } else if (lower.includes("dynamic") || lower.includes("volume") || lower.includes("expression") || lower.includes("forte") || lower.includes("piano")) {
      current = "dynamics";
    }
    sections[current] += line + "\n";
  }

  return sections;
}

export function AIInsights() {
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      const studentId = getStudentId();
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:8000/ai/reports/student/${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${getStudentToken()}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to load AI insights (${res.status})`);
        }

        const data: AIReport[] = await res.json();
        if (data.length > 0) {
          setReport(data[0]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load AI insights";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const sections = report?.student_report
    ? parseReport(report.student_report)
    : null;

  return (
    <section className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">🤖 AI Practice Insights</h2>
      <p className="mt-1 text-sm text-[#B0B7D6]">
        Feedback from your latest practice session
      </p>

      {loading ? (
        <div className="mt-4 text-sm text-[#B0B7D6]">Loading insights...</div>
      ) : error ? (
        <div className="mt-4 rounded-xl bg-[#661010] px-4 py-3 text-sm text-[#FECACA]">
          {error}
        </div>
      ) : !report || !sections ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#58CC02]/30 bg-[#1E2235] p-6 text-center">
          <div className="text-2xl">🎹</div>
          <div className="mt-2 text-sm text-[#B0B7D6]">
            No AI insights yet — keep practicing and your teacher will upload your sheet music!
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border-l-4 border-[#FF4B4B] bg-[#1E2235] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>🎵</span> Note Accuracy
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-[#B0B7D6]">
              {sections.wrongNotes.trim() || "No specific note issues detected — great job!"}
            </div>
          </div>

          <div className="rounded-xl border-l-4 border-[#FFD900] bg-[#1E2235] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>⏱</span> Rhythm & Timing
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-[#B0B7D6]">
              {sections.rhythm.trim() || "Your rhythm is looking solid — keep it up!"}
            </div>
          </div>

          <div className="rounded-xl border-l-4 border-[#58CC02] bg-[#1E2235] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>🎚</span> Dynamics & Expression
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-[#B0B7D6]">
              {sections.dynamics.trim() || "Nice expression! Keep exploring dynamics in your playing."}
            </div>
          </div>

          {sections.general.trim() && (
            <div className="rounded-xl border-l-4 border-purple-500 bg-[#1E2235] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span>💡</span> Overall
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-[#B0B7D6]">
                {sections.general.trim()}
              </div>
            </div>
          )}

          <div className="text-right text-xs text-[#B0B7D6]">
            Last updated: {new Date(report.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </section>
  );
}

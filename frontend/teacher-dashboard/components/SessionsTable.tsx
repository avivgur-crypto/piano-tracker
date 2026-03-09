"use client";

import Link from "next/link";
import type { Session } from "@/types/session";

type Props = {
  sessions: Session[];
};

export default function SessionsTable({ sessions }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-sm">
      <table className="min-w-full divide-y divide-zinc-800 text-sm">
        <thead className="bg-zinc-900/80">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-300">Date</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-300">Duration</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-300">Notes</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-300">Device</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-300">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {sessions.map((session) => {
            const date = new Date(session.started_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            });
            const minutes = Math.round(session.duration_seconds / 60);
            return (
              <tr key={session.id} className="hover:bg-zinc-900/80">
                <td className="px-4 py-3 text-zinc-100">{date}</td>
                <td className="px-4 py-3 text-zinc-200">{minutes} min</td>
                <td className="px-4 py-3 text-zinc-200">{session.total_notes}</td>
                <td className="px-4 py-3 text-zinc-200">{session.device_id}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/sessions/${session.id}`}
                    className="inline-flex rounded-full bg-indigo-500 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-400"
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

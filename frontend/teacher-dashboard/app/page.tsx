"use client";

import { ActivityFeed } from "../components/ActivityFeed";
import { Leaderboard } from "../components/Leaderboard";
import { TriageList } from "../components/TriageList";
import { logout } from "../lib/auth";

export default function Home() {
  return (
    <main className="min-h-full px-8 pt-24">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white">Control Tower</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Good morning, Aviv 👋</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-full border border-[var(--accent)] bg-[rgba(108,63,255,0.15)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(108,63,255,0.25)]"
          >
            Sign Out
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <TriageList />
          <Leaderboard />
          <ActivityFeed />
        </div>
      </div>
    </main>
  );
}

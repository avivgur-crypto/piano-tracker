import { ActivityFeed } from "../components/ActivityFeed";
import { Leaderboard } from "../components/Leaderboard";
import { TriageList } from "../components/TriageList";

export default function Home() {
  return (
    <main className="min-h-full px-8 pt-24">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-white">Control Tower</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Good morning, Aviv 👋</p>
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

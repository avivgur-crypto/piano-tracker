import { fetchSessions } from "@/lib/api";
import SessionsTable from "@/components/SessionsTable";

export default async function SessionsPage() {
  const sessions = await fetchSessions();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 pb-16 pt-12 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Practice Sessions</h1>
            <p className="mt-2 text-sm text-zinc-400">
              All recorded sessions from connected devices.
            </p>
          </div>
        </header>
        <SessionsTable sessions={sessions} />
      </div>
    </main>
  );
}

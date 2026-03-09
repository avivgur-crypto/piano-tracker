import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 pb-16 pt-12 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold">Teacher Dashboard</h1>
          <p className="mt-2 text-base text-zinc-400">
            View practice sessions captured by the Raspberry Pi tracker.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Link
            href="/sessions"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <h2 className="text-xl font-semibold text-white">
              Sessions <span className="text-zinc-400">→</span>
            </h2>
            <p className="mt-2 text-sm text-zinc-200">
              Browse recorded practice sessions, including note events and duration.
            </p>
          </Link>

          <Link
            href="/sessions"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <h2 className="text-xl font-semibold text-white">
              Reports <span className="text-zinc-400">→</span>
            </h2>
            <p className="mt-2 text-sm text-zinc-200">
              Coming soon: analytics and progress reports for students.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}

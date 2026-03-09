"use client";

export function AITeachingAssistant() {
  return (
    <section
      className="rounded-xl p-6"
      style={{
        border: "2px solid transparent",
        backgroundImage: "linear-gradient(135deg, #0F1117, #0F1117), linear-gradient(135deg, #6C63FF, #A855F7)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        boxShadow: "0 0 30px rgba(108, 99, 255, 0.15)",
      }}
    >
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <div className="text-lg font-semibold text-white">AI Teaching Assistant</div>
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <span className="rounded-full bg-[rgba(108,99,255,0.15)] px-2 py-0.5">Powered by Claude</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border-l-4 border-[#3B82F6] bg-[rgba(255,255,255,0.04)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#3B82F6]">WHAT</div>
          <div className="mt-2 text-sm font-semibold text-white">
            Tempo dropped 25% at measures 12–15
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-[#F59E0B] bg-[rgba(255,255,255,0.04)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">WHY</div>
          <div className="mt-2 text-sm font-semibold text-white">
            Severe velocity instability in left hand (avg 45 vs required 72)
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-[#10B981] bg-[rgba(255,255,255,0.04)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#10B981]">ACTION</div>
          <div className="mt-2 text-sm font-semibold text-white">
            Focus on left-hand isolation exercises in the next lesson
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)] shadow-sm transition hover:brightness-110 sm:w-auto">
          📚 Assign Hanon Exercise #1
        </button>
        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(255,255,255,0.08)] sm:w-auto">
          💬 Send Summary to Parent
        </button>
      </div>
    </section>
  );
}

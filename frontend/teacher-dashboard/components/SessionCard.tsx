import type { Session } from "@/types/session";

type Props = {
  session: Session;
};

export default function SessionCard({ session }: Props) {
  const started = new Date(session.started_at);
  const ended = new Date(session.ended_at);
  const durationMinutes = Math.round(session.duration_seconds / 60);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">Session {session.id}</h2>
          <p className="text-sm text-zinc-400">
            {started.toLocaleString()} → {ended.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-800/70 px-3 py-1 text-xs font-medium text-zinc-200">
            {durationMinutes} min
          </span>
          <span className="rounded-full bg-zinc-800/70 px-3 py-1 text-xs font-medium text-zinc-200">
            {session.total_notes} notes
          </span>
          <span className="rounded-full bg-zinc-800/70 px-3 py-1 text-xs font-medium text-zinc-200">
            {session.device_id}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-zinc-200">Events</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {session.events.map((event, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>+{(event.time ?? event.time_offset_ms ?? 0)} ms</span>
                <span className="capitalize">{event.type}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                {event.type === "sustain" ? (
                  <span className="text-xs text-zinc-300">
                    pedal {event.value !== undefined && event.value > 0 ? "down" : "up"}
                  </span>
                ) : (
                  <>
                    <span className="font-medium text-zinc-100">{event.note}</span>
                    <span className="text-xs text-zinc-300">vel {event.velocity}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

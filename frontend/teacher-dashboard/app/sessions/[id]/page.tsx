import { fetchSession } from "@/lib/api";
import SessionCard from "@/components/SessionCard";

type Props = {
  params: { id: string };
};

export default async function SessionDetailPage({ params }: Props) {
  const session = await fetchSession(params.id);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 pb-16 pt-12 text-white">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold">Session details</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Review notes and events captured during this practice.
          </p>
        </header>
        <SessionCard session={session} />
      </div>
    </main>
  );
}

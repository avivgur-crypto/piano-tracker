import type { Session } from "@/types/session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchSessions() {
  const res = await fetch(`${API_URL}/sessions`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sessions: ${res.status}`);
  }
  return (await res.json()) as Session[];
}

export async function fetchSession(id: string) {
  const res = await fetch(`${API_URL}/sessions/${id}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch session ${id}: ${res.status}`);
  }
  return (await res.json()) as Session;
}

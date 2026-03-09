"use client";

import { Music, User } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-[#2D3748] bg-[var(--bg-card)]">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Music className="h-6 w-6 text-[var(--accent)]" />
          <span className="text-white text-lg font-bold">Piano Tracker</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Studio Dashboard
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--bg-primary)]">
            AT
          </div>
        </div>
      </div>
    </header>
  );
}

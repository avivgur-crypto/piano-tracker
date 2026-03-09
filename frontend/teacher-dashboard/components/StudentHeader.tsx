"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function StudentHeader({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="rounded-xl bg-[var(--bg-card)] p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-xl font-bold text-[var(--bg-primary)]">
          {initials}
        </div>
        <div>
          <div className="text-2xl font-semibold text-white">{name}</div>
          <div className="text-sm text-[var(--text-muted)]">Student progress overview</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-[rgba(255,255,255,0.04)] px-4 py-4">
          <div className="text-xl font-semibold text-white">12</div>
          <div className="text-xs text-[var(--text-muted)]">Sessions this month</div>
        </div>
        <div className="rounded-xl bg-[rgba(255,255,255,0.04)] px-4 py-4">
          <div className="text-xl font-semibold text-white">340</div>
          <div className="text-xs text-[var(--text-muted)]">Minutes practiced</div>
        </div>
        <div className="rounded-xl bg-[rgba(255,255,255,0.04)] px-4 py-4">
          <div className="text-xl font-semibold text-white">3</div>
          <div className="text-xs text-[var(--text-muted)]">Day streak</div>
        </div>
      </div>
    </section>
  );
}

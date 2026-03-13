"use client";

import { useRouter } from "next/navigation";
import { clearStudentAuth } from "../lib/auth";

export function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    clearStudentAuth();
    router.replace("/login");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b-2 border-[#58CC02] border-l-4 border-l-[#58CC02] bg-[#1C1F2E]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3 text-lg font-bold">
          <span>🎹</span>
          <span>Piano Tracker</span>
          <span className="rounded-full bg-[#0F2612] px-3 py-1 text-xs font-semibold text-[#58CC02]">
            Student Zone 🎮
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#58CC02] bg-opacity-20 px-3 py-1 text-sm font-semibold text-[#58CC02]">
            ⚡ 1,240 XP
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#252A3D] text-sm font-semibold">
            DD
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-[#B0B7D6] transition hover:bg-white/10 hover:text-white"
            title="Log out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

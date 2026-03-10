import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "./AuthGuard";

export const metadata: Metadata = {
  title: "Piano Tracker — Student Zone",
  description: "Piano Tracker student view",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1C1F2E] font-sans text-white">
        <AuthGuard>
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
              </div>
            </div>
          </header>

          <main className="pt-24">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}

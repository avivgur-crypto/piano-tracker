import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Dashboard",
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
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#1C1F2E]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3 text-lg font-bold">
              <span>🎹</span>
              <span>Piano Tracker</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#FFD900] px-3 py-1 text-sm font-semibold text-[#1C1F2E]">
                ⚡ 1,240 XP
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#252A3D] text-sm font-semibold">
                DD
              </div>
            </div>
          </div>
        </header>

        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}

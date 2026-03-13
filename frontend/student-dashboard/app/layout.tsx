import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "./AuthGuard";
import { Navbar } from "../components/Navbar";

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
          <Navbar />
          <main className="pt-24">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}

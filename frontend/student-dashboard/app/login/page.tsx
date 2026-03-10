"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { saveStudentAuth } from "../../lib/auth";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Invalid email or password");
      }

      const data = await res.json();
      saveStudentAuth(data.access_token);
      router.push("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1C1F2E] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#252A3D] p-10 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-white">🎹 Piano Tracker</div>
          <div className="mt-2 text-sm text-[#B0B7D6]">Student Login</div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#B0B7D6]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-[#1C1F2E] px-4 py-3 text-sm text-white focus:border-[#58CC02] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#B0B7D6]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-[#1C1F2E] px-4 py-3 text-sm text-white focus:border-[#58CC02] focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-md bg-[#661010] px-4 py-2 text-sm text-[#FECACA]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#58CC02] px-4 py-3 text-sm font-semibold text-[#1C1F2E] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#B0B7D6]">
          Don&apos;t have an account? Contact your teacher
        </p>
      </div>
    </main>
  );
}

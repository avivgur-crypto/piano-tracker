"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_URL } from "../../lib/api";
import { saveAuth } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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

      console.log("[login] submitting", { email, password });

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        body: formData,
      });

      console.log("[login] response", res.status);

      if (!res.ok) {
        throw new Error("Invalid email or password");
      }

      const data = await res.json();
      console.log("[login] success", data);

      saveAuth(data.access_token, data.user, rememberMe);

      const expires = rememberMe
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()
        : "";
      document.cookie = `piano_tracker_token=${data.access_token}; path=/; expires=${expires}`;

      const params = new URLSearchParams(window.location.search);
      const from = params.get("from") || "/";

      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = from;
    } catch (err) {
      console.log("[login] error", err);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] p-10 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-white">🎹 Piano Tracker</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">Welcome back</div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#6C63FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#6C63FF] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-[#0F1117] text-purple-500 focus:ring-purple-500"
            />
            <label htmlFor="remember" className="text-sm text-[var(--text-muted)]">
              Remember me
            </label>
          </div>

          {error ? (
            <div className="rounded-md bg-[#661010] px-4 py-2 text-sm text-[#FECACA]">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={(e) => onSubmit(e)}
            className="w-full rounded-xl bg-[#6C63FF] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[#574cff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Don&apos;t have an account? Contact your teacher
        </p>
      </div>
    </main>
  );
}

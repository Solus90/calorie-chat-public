"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace(`/select-profile?from=${encodeURIComponent(from)}`);
      router.refresh();
    } else {
      setError("That password didn't match. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full min-w-0 max-w-sm animate-rise">
        <div className="mb-8 text-center">
          <p className="label-mono mb-3">Conversational calorie tracker</p>
          <h1 className="font-display text-[clamp(2.75rem,14vw,3.75rem)] uppercase leading-[0.9] tracking-wide">
            Calorie
            <br />
            <span className="text-accent">Chat</span>
          </h1>
        </div>

        <form
          onSubmit={submit}
          className="rounded-xl border border-hairline bg-surface p-6 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]"
        >
          <label htmlFor="pw" className="label-mono mb-2 block">
            Passphrase
          </label>
          <input
            id="pw"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-hairline bg-paper px-4 py-3 text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/25"
            placeholder="••••••••"
          />
          {error && <p className="mt-3 text-sm text-rust">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-5 w-full rounded-md bg-accent px-4 py-3 font-semibold text-white transition enabled:hover:bg-accent-soft disabled:opacity-50"
          >
            {loading ? "Unlocking…" : "Unlock"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-ink-muted">
          A private workspace for one. Talk to log what you eat.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

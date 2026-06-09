"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { applyProfileTheme, getThemeForProfile, isProfileThemeId } from "@/lib/themes";

type Profile = { id: string; name: string; ord: number };
type ProfileData = { profiles: Profile[]; active: string | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ProfileThemeSwatch({ profileId }: { profileId: string }) {
  if (!isProfileThemeId(profileId)) return null;
  const theme = getThemeForProfile(profileId);
  const swatches = [
    theme.tokens.clay,
    theme.tokens.paperDeep,
    theme.tokens.olive,
    theme.tokens.accent,
  ];
  return (
    <span className="mt-3 flex gap-1.5" aria-hidden="true">
      {swatches.map((color) => (
        <span
          key={color}
          className="h-2 w-8 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

function SelectProfileForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const { data, isLoading } = useSWR<ProfileData>("/api/profile", fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const profiles = data?.profiles ?? [];

  async function selectProfile(id: string) {
    setLoadingId(id);
    setError("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      applyProfileTheme(id);
      router.replace(from);
      router.refresh();
    } else {
      setError("Couldn't set profile. Try again.");
      setLoadingId(null);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full min-w-0 max-w-md animate-rise">
        <div className="mb-6 text-center sm:mb-8">
          <p className="label-mono mb-3">Before you start</p>
          <h1 className="font-display text-[clamp(1.75rem,8vw,3rem)] uppercase leading-tight tracking-wide">
            Who&apos;s logging today?
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-ink-muted">
            Food you log goes to the selected person&apos;s tracker. Each profile
            has its own look — pick the right one.
          </p>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)] sm:p-6">
          {isLoading ? (
            <p className="text-center text-sm text-ink-muted">Loading…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {profiles.map((p, i) => {
                const theme = getThemeForProfile(
                  isProfileThemeId(p.id) ? p.id : null,
                );
                const t = theme.tokens;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={loadingId !== null}
                    onClick={() => selectProfile(p.id)}
                    className="animate-rise w-full min-h-13 rounded-md border-2 px-4 py-4 text-left transition enabled:hover:brightness-105 enabled:active:scale-[0.99] disabled:opacity-50"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      backgroundColor: t.paperDeep,
                      borderColor: t.clay,
                      color: t.ink,
                    }}
                  >
                    <span className="font-display text-xl uppercase tracking-wide sm:text-2xl">
                      {p.name}
                    </span>
                    {loadingId === p.id && (
                      <span
                        className="ml-2 text-sm"
                        style={{ color: t.inkMuted }}
                      >
                        Starting…
                      </span>
                    )}
                    <ProfileThemeSwatch profileId={p.id} />
                  </button>
                );
              })}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-rust">{error}</p>}
        </div>
      </div>
    </main>
  );
}

export default function SelectProfilePage() {
  return (
    <Suspense fallback={null}>
      <SelectProfileForm />
    </Suspense>
  );
}

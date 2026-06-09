"use client";

import { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import { applyProfileTheme } from "@/lib/themes";
import { ConfirmModal } from "./ConfirmModal";

type Profile = { id: string; name: string; ord: number };
type ProfileData = { profiles: Profile[]; active: string | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ProfileSwitcher() {
  const { data } = useSWR<ProfileData>("/api/profile", fetcher);
  const router = useRouter();
  const [pending, setPending] = useState<Profile | null>(null);
  const switchGen = useRef(0);

  const profiles = data?.profiles ?? [];
  const active = data?.active;
  if (profiles.length < 2) return null;

  async function switchTo(id: string) {
    if (id === active) return;
    const gen = ++switchGen.current;

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok || gen !== switchGen.current) return;

    applyProfileTheme(id);

    await mutate(
      "/api/profile",
      data ? { ...data, active: id } : { profiles, active: id },
      { revalidate: true },
    );
    mutate((key) => typeof key === "string" && key.startsWith("/api/today"));
    mutate("/api/progress");
    mutate("/api/settings");
    router.refresh();
  }

  function requestSwitch(profile: Profile) {
    if (profile.id === active) return;
    setPending(profile);
  }

  function confirmSwitch() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    void switchTo(id);
  }

  return (
    <>
      <div
        className="flex w-full min-w-0 items-center rounded-md border border-hairline bg-surface p-0.5 sm:inline-flex sm:w-auto"
        role="group"
        aria-label="Active profile"
      >
        {profiles.map((p) => {
          const isActive = p.id === active;
          return (
            <button
              key={p.id}
              onClick={() => requestSwitch(p)}
              aria-pressed={isActive}
              className={`min-h-11 flex-1 truncate rounded px-3 py-1.5 text-sm transition sm:min-h-0 sm:flex-none sm:py-1 ${
                isActive
                  ? "bg-clay font-medium text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <ConfirmModal
        open={pending !== null}
        title={`Switch to ${pending?.name}?`}
        body={`Food you log will be added to ${pending?.name}'s tracker.`}
        confirmLabel="Switch"
        onConfirm={confirmSwitch}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

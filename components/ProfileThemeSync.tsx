"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { applyProfileTheme } from "@/lib/themes";

type ProfileData = { profiles: unknown[]; active: string | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Keeps document data-theme in sync with the active profile cookie. */
export function ProfileThemeSync() {
  const { data } = useSWR<ProfileData>("/api/profile", fetcher, {
    revalidateOnFocus: true,
  });

  useEffect(() => {
    if (data === undefined) return;
    applyProfileTheme(data.active);
  }, [data?.active]);

  return null;
}

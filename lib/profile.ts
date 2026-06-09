import { cookies } from "next/headers";
import { getSupabase } from "./supabase";

/**
 * Multi-user support. Everyone shares one app password (the gate in proxy.ts);
 * the *active profile* is selected with the `cc_profile` cookie and scopes all
 * data. This is not a privacy boundary — either profile can switch to the other
 * — it just keeps each person's tracking separate.
 */
export const PROFILE_COOKIE = "cc_profile";
export const DEFAULT_PROFILE_ID = "alex";

export type Profile = { id: string; name: string; ord: number };

export async function getProfiles(): Promise<Profile[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("profiles")
    .select("id, name, ord")
    .order("ord", { ascending: true });
  return (data ?? []) as Profile[];
}

/** The active profile id from the cookie (falls back to the default). */
export async function getActiveProfileId(): Promise<string> {
  const store = await cookies();
  return store.get(PROFILE_COOKIE)?.value || DEFAULT_PROFILE_ID;
}

/** Profile id only when the cookie is set (for theming pre-default pages). */
export async function getActiveProfileIdOrNull(): Promise<string | null> {
  const store = await cookies();
  return store.get(PROFILE_COOKIE)?.value ?? null;
}

export async function isValidProfile(id: string): Promise<boolean> {
  const profiles = await getProfiles();
  return profiles.some((p) => p.id === id);
}

export async function updateProfileName(
  id: string,
  name: string,
): Promise<void> {
  const sb = getSupabase();
  const clean = name.trim();
  if (!clean) return;
  const { error } = await sb.from("profiles").update({ name: clean }).eq("id", id);
  if (error) throw new Error(error.message);
}

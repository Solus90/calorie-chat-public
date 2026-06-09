import { NextResponse } from "next/server";
import {
  PROFILE_COOKIE,
  getActiveProfileIdOrNull,
  getProfiles,
  isValidProfile,
} from "@/lib/profile";

export const dynamic = "force-dynamic";

// List profiles + which one is active.
export async function GET() {
  const [profiles, active] = await Promise.all([
    getProfiles(),
    getActiveProfileIdOrNull(),
  ]);
  return NextResponse.json({ profiles, active });
}

// Switch the active profile (sets the cc_profile cookie).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id || !(await isValidProfile(id))) {
    return NextResponse.json({ error: "Unknown profile" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, active: id });
  res.cookies.set(PROFILE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

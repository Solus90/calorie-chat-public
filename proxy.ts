import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { PROFILE_COOKIE } from "@/lib/profile";

/**
 * Gate every page and API route behind the password session, except the login
 * page and the auth endpoint themselves (and Next internals / static assets,
 * which the matcher already excludes).
 *
 * Authenticated users without a profile cookie are sent to /select-profile.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`.
 */
const PUBLIC_PATHS = ["/login", "/api/auth"];

/** Allowed while authenticated but before cc_profile is set. */
const PROFILE_PICKER_PATHS = ["/select-profile", "/api/profile"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) {
    // API routes get a 401; pages redirect to the login screen.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const profileId = req.cookies.get(PROFILE_COOKIE)?.value;

  if (profileId) {
    if (pathname === "/select-profile") {
      const url = req.nextUrl.clone();
      const from = url.searchParams.get("from") || "/";
      url.pathname = from;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (
    PROFILE_PICKER_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    )
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Profile required" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/select-profile";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { applyProfileTheme } from "@/lib/themes";
import { ProfileSwitcher } from "./ProfileSwitcher";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export function Masthead() {
  const pathname = usePathname();
  const router = useRouter();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    applyProfileTheme(null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-hairline">
      <div className="h-1 bg-accent" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
            <Link
              href="/"
              className="font-display shrink-0 text-2xl uppercase tracking-wide"
            >
              Calorie<span className="text-accent">Chat</span>
            </Link>
            <span className="label-mono hidden sm:inline">{today}</span>
            <button
              onClick={logout}
              className="rounded-md px-3 py-1.5 text-sm text-ink-muted transition hover:text-rust sm:hidden"
              aria-label="Log out"
            >
              Lock
            </button>
          </div>

          <nav className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-1">
            <div className="w-full min-w-0 sm:mr-2 sm:w-auto">
              <ProfileSwitcher />
            </div>
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
                    active
                      ? "bg-clay text-white"
                      : "text-ink-muted hover:bg-paper-deep hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="ml-1 hidden rounded-md px-3 py-1.5 text-sm text-ink-muted transition hover:text-rust sm:inline"
              aria-label="Log out"
            >
              Lock
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

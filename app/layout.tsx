import type { Metadata, Viewport } from "next";
import { Oswald, Ubuntu, Ubuntu_Mono } from "next/font/google";
import { getActiveProfileIdOrNull } from "@/lib/profile";
import { getThemeForProfile, resolveDataTheme, themeStyleProperties } from "@/lib/themes";
import { ProfileThemeSync } from "@/components/ProfileThemeSync";
import "./globals.css";

// Display — condensed, confident headings + big numerals
const oswald = Oswald({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

// Body — humanist, friendly, readable
const ubuntu = Ubuntu({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});

// Mono — utility labels, stats, chart ticks
const ubuntuMono = Ubuntu_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-ubuntu-mono",
});

export const metadata: Metadata = {
  title: "Calorie Chat — talk to log your day",
  description:
    "Log meals by talking. Track calories, weight, and your goal — no database hunting.",
  applicationName: "Calorie Chat",
  appleWebApp: {
    capable: true,
    title: "Calorie Chat",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#edeade",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profileId = await getActiveProfileIdOrNull();
  const theme = getThemeForProfile(profileId);
  const dataTheme = resolveDataTheme(profileId);
  const themeStyle = themeStyleProperties(profileId);

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      style={themeStyle as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        {/* Bind next/font CSS variables to the names used in globals.css */}
        <style>{`
          :root {
            --font-display: ${oswald.style.fontFamily};
            --font-body: ${ubuntu.style.fontFamily};
            --font-mono: ${ubuntuMono.style.fontFamily};
          }
        `}</style>
        <meta name="theme-color" content={theme.themeColor} />
      </head>
      <body
        className={`${oswald.variable} ${ubuntu.variable} ${ubuntuMono.variable}`}
      >
        <ProfileThemeSync />
        {children}
      </body>
    </html>
  );
}

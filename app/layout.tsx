import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import "./globals.css";

// Fonts are loaded as system-font stacks (see globals.css --font-* vars) so
// the build never depends on reaching Google Fonts. To use the originally
// designed typefaces (Sora for display, Inter for body, IBM Plex Mono for
// data labels) once you have normal internet access, swap these vars for
// next/font/google — see README "Restoring the custom typefaces".

export const metadata: Metadata = {
  title: "AI Office HQ",
  description: "A living virtual office where AI agents collaborate on your task.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        {/* reducedMotion="user" makes every Framer Motion animation in the
            app (the walking robots, pulsing status dots, connector-line
            token, panel transitions…) respect the OS/browser
            prefers-reduced-motion setting automatically — instant end-state
            instead of the animated version. This is the actual mechanism;
            the CSS rule in globals.css only covers plain CSS
            animations/transitions, which none of the office floor uses. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}

// @ts-nocheck
import React, { useEffect, ReactNode } from "react";
import type { AppProps as NextAppProps } from "next/dist/shared/lib/router/app.js";
import Head from "next/head.js";
import { ThemeProvider } from "@/context/ThemeContext";
import { DebugProvider } from "@/context/DebugContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "../styles/globals.css";

// Extend the default AppProps with any custom page props
type AppProps = NextAppProps & {
  // Add custom page props here if needed
  children?: ReactNode;
};

// Define the theme change handler type
type ThemeChangeHandler = (e: MediaQueryListEvent) => void;

export default function App({ Component, pageProps }: AppProps) {
  // Debug theme changes
  useEffect(() => {
    const handleThemeChange: ThemeChangeHandler = (e) => {
      // System theme changes are handled by the theme provider
      // No need to log this in production
    };

    // Ensure we're in the browser
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", handleThemeChange);

      return () => {
        mediaQuery.removeEventListener("change", handleThemeChange);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <DebugProvider>
        <ThemeProvider>
          <Head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>MNews - Newsletter Reader</title>
          </Head>
          <Component {...pageProps} />
        </ThemeProvider>
      </DebugProvider>
    </ErrorBoundary>
  );
}

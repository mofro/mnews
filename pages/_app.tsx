import type { AppProps } from 'next/app'
import { ThemeProvider } from '../context/ThemeContext'
import { useEffect } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Debug theme changes
  useEffect(() => {
    const handleThemeChange = (e: MediaQueryListEvent) => {
      // System theme changes are handled by the theme provider
      // No need to log this in production
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        </Head>
        <div className="theme-wrapper min-h-screen bg-white dark:bg-gray-900">
          <Component {...pageProps} />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
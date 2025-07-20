import type { AppProps } from 'next/app'
import { ThemeProvider } from '../context/ThemeContext'
import { useEffect } from 'react'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Debug theme changes
  useEffect(() => {
    const handleThemeChange = (e: MediaQueryListEvent) => {
      console.log('System theme changed:', e.matches ? 'dark' : 'light')
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [])

  return (
    <ThemeProvider>
      <div className="theme-wrapper">
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  )
}
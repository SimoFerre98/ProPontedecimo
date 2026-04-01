import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('propontedecimo-theme') as Theme) || 'system'
  )

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (currentTheme: Theme) => {
      root.classList.remove('light', 'dark')

      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
        return
      }

      root.classList.add(currentTheme)
    }

    applyTheme(theme)

    // Listener per i cambiamenti di sistema se è selezionato "system"
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('propontedecimo-theme', newTheme)
    setThemeState(newTheme)
  }

  return { theme, setTheme }
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Season } from '@/services/seasonService'
import type { Database } from '@/types/database'

export type ThemeMode = 'light' | 'dark' | 'system'
export type UserRole = Database['public']['Enums']['user_role']

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

interface AppState {
  // Season Slice
  seasons: Season[]
  selectedSeasonId: string | null
  activeSeasonId: string | null
  setSeasons: (seasons: Season[]) => void
  setSelectedSeasonId: (id: string | null) => void

  // Theme Slice
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void

  // Auth Slice (Read-only mirror, written by AuthProvider)
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Season Slice
      seasons: [],
      selectedSeasonId: null,
      activeSeasonId: null,
      setSeasons: (seasons) => {
        const activeSeason = seasons.find(s => s.is_active)
        const activeSeasonId = activeSeason?.id || null
        
        set((state) => {
          // Fallback logic: if the currently selected season is no longer in the loaded seasons,
          // fallback to the active season.
          let newSelectedSeasonId = state.selectedSeasonId
          if (newSelectedSeasonId && !seasons.some(s => s.id === newSelectedSeasonId)) {
            newSelectedSeasonId = activeSeasonId
          }
          
          // If no season was selected at all, default to active season
          if (!newSelectedSeasonId) {
            newSelectedSeasonId = activeSeasonId
          }

          return { 
            seasons, 
            activeSeasonId,
            selectedSeasonId: newSelectedSeasonId
          }
        })
      },
      setSelectedSeasonId: (id) => set({ selectedSeasonId: id }),

      // Theme Slice
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        // Apply DOM changes immediately
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          root.classList.add(systemTheme)
        } else {
          root.classList.add(theme)
        }
      },

      // Auth Slice
      profile: null,
      setProfile: (profile) => set({ profile })
    }),
    {
      name: 'propontedecimo-store',
      partialize: (state) => ({
        // Only persist these specific fields
        selectedSeasonId: state.selectedSeasonId,
        theme: state.theme
      }),
      onRehydrateStorage: () => (state) => {
        // Re-apply theme class on hydration
        if (state) {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')

          if (state.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            root.classList.add(systemTheme)
          } else {
            root.classList.add(state.theme)
          }
        }
      }
    }
  )
)
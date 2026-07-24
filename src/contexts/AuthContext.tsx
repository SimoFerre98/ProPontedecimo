import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue, type Profile } from '@/contexts/auth-context'
import { useAppStore } from '@/store/useAppStore'

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingProfile, setFetchingProfile] = useState(false)
  const { setProfile: setStoreProfile } = useAppStore()
  const fetchedUserIdRef = useRef<string | null>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    setFetchingProfile(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    // Un evento più recente (logout o cambio utente) può essere arrivato mentre
    // questa fetch era in volo: se il ref non punta più a userId, la risposta
    // è superata e va scartata per non sovrascrivere lo stato corrente.
    if (fetchedUserIdRef.current === userId) {
      if (data) {
        const prof = data as Profile
        setProfileState(prof)
        setStoreProfile(prof)
      } else {
        setProfileState(null)
        setStoreProfile(null)
      }
    }
    setFetchingProfile(false)
  }, [setStoreProfile])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)

      if (session?.user) {
        const userId = session.user.id
        if (fetchedUserIdRef.current === userId) {
          // Nessuna nuova fetch da attendere: se però una fetch per questo
          // stesso utente è già in corso da un evento precedente, `loading`
          // resta true nel valore esposto grazie a `loading || fetchingProfile`.
          setLoading(false)
          return
        }
        fetchedUserIdRef.current = userId
        // Deferred: una fetch DB dentro il callback sincrono di onAuthStateChange
        // interferisce con il lock interno del client auth (guida Supabase).
        fetchTimeoutRef.current = setTimeout(() => {
          fetchProfile(userId).finally(() => setLoading(false))
        }, 0)
      } else {
        fetchedUserIdRef.current = null
        setProfileState(null)
        setStoreProfile(null)
        setLoading(false)
      }
    })
    return () => {
      subscription.unsubscribe()
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    }
  }, [fetchProfile, setStoreProfile])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading: loading || fetchingProfile,
    signOut: async () => { await supabase.auth.signOut() },
    refreshProfile: async () => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
    },
  }), [session, profile, loading, fetchingProfile, fetchProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

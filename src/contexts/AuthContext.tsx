import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const fetchProfile = useCallback(async (userId: string) => {
    setFetchingProfile(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    if (data) {
      const prof = data as Profile
      setProfileState(prof)
      setStoreProfile(prof)
    } else {
      setProfileState(null)
      setStoreProfile(null)
    }
    setFetchingProfile(false)
  }, [setStoreProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setProfileState(null)
        setStoreProfile(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfileState(null)
        setStoreProfile(null)
      }
    })
    return () => subscription.unsubscribe()
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

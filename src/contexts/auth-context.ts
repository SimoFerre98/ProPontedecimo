import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type UserRole = Database['public']['Enums']['user_role']

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

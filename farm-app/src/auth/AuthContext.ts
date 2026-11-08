import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { PlatformRole } from './roles'

export type FarmMembership = {
  id: string
  organizationId: string
  organizationName: string
  farmId: string | null
  farmName: string
  role: PlatformRole
}

export type AuthState = {
  session: Session | null
  loading: boolean
  demo: boolean
  displayName: string
  email: string
  memberships: FarmMembership[]
  activeMembership: FarmMembership | null
  roles: PlatformRole[]
  identityError: string | null
  canManageUsers: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  sendPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  refreshIdentity: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

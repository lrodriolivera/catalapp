'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  loadTokens,
  clearTokens,
  userFromTokens,
  signIn as cognitoSignIn,
  type AuthUser,
} from './auth'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  refresh: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(() => {
    const tokens = loadTokens()
    setUser(tokens ? userFromTokens(tokens) : null)
    setLoading(false)
  }, [])

  useEffect(() => { hydrate() }, [hydrate])

  const signIn = useCallback(async (email: string, password: string) => {
    await cognitoSignIn(email, password)
    hydrate()
  }, [hydrate])

  const signOut = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refresh: hydrate }),
    [user, loading, signIn, signOut, hydrate],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

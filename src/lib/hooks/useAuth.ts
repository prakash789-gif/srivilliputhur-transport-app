'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type AuthProfile = {
  id?: number
  phone: string
  name?: string | null
  createdAt?: number
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load token from localStorage
  useEffect(() => {
    const t = localStorage.getItem('bearer_token')
    setToken(t)
  }, [])

  // Fetch profile when token changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setProfile(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error('Failed to load profile')
        }
        const data = await res.json()
        setProfile(data)
      } catch (e) {
        setError((e as Error).message)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [token])

  const loginWithToken = useCallback((t: string) => {
    localStorage.setItem('bearer_token', t)
    setToken(t)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('bearer_token')
    setToken(null)
    setProfile(null)
  }, [])

  return useMemo(
    () => ({ token, profile, loading, error, loginWithToken, logout }),
    [token, profile, loading, error, loginWithToken, logout]
  )
}
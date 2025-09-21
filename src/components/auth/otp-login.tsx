'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export function OtpLogin() {
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const search = useSearchParams()
  const redirect = search.get('redirect') || '/'
  const { loginWithToken } = useAuth()

  const requestOtp = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to send OTP')
      setMessage('OTP sent. Please check your SMS.')
      setStep('verify')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Invalid code')
      if (data?.token) {
        loginWithToken(data.token)
        router.push(redirect)
      } else {
        throw new Error('Token not returned')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>Login with Phone</CardTitle>
          <CardDescription>Receive an OTP via SMS to sign in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" inputMode="tel" autoComplete="tel" placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button className="w-full" disabled={!phone.trim() || loading} onClick={requestOtp}>
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="code">OTP Code</Label>
                <Input id="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={() => setStep('phone')}>Back</Button>
                <Button className="flex-1" disabled={code.trim().length < 4 || loading} onClick={verifyOtp}>
                  {loading ? 'Verifying…' : 'Verify & Login'}
                </Button>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
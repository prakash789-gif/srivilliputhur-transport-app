import { OtpLogin } from '@/components/auth/otp-login'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center">
      <Suspense fallback={<div className="w-full text-center text-sm text-muted-foreground">Loading…</div>}>
        <OtpLogin />
      </Suspense>
    </div>
  )
}
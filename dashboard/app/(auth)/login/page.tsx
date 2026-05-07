'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 rounded-lg border p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">IPB LSA Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Masuk dengan akun Google yang terdaftar.
          </p>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => signIn('google', { callbackUrl: '/' })}
        >
          Lanjutkan dengan Google
        </Button>
      </div>
    </main>
  )
}
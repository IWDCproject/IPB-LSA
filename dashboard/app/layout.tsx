import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'
import NextTopLoader from 'nextjs-toploader'
import { NavigationEvents } from '@/components/layout/NavigationEvents'

const sans = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-sans',
  display:  'swap',
})

export const metadata: Metadata = {
  title:       'IPB Lucky Sports & Arts',
  description: 'by IWDC x Ditmawa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <NextTopLoader color="#18181b" showSpinner={false} />
        <NavigationEvents />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
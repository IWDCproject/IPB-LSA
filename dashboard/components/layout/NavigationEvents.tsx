'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import NProgress from 'nprogress'

export function NavigationEvents() {
  const pathname = usePathname()

  useEffect(() => {
    // Stop loader on every pathname change
    NProgress.done()
  }, [pathname])

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor && anchor.href && !anchor.target && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const url = new URL(anchor.href)
        const currentUrl = new URL(window.location.href)
        
        // Only start if it's internal navigation and different from current
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          NProgress.start()
        }
      }
    }

    window.addEventListener('click', handleAnchorClick)
    return () => window.removeEventListener('click', handleAnchorClick)
  }, [])

  return null
}
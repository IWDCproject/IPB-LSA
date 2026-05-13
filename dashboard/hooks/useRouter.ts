'use client'

import { useRouter as useNextRouter } from 'next/navigation'
import NProgress from 'nprogress'

export function useRouter() {
  const router = useNextRouter()
  return {
    ...router,
    push: (href: string) => {
      NProgress.start()
      router.push(href)
    },
  }
}
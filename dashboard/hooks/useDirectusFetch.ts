'use client'

import { useState, useEffect } from 'react'

export function useDirectusFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetcher()
      .then((result) => { if (!cancelled) setData(result) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    // Bersihkan kalau deps berubah sebelum fetch selesai
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
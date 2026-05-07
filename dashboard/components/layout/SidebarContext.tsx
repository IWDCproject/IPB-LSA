'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type SidebarContextValue = {
  currentEventName: string | null
  setCurrentEventName: (name: string | null) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  currentEventName: null,
  setCurrentEventName: () => {},
})

// ---------------------------------------------------------------------------
// Provider — add this to app/(dashboard)/layout.tsx wrapping {children}
// ---------------------------------------------------------------------------

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [currentEventName, setCurrentEventName] = useState<string | null>(null)

  return (
    <SidebarContext.Provider value={{ currentEventName, setCurrentEventName }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook — used by Sidebar to read, and by event layout to write
// ---------------------------------------------------------------------------

export const useSidebarContext = () => useContext(SidebarContext)
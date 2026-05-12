'use client'

import { useOptimistic, useState, useTransition } from 'react'
import Link        from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button }     from '@/components/ui/button'
import type { OperatorUser } from '../operators/_actions'

const TABS = [
  { label: 'Operators',     href: '/access-control/operators'      },
  { label: 'Activity Logs', href: '/access-control/activity-logs'  },
] as const

const BREADCRUMB_LABELS: Record<string, string> = {
  'operators':     'Operators',
  'activity-logs': 'Activity Logs',
}

export function AccessControlHeader() {
  const pathname      = usePathname()
  const router        = useRouter()
  const activeSegment = pathname.split('/').pop() ?? ''
  const activeLabel   = BREADCRUMB_LABELS[activeSegment]

  const [modalOpen,   setModalOpen]   = useState(false)
  const [modalMode,   setModalMode]   = useState<'create' | 'edit'>('create')
  const [editingUser, setEditingUser] = useState<OperatorUser | undefined>(undefined)

  function openCreate() { setModalMode('create'); setEditingUser(undefined); setModalOpen(true) }
  function openEdit(u: OperatorUser) { setModalMode('edit'); setEditingUser(u); setModalOpen(true) }

  const isOperators = activeSegment === 'operators'

  return (
    <div className="-mx-6 -mt-6">
      <div className="pb-4">
        <PageHeader
          breadcrumbs={[
            { label: 'Access Control' },
            ...(activeLabel ? [{ label: activeLabel }] : []),
          ]}
          title="Access Control Config"
        />
        <div className='text-sm italic text-zinc-400 ml-6 -mt-3'>only super admins can see this</div>
      </div>

      {/* Tab row — tabs left, New Account button right */}
      <div className="flex items-center justify-between px-6">
        <nav className="flex gap-6" aria-label="Access control sections">
          {TABS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={[
                  'py-2.5 text-sm font-[600] transition-colors',
                  active
                    ? 'underline underline-offset-4 decoration-2 text-foreground'
                    : 'text-zinc-400 hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </nav>

        {/* Only shown on the Operators tab */}
        {isOperators && (
          <Button variant="default" onClick={openCreate}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5"  y1="12" x2="19" y2="12"/>
            </svg>
            New Account
          </Button>
        )}
      </div>
    </div>
  )
}
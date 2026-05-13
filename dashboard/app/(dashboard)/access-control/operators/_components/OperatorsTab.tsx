'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/DataTable'
import { AccountModal } from './AccountModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toggleAccess, updateAccount } from '../_actions'
import type { OperatorUser } from '../_actions'

// -- Helpers -------------------------------------------------------------------

function getRoleKey(user: OperatorUser): 'super_admin' | 'operator' {
  const name =
    typeof user.role === 'object' && user.role !== null
      ? user.role.name
      : (user.role as string | null) ?? ''
  return name === 'Administrator' || name === 'SuperAdmin' ? 'super_admin' : 'operator'
}

function isActive(u: OperatorUser) {
  return u.status === 'active'
}

// -- Avatar — same logic as UserMenu, different src ---------------------------

function UserAvatar({ user }: { user: OperatorUser }) {
  const name = user.organisation_name ?? user.email
  const initials = name.slice(0, 2).toUpperCase()
  const avatarUrl = user.avatar
    ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${user.avatar}`
    : null

  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={name}
      className="size-6 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 select-none">
      {initials}
    </span>
  )
}

// -- Toggle --------------------------------------------------------------------

function AccessToggle({
  userId, enabled, disabled, onToggle,
}: {
  userId: string; enabled: boolean; disabled: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onToggle(userId, !enabled)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          enabled ? 'bg-zinc-900' : 'bg-zinc-200',
        ].join(' ')}
      >
        <span
          aria-hidden
          className={[
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow ring-0',
            'transition-transform duration-200 ease-in-out',
            enabled ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      <span className={`text-xs font-medium ${enabled ? 'text-zinc-900' : 'text-zinc-400'}`}>
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

// -- Toast ---------------------------------------------------------------------

type ToastItem = { id: number; message: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  function addToast(message: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }
  return { toasts, addToast }
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null
  return (
    <div aria-live="assertive" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} role="alert"
          className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm text-red-700 shadow-lg">
          {t.message}
        </div>
      ))}
    </div>
  )
}

// -- Optimistic reducer --------------------------------------------------------

type OptAction =
  | { type: 'toggle'; id: string; enabled: boolean }
  | { type: 'role'; id: string; roleKey: 'super_admin' | 'operator' }

function applyOpt(state: OperatorUser[], action: OptAction): OperatorUser[] {
  return state.map(u => {
    if (u.id !== action.id) return u
    if (action.type === 'toggle')
      return { ...u, status: action.enabled ? 'active' : 'inactive' }
    const roleName = action.roleKey === 'super_admin' ? 'Administrator' : 'PJ Ormawa'
    return {
      ...u,
      role: typeof u.role === 'object' && u.role !== null
        ? { ...u.role, name: roleName }
        : roleName,
    }
  })
}

// -- Main ----------------------------------------------------------------------

interface Props {
  initialOperators: OperatorUser[]
  currentUserId: string
  eventCount: number
}

export function OperatorsTab({ initialOperators, currentUserId, eventCount }: Props) {
  const [optimisticUsers, applyOptimistic] = useOptimistic(initialOperators, applyOpt)
  const [, startTransition] = useTransition()
  const { toasts, addToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingUser, setEditingUser] = useState<OperatorUser | undefined>(undefined)

  function openCreate() { setModalMode('create'); setEditingUser(undefined); setModalOpen(true) }
  function openEdit(u: OperatorUser) { setModalMode('edit'); setEditingUser(u); setModalOpen(true) }

  function handleToggle(userId: string, next: boolean) {
    applyOptimistic({ type: 'toggle', id: userId, enabled: next })
    startTransition(async () => {
      const res = await toggleAccess(userId, next)
      if (!res.success) addToast(res.error)
    })
  }

  function handleRoleChange(user: OperatorUser, newRole: 'super_admin' | 'operator') {
    applyOptimistic({ type: 'role', id: user.id, roleKey: newRole })
    startTransition(async () => {
      const fd = new FormData()
      fd.set('organisationName', user.organisation_name ?? '')
      fd.set('role', newRole)
      const res = await updateAccount(user.id, fd)
      if (!res.success) addToast(res.error)
    })
  }

  const columns = [
    {
      key: 'organisation_name' as const,
      label: 'User Name',
      render: (_: unknown, user: OperatorUser) => {
        const name = user.organisation_name ?? user.email.split('@').at(0) ?? user.email
        const isSelf = user.id === currentUserId
        return (
          <div className="flex items-center gap-2">
            <UserAvatar user={user} />
            <span className="truncate max-w-[160px] font-semibold" title={name}>{name}</span>
            {isSelf && (
              <Badge variant="outline" className="text-[10px] px-1 h-4 font-normal">Kamu</Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'email' as const,
      label: 'Account',
      render: (v: unknown) => (
        <span className="text-zinc-500 font-normal">{v as string}</span>
      ),
    },
    {
      key: 'role' as const,
      label: 'Role',
      render: (_: unknown, user: OperatorUser) => (
        <Select
          value={getRoleKey(user)}
          onValueChange={v => handleRoleChange(user, v as 'super_admin' | 'operator')}
          disabled={user.id === currentUserId}
        >
          <SelectTrigger className="w-32 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'status' as const,
      label: 'Access Status',
      render: (_: unknown, user: OperatorUser) => (
        <AccessToggle
          userId={user.id}
          enabled={isActive(user)}
          disabled={user.id === currentUserId && isActive(user)}
          onToggle={handleToggle}
        />
      ),
    },
    {
      key: '_actions' as const,
      label: 'Action',
      className: 'text-right',
      render: (_: unknown, user: OperatorUser) => (
        <button
          type="button"
          onClick={() => openEdit(user)}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline transition-colors"
        >
          Edit
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-end">
          {/* <Button variant="default" onClick={openCreate}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5"  y1="12" x2="19" y2="12"/>
            </svg>
            New Account
          </Button> */}
        </div>

        <DataTable
          columns={columns}
          data={optimisticUsers}
          caption="Role Based Access Control [RBAC]"
          count={eventCount}
          countLabel={eventCount === 1 ? 'event' : 'events'}
        />
      </div>

      <AccountModal
        mode={modalMode}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        currentUserId={currentUserId}
      />

      <ToastStack toasts={toasts} />
    </>
  )
}
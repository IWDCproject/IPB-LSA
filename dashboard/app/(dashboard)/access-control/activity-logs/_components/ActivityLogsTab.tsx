'use client'

import { useState, useMemo } from 'react'
import { DataTable } from '@/components/shared/DataTable'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ActivityLog } from '../_actions'

function UserAvatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 select-none">
      {initials}
    </span>
  )
}

interface Props {
  logs: ActivityLog[]
}

export function ActivityLogsTab({ logs }: Props) {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.description.toLowerCase().includes(search.toLowerCase())
      const matchesAction = actionFilter === 'all' || log.action === actionFilter
      const matchesEntity = entityFilter === 'all' || log.entity === entityFilter
      const matchesUser = userFilter === 'all' || log.user_id.email === userFilter
      return matchesSearch && matchesAction && matchesEntity && matchesUser
    })
  }, [logs, search, actionFilter, entityFilter, userFilter])

  const actions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs])
  const entities = useMemo(() => Array.from(new Set(logs.map(l => l.entity))), [logs])
  const users = useMemo(() => {
    const uniqueUsers = new Map()
    logs.forEach(l => {
      uniqueUsers.set(l.user_id.email, l.user_id.organisation_name || l.user_id.email)
    })
    return Array.from(uniqueUsers.entries())
  }, [logs])

  const columns = [
    {
      key: 'user_id' as const,
      label: 'User Name',
      render: (_: any, log: ActivityLog) => {
        const name = log.user_id.organisation_name || log.user_id.email
        return (
          <div className="flex items-center gap-2">
            <UserAvatar name={name} />
            <span className="truncate max-w-[160px] font-semibold" title={name}>{name}</span>
          </div>
        )
      }
    },
    {
      key: 'action' as const,
      label: 'Action',
      render: (v: any) => {
        const action = String(v)
        let cls = 'bg-zinc-100 text-zinc-600 border border-zinc-300'
        if (action.includes('create')) cls = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        if (action.includes('delete')) cls = 'bg-red-50 text-red-600 border border-red-200'
        if (action.includes('update')) cls = 'bg-zinc-100 text-zinc-700 border border-zinc-300'
        if (action.includes('enable'))  cls = 'bg-amber-50 text-amber-700 border border-amber-200'
        if (action.includes('disable')) cls = 'bg-orange-50 text-orange-600 border border-orange-200'
        return (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${cls}`}>
            {action.replaceAll('_', ' ')}
          </span>
        )
      }
    },
    {
      key: 'entity' as const,
      label: 'Entity',
      render: (v: any) => (
        <span className="text-zinc-500 font-medium capitalize">{String(v).replace('_', ' ')}</span>
      )
    },
    {
      key: 'description' as const,
      label: 'Description',
      render: (v: any) => (
        <span className="text-zinc-600 font-normal truncate max-w-[300px]" title={String(v)}>
          {String(v)}
        </span>
      )
    },
    {
      key: 'event_id' as const,
      label: 'Event',
      render: (_: any, log: ActivityLog) => (
        <span className="text-zinc-500 font-medium italic">
          {log.event_id?.name || '-'}
        </span>
      )
    },
    {
      key: 'created_at' as const,
      label: 'Time',
      className: 'text-right',
      render: (v: any) => {
        const date = new Date(String(v))
        return (
          <div className="flex flex-col items-end">
            <span className="text-zinc-900 font-bold">
              {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              {date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Input
            placeholder="Search Description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pr-8"
          />
          <svg className="absolute right-2.5 top-2.5 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map(a => (
              <SelectItem key={a} value={a} className="capitalize">{a.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity</SelectItem>
            {entities.map(e => (
              <SelectItem key={e} value={e} className="capitalize">{e.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(([email, name]) => (
              <SelectItem key={email} value={email}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns as any}
        data={filteredLogs}
        caption="Activity Logs"
        count={filteredLogs.length}
        countLabel={filteredLogs.length === 1 ? 'event' : 'events'}
      />
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { ExternalLink, Plus, Edit } from 'lucide-react'
import type { MatchStatus, MatchType } from '@/types/directus'
import type { ComponentProps } from 'react'
import { AddMatchModal } from './AddMatchModal'

// --- Types -----------------------------------------------------

type RawMatch = {
  id: string
  status: MatchStatus
  scheduled_at: string | null
  venue: string | null
  match_name: string | null
  round: string | null
  home_score: number
  away_score: number
  winner: string | null
  competition_category_id: {
    id: string
    name: string
    display_order: number
    format_id: {
      match_type: MatchType
    } | null
  } | null
  home_participant_id: {
    id: string
    name: string
    institution_id: { name: string } | null
  } | null
  away_participant_id: {
    id: string
    name: string
    institution_id: { name: string } | null
  } | null
  participants: {
    participant_id: {
      id: string
      name: string
      institution_id: { name: string } | null
    }
  }[]
}

type MatchGroup = {
  categoryId: string
  categoryName: string
  matchType: MatchType
  matches: RawMatch[]
}

type ColumnType = ComponentProps<typeof DataTable<RawMatch>>['columns']

// --- Helpers ---------------------------------------------------

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${time} - ${date}`
}

const formatParticipant = (p: any) => {
  if (!p || typeof p === 'string' || !p.name) return '-'
  const inst = p.institution_id?.name
  return inst ? `${inst} – ${p.name}` : p.name
}

// --- Component -------------------------------------------------

export default function MatchesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()
  
  const [groups, setGroups] = useState<MatchGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [matchToEdit, setMatchToEdit] = useState<RawMatch | null>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    try {
      const data = await directus.request(
        readItems('matches', {
          filter: { competition_category_id: { event_id: { slug: { _eq: eventId } } } },
          fields:[
            'id', 'status', 'scheduled_at', 'venue', 'match_name', 'round',
            'home_score', 'away_score', 'winner',
            'competition_category_id.id',
            'competition_category_id.name',
            'competition_category_id.display_order',
            'competition_category_id.format_id.match_type',
            'home_participant_id.id',
            'home_participant_id.name',
            'home_participant_id.institution_id.name',
            'away_participant_id.id',
            'away_participant_id.name',
            'away_participant_id.institution_id.name',
            'participants.participant_id.id',
            'participants.participant_id.name',
            'participants.participant_id.institution_id.name'
          ],
          limit: -1
        })
      )

      const groupMap = (data as RawMatch[]).reduce((acc, match) => {
        const catId = match.competition_category_id?.id
        if (!catId) return acc
        if (!acc[catId]) {
          acc[catId] = {
            categoryId: catId,
            categoryName: match.competition_category_id?.name || 'Unknown Category',
            matchType: match.competition_category_id?.format_id?.match_type || 'open',
            matches:[]
          }
        }
        acc[catId].matches.push(match)
        return acc
      }, {} as Record<string, MatchGroup>)

      const groupList = Object.values(groupMap).sort((a, b) => {
        const aOrder = a.matches[0]?.competition_category_id?.display_order || 0
        const bOrder = b.matches[0]?.competition_category_id?.display_order || 0
        return aOrder - bOrder
      })

      groupList.forEach(g => {
        g.matches.sort((m1, m2) => {
          const t1 = m1.scheduled_at ? new Date(m1.scheduled_at).getTime() : 0
          const t2 = m2.scheduled_at ? new Date(m2.scheduled_at).getTime() : 0
          return t1 - t2
        })
      })

      setGroups(groupList)
    } catch (error) {
      console.error('Failed to fetch matches:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const getColumns = (matchType: MatchType): ColumnType => {
    const baseCols: ColumnType =[
      { key: 'scheduled_at', label: 'Time', render: (v) => formatDateTime(v as string | null) },
      { key: 'status', label: 'Status', render: (v) => <span className="capitalize">{v as string}</span> },
      { 
        key: 'venue', 
        label: 'Place', 
        render: (v) => (
          <div className="truncate max-w-[100px] sm:max-w-[140px]" title={v as string || ''}>
            {v as string || '-'}
          </div>
        )
      },
    ]

    const actionCol: ColumnType[0] = {
      key: '_actions',
      label: 'Action',
      className: 'text-right', 
      render: (_: any, row: RawMatch) => (
        <div className="flex justify-end items-center gap-3">
          <Button
            variant="noBorder"
            className="px-0 py-0 h-auto font-bold text-zinc-900 hover:text-zinc-600"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/events/${eventId}/matches/${row.id}`)
            }}
          >
            Scoring <ExternalLink className=" h-3.5 w-3.5" />
          </Button>
          <Button
          variant="noBorder"
            className="px-0 py-0 h-auto font-bold text-zinc-900 hover:text-zinc-600"
            onClick={(e) => {
              e.stopPropagation()
              setMatchToEdit(row)
              setIsModalOpen(true)
            }}
            title="Edit Match"
          >
            Edit <Edit className="h-3.5 w-3.5" />
          </Button>
          
        </div>
      )
    }

    if (matchType === 'head_to_head') {
      return[
        ...baseCols,
        { key: 'home_participant_id', label: 'Participant A', render: (v) => (
          <div className="truncate max-w-[150px] lg:max-w-[200px]" title={formatParticipant(v)}>
            {formatParticipant(v)}
          </div>
        )},
        { key: 'home_score', label: 'Score', render: (_, row) => `${String(row.home_score || 0).padStart(2, '0')} - ${String(row.away_score || 0).padStart(2, '0')}` },
        { key: 'away_participant_id', label: 'Participant B', render: (v) => (
          <div className="truncate max-w-[150px] lg:max-w-[200px]" title={formatParticipant(v)}>
            {formatParticipant(v)}
          </div>
        )},
        actionCol
      ]
    } else if (matchType === 'solo') {
      return[
        ...baseCols,
        { key: 'match_name', label: 'Match Name', render: (_, row) => {
          const name =[row.match_name, row.round].filter(Boolean).join(' - ')
          return (
            <div className="truncate max-w-[160px] lg:max-w-[250px]" title={name}>
              {name || '-'}
            </div>
          )
        }},
        { key: 'home_participant_id', label: 'Contestant', render: (_, row) => (
          <div className="truncate max-w-[160px] lg:max-w-[250px]" title={formatParticipant(row.home_participant_id)}>
            {formatParticipant(row.home_participant_id)}
          </div>
        )},
        actionCol
      ]
    } else {
      return[
        ...baseCols,
        { key: 'match_name', label: 'Match Name', render: (_, row) => {
          const name =[row.match_name, row.round].filter(Boolean).join(' - ')
          return (
            <div className="truncate max-w-[160px] lg:max-w-[250px]" title={name}>
              {name || '-'}
            </div>
          )
        }},
        { key: 'participants', label: 'Participants', render: (_, row) => {
          const mps = row.participants ||[]
          
          if (mps.length > 0) {
             if (mps.length <= 3) {
                const names = mps.map(mp => formatParticipant(mp.participant_id)).join(', ')
                return <div className="truncate max-w-[160px] lg:max-w-[250px]" title={names}>{names}</div>
             }
             return `${mps.length} Participants`
          }

          if (row.home_participant_id) {
             return (
               <div className="truncate max-w-[160px] lg:max-w-[250px]" title={formatParticipant(row.home_participant_id)}>
                 {formatParticipant(row.home_participant_id)}
               </div>
             )
          }

          return '-'
        }},
        actionCol
      ]
    }
  }

  return (
    <div className="relative pb-12">
      <div className="absolute right-0 -top-[3.75rem] z-10 hidden sm:block">
        <Button onClick={() => {
          setMatchToEdit(null)
          setIsModalOpen(true)
        }}>
          Add Match <Plus className=" h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 py-4">Loading matches...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-400 py-4">No matches found for this event.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.categoryId} className="w-full">
              <DataTable
                caption={group.categoryName}
                count={group.matches.length}
                countLabel={group.matches.length === 1 ? "match" : "matches"}
                columns={getColumns(group.matchType)}
                data={group.matches}
                onRowClick={(row) => router.push(`/events/${eventId}/matches/${row.id}`)}
              />
            </div>
          ))}
        </div>
      )}

      <AddMatchModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setMatchToEdit(null)
        }}
        eventId={eventId}
        onSuccess={fetchMatches}
        matchToEdit={matchToEdit}
      />
    </div>
  )
}
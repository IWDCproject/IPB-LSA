// app/(dashboard)/events/[eventId]/participants/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { readItems } from '@directus/sdk'
import { ExternalLink, Plus } from 'lucide-react'

import { directus, getAssetUrl } from '@/lib/directus'
import { useDirectusFetch } from '@/hooks/useDirectusFetch'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Institution, CompetitionCategory, Participant as RawParticipant } from '@/types/directus'

import AddInstitutionModal from './_components/AddInstitutionModal'
import AddParticipantModal from './_components/AddParticipantModal'

// --- Types -----------------------------------------------------

type MappedParticipant = Omit<RawParticipant, 'institution_id' | 'members'> & {
  institution: (Institution & { logo_url: string | null }) | null
  members: Array<{ name: string }> | null
}

type CategoryWithFormat = CompetitionCategory & {
  format_id?: { name: string; match_type: string }
}

// --- Helpers ---------------------------------------------------

const formatMatchType = (type?: string) => {
  if (type === 'head_to_head') return 'Head to Head'
  if (type === 'solo') return 'Solo'
  if (type === 'open') return 'Open'
  return type || 'Unknown'
}

// --- Komponen utama / default export ---------------------------

export default function ParticipantsPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [activeTab, setActiveTab] = useState<string>('institutions')
  
  const [isInstModalOpen, setInstModalOpen] = useState(false)
  const [isPartModalOpen, setPartModalOpen] = useState(false)
  
  // Edit state
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [editingParticipant, setEditingParticipant] = useState<MappedParticipant | null>(null)
  
  // Memaksa fetch ulang setelah create modal berhasil tanpa reload page
  const [refreshKey, setRefreshKey] = useState(0)
  const handleRefresh = () => setRefreshKey(k => k + 1)
  
  // Handlers for edit buttons
  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution)
    setInstModalOpen(true)
  }
  
  const handleEditParticipant = (participant: MappedParticipant) => {
    setEditingParticipant(participant)
    setPartModalOpen(true)
  }
  
  const handleCloseInstModal = () => {
    setInstModalOpen(false)
    setEditingInstitution(null)
  }
  
  const handleClosePartModal = () => {
    setPartModalOpen(false)
    setEditingParticipant(null)
  }

  // --- Data Fetching ---

  const { data: institutions, loading: loadingInst } = useDirectusFetch<Institution[]>(
    () => directus.request(
      readItems('institutions', {
        filter: { event_id: { slug: { _eq: eventId } } },
        fields: ['id', 'name', 'logo', 'color'],
        limit: -1,
      })
    ) as Promise<Institution[]>,
    [eventId, refreshKey]
  )

  const { data: categories, loading: loadingCats } = useDirectusFetch<CategoryWithFormat[]>(
    () => directus.request(
      readItems('competition_categories', {
        filter: { event_id: { slug: { _eq: eventId } } },
        fields: ['id', 'name', 'display_order', 'format_id.name', 'format_id.match_type'] as any,
        sort: ['display_order'],
        limit: -1,
      })
    ) as Promise<CategoryWithFormat[]>,
    [eventId, refreshKey]
  )

  const { data: rawParticipants, loading: loadingPart } = useDirectusFetch<RawParticipant[]>(
    () => directus.request(
      readItems('participants', {
        filter: { competition_category_id: { event_id: { slug: { _eq: eventId } } } },
        fields: ['id', 'name', 'competition_category_id', 'institution_id.id', 'institution_id.name', 'institution_id.logo', 'members', 'seed', 'notes'] as any,
        limit: -1,
      })
    ) as Promise<RawParticipant[]>,
    [eventId, refreshKey]
  )

  // Mapping FK response Directus agar jadi bentuk object utuh di frontend
  const participants = useMemo<MappedParticipant[]>(() => {
    if (!rawParticipants) return []
    return rawParticipants.map(p => ({
      ...p,
      members: (p.members as Array<{ name: string }> | null) ?? null,
      institution: p.institution_id ? {
        ...(p.institution_id as unknown as Institution),
        logo_url: getAssetUrl((p.institution_id as any).logo)
      } : null
    }))
  }, [rawParticipants])

  // --- Derived State ---
  
  const isLoading = loadingInst || loadingCats || loadingPart
  const isInstitutionsActive = activeTab === 'institutions'
  const activeCategory = categories?.find(c => c.id === activeTab)

  const activeParticipants = useMemo(() => {
    if (!activeCategory) return[]
    return participants.filter(p => p.competition_category_id === activeCategory.id)
  }, [activeCategory, participants])

  return (
    <div className="flex flex-col md:flex-row items-stretch w-full gap-6 md:gap-0">
      
      {/* --- Left Sidebar (Tab Navigator) --- */}
      <div className="w-full md:w-[240px] shrink-0 flex flex-col gap-6 md:pr-6 md:border-r md:border-zinc-200">
        <div>
          <button
            onClick={() => setActiveTab('institutions')}
            className={cn(
              "flex w-full items-center justify-between rounded-[8px] border-[1px] px-4 py-2.5 text-sm font-bold transition-all outline-none",
              isInstitutionsActive
                ? "border-transparent bg-zinc-900 text-white"
                : "border-zinc-900 bg-transparent text-zinc-900 hover:bg-zinc-100"
            )}
          >
            <span>Institutions</span>
            <span className={cn(
              "text-xs font-semibold",
              isInstitutionsActive ? "text-background/80" : "text-foreground/60"
            )}>
              [{loadingInst ? '...' : (institutions?.length || 0)}]
            </span>
          </button>
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-400 mb-3 text-center">
            Event Categories
          </p>
          <div className="flex flex-col gap-2">
            {categories?.map((cat) => {
              const count = participants.filter(p => p.competition_category_id === cat.id).length
              const isActive = activeTab === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[8px] border-[1px] px-4 py-2.5 text-sm font-bold transition-all outline-none",
                    isActive
                      ? "border-transparent bg-zinc-900 text-white"
                      : "border-zinc-900 bg-transparent text-zinc-900 hover:bg-zinc-100"
                  )}
                >
                  <span className="truncate text-left mr-2">{cat.name}</span>
                  <span className={cn(
                    "text-xs font-semibold shrink-0",
                    isActive ? "text-background/80" : "text-foreground/60"
                  )}>[{loadingPart ? '...' : count}]
                  </span>
                </button>
              )
            })}
            
            {!isLoading && categories?.length === 0 && (
              <div className="text-xs text-center text-zinc-400 py-4">
                No categories found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 min-w-0 flex flex-col w-full md:pl-6">
        
        {isInstitutionsActive && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight">Institutions</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Event-level library, shared across all categories
                </p>
              </div>
              <Button onClick={() => setInstModalOpen(true)}>
                Add Institution <Plus className=" h-4 w-4" />
              </Button>
            </div>

            <DataTable<Institution>
              columns={[
                { key: 'name', label: 'Name' },
                { 
                  key: 'logo', 
                  label: 'Preview',
                  render: (_, row) => (
                    row.logo ? (
                      <img 
                        src={getAssetUrl(row.logo) || ''} 
                        alt={row.name}
                        className="h-6 w-6 object-contain"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
                        -
                      </div>
                    )
                  )
                },
                { 
                  // Memakai key berbeda dari 'logo' agar tidak terjadi duplikasi React keys di DataTable
                  key: 'color', 
                  label: 'Logo URL',
                  render: (_, row) => {
                    const url = getAssetUrl(row.logo)
                    return url ? (
                      <div className="max-w-[300px] truncate font-normal text-zinc-600" title={url}>
                        {url}
                      </div>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )
                  }
                },
                { 
                  key: '_actions', 
                  label: 'Action', 
                  className: 'text-right',
                  render: (_, row) => (
                    <div 
                      onClick={() => handleEditInstitution(row)}
                      className="flex items-center justify-end text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      Edit <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </div>
                  )
                }
              ]}
              data={institutions ||[]}
              loading={isLoading}
              count={isLoading ? undefined : (institutions?.length || 0)}
              countLabel="matches" // Disamakan persis dengan tampilan screenshot referensi
              caption="Institutions"
            />
          </div>
        )}

        {!isInstitutionsActive && activeCategory && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight">{activeCategory.name}</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {activeCategory.format_id 
                    ? `${formatMatchType(activeCategory.format_id.match_type)}: ${activeCategory.format_id.name} format` 
                    : 'No format assigned'}
                </p>
              </div>
              <Button onClick={() => setPartModalOpen(true)}>
                Add Participant <ExternalLink className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            <DataTable<MappedParticipant>
              columns={[
                { 
                  key: 'id', 
                  label: '#',
                  render: (_, row) => (
                    <span className="font-normal text-zinc-500">
                      {activeParticipants.findIndex(p => p.id === row.id) + 1}
                    </span>
                  )
                },
                { 
                  key: 'name', 
                  label: 'Name',
                  render: (_, row) => (
                    <div>
                      <div className="font-semibold">{row.name}</div>
                      {row.members && (row.members as Array<{ name: string }>).length > 0 && (
                        <div className="text-xs text-zinc-500 mt-0.5 max-w-[400px] truncate">
                          {(row.members as Array<{ name: string }>).map(m => m.name).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                },
                { 
                  key: 'institution', 
                  label: 'Institution',
                  render: (_, row) => row.institution?.name || '-'
                },
                { 
                  key: '_actions', 
                  label: 'Action', 
                  className: 'text-right',
                  render: (_, row) => (
                    <div 
                      onClick={() => handleEditParticipant(row)}
                      className="flex items-center justify-end text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      Edit <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </div>
                  )
                }
              ]}
              data={activeParticipants}
              loading={isLoading}
              count={isLoading ? undefined : activeParticipants.length}
              countLabel="participants"
              caption="Participants"
            />
          </div>
        )}

      </div>

      {/* --- Modals --- */}
      <AddInstitutionModal 
        isOpen={isInstModalOpen}
        onClose={handleCloseInstModal}
        eventId={eventId}
        onSuccess={handleRefresh}
        editingInstitution={editingInstitution}
      />
      
      <AddParticipantModal
        isOpen={isPartModalOpen}
        onClose={handleClosePartModal}
        eventId={eventId}
        preselectedCategoryId={!isInstitutionsActive && activeCategory ? activeCategory.id : undefined}
        onSuccess={handleRefresh}
        editingParticipant={editingParticipant}
      />
    </div>
  )
}
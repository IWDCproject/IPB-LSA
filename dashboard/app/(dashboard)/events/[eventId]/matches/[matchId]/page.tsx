import { notFound, redirect } from 'next/navigation'
import { createDirectus, rest, staticToken, readItem, readItems } from '@directus/sdk'
import { auth } from '@/lib/auth'
import { ControlPanel } from '@/components/match/ControlPanel'
import type {
  Match, MatchFormat, CompetitionCategory, Participant,
} from '@/types/directus'

// Force Next.js to NEVER cache this page. 
// This ensures `router.refresh()` actually fetches fresh data from Directus.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// --- Setup SDK server-side -------------------------------------

const serverDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- Types -----------------------------------------------------

type PageProps = {
  params: { eventId: string; matchId: string }
}

// --- Page ------------------------------------------------------

export default async function MatchControlPage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const { eventId, matchId } = params

  // fetch match dengan relasi dasar
  const match = await serverDirectus.request(
    readItem('matches', matchId, {
      fields:[
        'id', 'competition_category_id', 'round', 'match_name', 'venue',
        'scheduled_at', 'status', 'live_state',
        'home_participant_id', 'away_participant_id',
        'winner', 'rankings',
      ],
    })
  ).catch(() => null) as Match | null

  if (!match) notFound()

  // fetch category + format sekaligus
  const category = await serverDirectus.request(
    readItem('competition_categories', match.competition_category_id, {
      fields: ['id', 'name', 'format_id', 'event_id'],
    })
  ).catch(() => null) as CompetitionCategory | null

  if (!category) notFound()
    
  const event = await serverDirectus.request(
    readItem('events', category.event_id, { fields:['slug'] })
  ).catch(() => null) as { slug: string } | null
  
  if (!event || event.slug !== eventId) notFound()

  const format = category.format_id
    ? await serverDirectus.request(
        readItem('match_formats', category.format_id, {
          fields: ['id', 'name', 'match_type', 'modules'],
        })
      ).catch(() => null) as MatchFormat | null
    : null

  if (!format) notFound()

  // fetch semua participants dalam category ini
  const participants = await serverDirectus.request(
    readItems('participants', {
      filter: { competition_category_id: { _eq: category.id } },
      fields: ['id', 'name', 'institution_id', 'seed', 'notes', 'members'],
      limit: -1,
    })
  ).catch(() => []) as Participant[]

  // petakan home/away
  const homeParticipant = participants.find(
    (p) => p.id === match.home_participant_id
  ) ?? null

  const awayParticipant = participants.find(
    (p) => p.id === match.away_participant_id
  ) ?? null

  const isSuperAdmin = session.user.role === 'SuperAdmin'

  // Create a unique key based on the current state data.
  // This forces React to "re-mount" and sync all panels down the tree when data changes.
  const stateKey = JSON.stringify(match.live_state)

  return (
    <div className="w-full pt-0">
      <ControlPanel
        key={stateKey}
        matchId={matchId}
        initialLiveState={match.live_state}
        format={format}
        participants={participants}
        homeParticipant={homeParticipant}
        awayParticipant={awayParticipant}
        categoryName={category.name}
        isSuperAdmin={isSuperAdmin}
        matchName={match.match_name ?? undefined}
        round={match.round ?? undefined}
      />
    </div>
  )
}
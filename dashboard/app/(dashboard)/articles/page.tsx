'use client'

import { useEffect, useState, useMemo } from 'react'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'
import { useRouter } from '@/hooks/useRouter'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronDown, ExternalLink } from 'lucide-react'
import type { NewsArticle } from '@/types/directus'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// --- Types -----------------------------------------------------

type EventRow = { id: string; name: string; status: string }
type ArticleRow = NewsArticle & { 
  event_name: string | null;
  event_status?: string; 
}

// --- Komponen Utama --------------------------------------------

export default function ArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') 
  const [eventFilter, setEventFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [rawArticles, rawEvents] = await Promise.all([
          directus.request(
            readItems('news', {
              fields: ['id', 'title', 'category', 'event_id', 'is_published'],
              sort: ['-created_at'],
            })
          ),
          directus.request(
            readItems('events', {
              fields: ['id', 'name', 'status'],
              limit: -1,
            })
          ),
        ])

        const eventDataById = Object.fromEntries(
          (rawEvents as any[]).map((e) => [e.id, { name: e.name, status: e.status || 'Ongoing' }])
        )

        setEvents(rawEvents as EventRow[])
        setArticles(
          (rawArticles as any[]).map((a) => ({
            ...a,
            event_name: a.event_id ? (eventDataById[a.event_id]?.name ?? null) : null,
            event_status: a.event_id ? (eventDataById[a.event_id]?.status ?? 'Ongoing') : null,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Combined Filtering and Grouping Logic
  const groupedData = useMemo(() => {
    const buckets: Record<string, { name: string; status: string; articles: ArticleRow[] }> = {}
    
    events.forEach(ev => {
      buckets[ev.id] = { name: ev.name, status: ev.status || 'Ongoing', articles: [] }
    })
    
    articles.forEach(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'published' ? a.is_published : !a.is_published)
      const matchesEvent = eventFilter === 'all' ? true : (a.event_id === eventFilter || (eventFilter === 'none' && !a.event_id))
      const matchesCategory = categoryFilter === 'all' ? true : a.category === categoryFilter

      if (matchesSearch && matchesStatus && matchesEvent && matchesCategory) {
        const key = a.event_id || '__none__'
        if (!buckets[key]) {
          buckets[key] = { name: 'Articles without Event', status: 'N/A', articles: [] }
        }
        buckets[key].articles.push(a)
      }
    })

    return buckets
  }, [articles, events, searchQuery, statusFilter, eventFilter, categoryFilter])

  const groupKeys = useMemo(() => {
    const keys = Object.keys(groupedData)
    
    return keys.filter(key => {
      const group = groupedData[key]
      if (!group) return false
      if (key === '__none__') return group.articles.length > 0
      
      const isFilteringGlobally = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
      if (isFilteringGlobally) return group.articles.length > 0
      if (eventFilter !== 'all') return key === eventFilter
      
      return true
    }).sort((a, b) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return 0;
    })
  }, [groupedData, searchQuery, statusFilter, eventFilter, categoryFilter])

  return (
    <div>
      <div className="-mx-6 -mt-6">
        <PageHeader breadcrumbs={[{ label: 'Articles' }]} title="Articles" />
      </div>

      <div className="pt-3 space-y-6">
        {/* FILTER BAR */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search Articles..." 
              className="pl-10 h-11 bg-white border-zinc-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-11 bg-white border-zinc-300">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-56 h-11 bg-white border-zinc-300">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
              <SelectItem value="none">No Event</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-11 bg-white border-zinc-300">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="result">Result</SelectItem>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="update">Update</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm">Loading articles...</div>
        ) : (
          <div className="space-y-10">
            {groupKeys.length === 0 && (
              <div className="py-20 text-center text-zinc-400 font-medium text-sm">No results found.</div>
            )}

            {groupKeys.map((key) => {
              const group = groupedData[key]
              if (!group) return null
              const items = group.articles

              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[13px] italic text-zinc-500 mb-0.5">
                        Event status: <span className="capitalize">{group.status}</span>
                      </p>
                      <h2 className="text-2xl font-bold text-zinc-900 tracking-tight leading-tight">{group.name}</h2>
                    </div>
                    <Button 
                      variant="filled"
                      className="bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-900 font-bold gap-2 h-9 px-3 shadow-sm text-sm"
                      onClick={() => {
                        const baseUrl = '/articles/new';
                        const query = key !== '__none__' ? `?event_id=${key}` : '';
                        router.push(baseUrl + query);
                      }}
                    >
                      New Article <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/5">
                      <span className="font-bold text-sm text-zinc-900">Articles</span>
                      <span className="text-[11px] text-zinc-400 font-bold uppercase">{items.length} items</span>
                    </div>
                    
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/30">
                          <th className="px-4 py-1.5">Article Title</th>
                          <th className="px-4 py-1.5 w-32">Status</th>
                          <th className="px-4 py-1.5 w-24 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-zinc-400 italic text-[13px]">
                                    No articles for this event yet.
                                </td>
                            </tr>
                        ) : (
                            items.map((article) => (
                                <tr 
                                    key={article.id} 
                                    onClick={() => router.push(`/articles/${article.id}`)}
                                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-4 py-2.5 text-sm font-semibold text-zinc-900">
                                        {article.title}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-[13px] font-bold ${article.is_published ? 'text-zinc-900' : 'text-zinc-400 italic'}`}>
                                            {article.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <div className="text-[13px] font-bold inline-flex items-center gap-1.5 text-zinc-900 group-hover:underline">
                                            Edit <ExternalLink className="h-3 w-3" />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

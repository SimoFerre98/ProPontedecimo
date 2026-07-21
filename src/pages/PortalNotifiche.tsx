import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns/format'
import { it } from 'date-fns/locale/it'
import { ArrowLeft, Bell, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { announcementService, type AnnouncementSeverity } from '@/services/announcementService'
import { SEVERITY_CONFIG, SEVERITY_ORDER } from '@/lib/announcementSeverity'

type FilterKey = 'all' | AnnouncementSeverity

export default function PortalNotifiche() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterKey>('all')

  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementService.listAnnouncements
  })

  const filtered = useMemo(() => {
    if (filter === 'all') return announcements
    return announcements.filter(a => a.severity === filter)
  }, [announcements, filter])

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-2xl mx-auto pb-10">
      <button
        type="button"
        onClick={() => navigate('/portal')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna alla Dashboard
      </button>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 pill bg-primary/15 flex items-center justify-center text-primary border border-primary/20">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground uppercase italic leading-none">
            Bacheca <span className="text-primary not-italic">Notifiche</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground/60 mt-1">
            Più recenti in alto
          </p>
        </div>
      </div>

      {/* ── Filtro gravità ── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'flex-shrink-0 flex items-center gap-2 h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
            filter === 'all'
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50'
          )}
        >
          Tutte
        </button>
        {SEVERITY_ORDER.map(key => {
          const meta = SEVERITY_CONFIG[key]
          const Icon = meta.icon
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
                filter === key ? cn('sev-badge', meta.cssClass, '!h-9 !px-4 border-2') : 'text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.labelPlural}
            </button>
          )
        })}
      </div>

      {/* ── Feed ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center glass-card border-white/10 rounded-3xl">
          <div className="w-14 h-14 pill bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Bell className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">Nessuna notifica</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Non ci sono ancora comunicazioni {filter !== 'all' ? 'di questa gravità ' : ''}per la tua leva o per tutta la società.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const meta = SEVERITY_CONFIG[item.severity]
            const Icon = meta.icon
            return (
              <div key={item.id} className={cn('announcement-feed-card', meta.cssClass)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="announcement-feed-card-icon">
                    <Icon className="w-[1.15rem] h-[1.15rem]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[9px] font-black uppercase tracking-[0.14em] mb-1', meta.textColorClass)}>
                      {meta.label}
                    </p>
                    <p className="text-base font-black italic uppercase leading-tight text-foreground">{item.title}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground/85 leading-relaxed">{item.body}</p>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                  <span className="target-chip">
                    {item.team_sector ? item.team_sector : (
                      <span className="inline-flex items-center gap-1"><Users className="w-2.5 h-2.5" />Tutta la società</span>
                    )}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {format(new Date(item.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

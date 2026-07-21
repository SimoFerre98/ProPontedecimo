import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns/format'
import { it } from 'date-fns/locale/it'
import { Bell, Lock, Users, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/errors'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { SEVERITY_CONFIG, SEVERITY_ORDER } from '@/lib/announcementSeverity'
import {
  announcementService,
  type Announcement,
  type AnnouncementSeverity
} from '@/services/announcementService'

function SeverityBadge({ severity }: { severity: AnnouncementSeverity }) {
  const meta = SEVERITY_CONFIG[severity]
  const Icon = meta.icon
  return (
    <span className={cn('sev-badge', meta.cssClass)}>
      <Icon />
      {meta.label}
    </span>
  )
}

export default function Notifiche() {
  const { profile, role } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const isCoach = role === 'coach'
  const isAdmin = role === 'president' || role === 'director'

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

  const { data: mySectors = [] } = useQuery({
    queryKey: ['my-coach-sectors'],
    queryFn: announcementService.getMyCoachSectors,
    enabled: isCoach
  })

  const { data: allSectors = [] } = useQuery({
    queryKey: ['all-team-sectors'],
    queryFn: announcementService.listAllSectors,
    enabled: isAdmin
  })

  const [severity, setSeverity] = useState<AnnouncementSeverity>('urgent')
  const [targetAll, setTargetAll] = useState(false)
  const [adminTargetSector, setAdminTargetSector] = useState<string | null>(null)
  const [coachSelectedSector, setCoachSelectedSector] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [publishing, setPublishing] = useState(false)

  // L'allenatore è bloccato su una delle proprie leve (mai libero): se non ha ancora
  // scelto esplicitamente (caso multi-leva), il default è la prima in ordine alfabetico.
  const coachTargetSector = coachSelectedSector ?? mySectors[0] ?? null
  const targetSector = isCoach ? coachTargetSector : adminTargetSector

  const resolvedTeamSector = isCoach ? coachTargetSector : (targetAll ? null : adminTargetSector)
  const canPublish =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (isCoach ? !!coachTargetSector : (targetAll || !!adminTargetSector))

  const handlePublish = async () => {
    if (!canPublish || !profile) return
    setPublishing(true)
    try {
      await announcementService.createAnnouncement({
        severity,
        title: title.trim(),
        body: body.trim(),
        teamSector: resolvedTeamSector,
        createdBy: profile.id
      })
      toast.success('Notifica pubblicata')
      setTitle('')
      setBody('')
      await queryClient.invalidateQueries({ queryKey: ['announcements'] })
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    }
    setPublishing(false)
  }

  const roleTag = useMemo(() => {
    if (isAdmin) return role === 'president' ? 'Presidente · tutta la società' : 'Direttore · tutta la società'
    if (isCoach) return `Allenatore · ${coachTargetSector ?? 'nessuna leva assegnata'}`
    return null
  }, [isAdmin, isCoach, role, coachTargetSector])

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 pill bg-primary/15 flex items-center justify-center text-primary border border-primary/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground uppercase italic leading-none">
              Comunicazioni <span className="text-primary not-italic">Interne</span>
            </h1>
            {roleTag && (
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground/60 mt-1">{roleTag}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Compose card ── */}
      <div className="compose-card">
        <div className="compose-section">
          <span className="compose-label">Gravità</span>
          <div className="sev-tile-row">
            {SEVERITY_ORDER.map(key => {
              const meta = SEVERITY_CONFIG[key]
              const Icon = meta.icon
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSeverity(key)}
                  className={cn('sev-tile', meta.cssClass, severity === key && 'active')}
                >
                  <span className="sev-tile-icon"><Icon className="w-[1.15rem] h-[1.15rem]" /></span>
                  <span className="sev-tile-label">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="compose-section">
          <span className="compose-label">Destinatari</span>
          {isCoach ? (
            mySectors.length === 0 ? (
              <p className="text-xs font-semibold text-muted-foreground">Nessuna leva assegnata: contatta il presidente o il direttore.</p>
            ) : mySectors.length === 1 ? (
              <div className="target-locked-pill">
                <span className="tlp-icon"><Lock className="w-[.95rem] h-[.95rem]" /></span>
                <div>
                  <p className="text-sm font-extrabold text-foreground">{mySectors[0]}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Puoi notificare solo la tua leva</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Scegli fra le tue leve assegnate</p>
                <div className="flex flex-wrap gap-2">
                  {mySectors.map(sector => (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => setCoachSelectedSector(sector)}
                      className={cn(
                        'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                        coachTargetSector === sector
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                          : 'text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setTargetAll(true); setAdminTargetSector(null) }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                  targetAll ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Tutta la società
              </button>
              {allSectors.map(sector => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => { setTargetAll(false); setAdminTargetSector(sector) }}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                    !targetAll && targetSector === sector
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {sector}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="compose-section">
          <span className="compose-label">Titolo</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={70}
            placeholder="Es. Allenamento anticipato di 30 minuti"
            className="compose-input"
          />
        </div>

        <div className="compose-section">
          <span className="compose-label">Messaggio</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Scrivi qui il testo della comunicazione..."
            className="compose-textarea"
          />
          <p className="text-[10px] text-muted-foreground/60 text-right">{body.length}/280</p>
        </div>

        <button
          type="button"
          disabled={!canPublish || publishing}
          onClick={() => void handlePublish()}
          className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 active:scale-95"
        >
          {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {publishing ? 'Pubblicazione in corso...' : 'Pubblica notifica'}
        </button>
      </div>

      {/* ── Storico ── */}
      <div className="space-y-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-1">
          Notifiche inviate
        </span>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center glass-card border-white/10 rounded-3xl">
            <div className="w-12 h-12 pill bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Nessuna notifica inviata</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {announcements.map((item: Announcement) => (
              <div key={item.id} className={cn('announcement-history-row', SEVERITY_CONFIG[item.severity].cssClass)}>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-foreground truncate">{item.title}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                      {format(new Date(item.created_at), "d MMM 'alle' HH:mm", { locale: it })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">{item.body}</p>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="target-chip">
                      {item.team_sector ?? 'Tutta la società'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale/it'
import {
  ClipboardList,
  Home,
  Plane,
  Calendar,
  Clock,
  Flag,
  PenLine,
  CheckCircle2,
  Lock,
  Send,
  Undo2,
  Check,
  Plus,
  Users,
  UserX,
  CalendarX2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { Badge } from '@/components/ui/Badge'
import { attendanceService, type PlayerRosterItem } from '@/services/attendanceService'
import { callUpService, type EventRow, type CallUp } from '@/services/callUpService'

export default function Convocazioni() {
  const { profile } = useAuth()
  const { selectedSeasonId } = useAppStore()
  const queryClient = useQueryClient()

  const [selectedSector, setSelectedSector] = useState('all')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [justSetPlayerId, setJustSetPlayerId] = useState<string | null>(null)

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 1600)
  }

  // 1. Unscoped roster fetch, used only to derive the sector(s) the current user can see.
  // RLS already limits this to the coach's own assigned players (or everyone for president/director),
  // same pattern as Attendance.tsx.
  const {
    data: fullRoster = [],
    isLoading: isLoadingSectors
  } = useQuery({
    queryKey: ['callups-sector-roster', selectedSeasonId],
    queryFn: () => attendanceService.getRosterForAttendance(selectedSeasonId!),
    enabled: !!selectedSeasonId
  })

  const mySectors = useMemo(() => {
    const unique = new Set(fullRoster.map(p => p.team_sector).filter(Boolean))
    return Array.from(unique) as string[]
  }, [fullRoster])

  useEffect(() => {
    if (selectedSector !== 'all' && !mySectors.includes(selectedSector)) {
      setSelectedSector('all')
    }
  }, [mySectors, selectedSector])

  // 2. Upcoming match events (unscoped query, filtered client-side to the user's own leva(s)).
  // events_all_coach today lets any coach read any event (pre-existing RLS gap, see US-032 plan),
  // so the UI must not rely on the DB to scope this list.
  const {
    data: allMatches = [],
    isLoading: isLoadingMatches,
    isError: isMatchesError,
    error: matchesError,
    refetch: refetchMatches
  } = useQuery({
    queryKey: ['callups-upcoming-matches'],
    queryFn: () => callUpService.getUpcomingMatchEvents()
  })

  const scopedMatches = useMemo(() => {
    if (mySectors.length === 0) return []
    return allMatches.filter(e => e.team_sector && mySectors.includes(e.team_sector))
  }, [allMatches, mySectors])

  const filteredMatches = useMemo(() => {
    if (selectedSector === 'all') return scopedMatches
    return scopedMatches.filter(e => e.team_sector === selectedSector)
  }, [scopedMatches, selectedSector])

  // Keep the selected match valid as filters/data change; default to the first upcoming match.
  useEffect(() => {
    if (filteredMatches.length === 0) {
      if (selectedEventId !== null) setSelectedEventId(null)
      return
    }
    if (!selectedEventId || !filteredMatches.some(e => e.id === selectedEventId)) {
      setSelectedEventId(filteredMatches[0].id)
    }
  }, [filteredMatches, selectedEventId])

  const selectedEvent = useMemo<EventRow | null>(
    () => filteredMatches.find(e => e.id === selectedEventId) ?? null,
    [filteredMatches, selectedEventId]
  )

  // 3. Roster for the selected event's sector.
  const {
    data: eventRoster = [],
    isLoading: isLoadingRoster,
    isError: isRosterError,
    error: rosterError,
    refetch: refetchRoster
  } = useQuery({
    queryKey: ['callups-event-roster', selectedSeasonId, selectedEvent?.team_sector],
    queryFn: () => attendanceService.getRosterForAttendance(selectedSeasonId!, selectedEvent!.team_sector!),
    enabled: !!selectedSeasonId && !!selectedEvent?.team_sector
  })

  // 4. Existing call-ups for the selected event.
  const {
    data: callUps = [],
    isLoading: isLoadingCallUps
  } = useQuery({
    queryKey: ['callups-for-event', selectedEvent?.id],
    queryFn: () => callUpService.getCallUpsForEvent(selectedEvent!.id),
    enabled: !!selectedEvent?.id,
    placeholderData: keepPreviousData
  })

  const calledUpIds = useMemo(() => new Set(callUps.map(c => c.player_id)), [callUps])

  // Derived lifecycle state: bozza / pubblicata / bloccata.
  const isPublished = !!selectedEvent?.call_up_published_at
  const isLocked = useMemo(() => {
    if (!selectedEvent?.meetup_time) return false
    return new Date(selectedEvent.meetup_time).getTime() <= Date.now()
  }, [selectedEvent])

  // 5. Toggle a single player's call-up status (optimistic).
  const toggleMutation = useMutation({
    mutationFn: ({ playerId, isCalledUp }: { playerId: string; isCalledUp: boolean }) =>
      callUpService.toggleCallUp(selectedEvent!.id, playerId, isCalledUp, profile?.id),
    onMutate: async ({ playerId, isCalledUp }) => {
      setJustSetPlayerId(playerId)
      const key = ['callups-for-event', selectedEvent?.id]
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<CallUp[]>(key) || []
      const next = isCalledUp
        ? [
            ...previous,
            {
              id: 'temp-id',
              event_id: selectedEvent!.id,
              player_id: playerId,
              created_by: profile?.id || null,
              created_at: new Date().toISOString()
            }
          ]
        : previous.filter(c => c.player_id !== playerId)

      queryClient.setQueryData(key, next)
      return { previous, key }
    },
    onError: (_err, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      setJustSetPlayerId(null)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['callups-for-event', selectedEvent?.id] })
      const player = eventRoster.find(p => p.id === variables.playerId)
      const label = player ? `${player.first_name} ${player.last_name}` : 'Atleta'
      showToast(variables.isCalledUp ? `${label} convocato` : `${label} rimosso dai convocati`)
      setTimeout(() => setJustSetPlayerId(null), 350)
    }
  })

  // 6. Publish / unpublish the call-up list.
  const publishMutation = useMutation({
    mutationFn: () => callUpService.publishCallUps(selectedEvent!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callups-upcoming-matches'] })
      showToast('Convocazione pubblicata')
    }
  })

  const unpublishMutation = useMutation({
    mutationFn: () => callUpService.unpublishCallUps(selectedEvent!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callups-upcoming-matches'] })
      showToast('Convocazione ritirata: torna in bozza')
    }
  })

  // Counters
  const stats = useMemo(() => {
    const total = eventRoster.length
    const called = eventRoster.filter(p => calledUpIds.has(p.id)).length
    const notCalled = total - called
    return { total, called, notCalled }
  }, [eventRoster, calledUpIds])

  const roleLabel = useMemo(() => {
    if (profile?.role === 'president') return 'Presidente · tutte le leve'
    if (profile?.role === 'director') return 'Direttore · tutte le leve'
    if (profile?.role === 'coach') return 'Allenatore · gestione convocazioni'
    return 'Gestione convocazioni'
  }, [profile])

  const crestInitials = (name?: string | null) => (name ? name.slice(0, 3).toUpperCase() : '???')

  const formatMatchDate = (dateStr: string) => {
    const label = format(parseISO(dateStr), 'EEE d MMM', { locale: it })
    return label.replace(/(^\w)/, m => m.toUpperCase())
  }

  const formatFullDate = (dateStr: string) => {
    const label = format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: it })
    return label.replace(/(^\w|\s\w)/g, m => m.toUpperCase())
  }

  const formatTime = (dateStr: string) => format(parseISO(dateStr), 'HH:mm')

  const isNoSectorAssigned = !isLoadingSectors && mySectors.length === 0
  const isMatchesEmpty = !isLoadingMatches && !isMatchesError && filteredMatches.length === 0 && !isNoSectorAssigned
  const isEventRosterEmpty = !isLoadingRoster && !isRosterError && eventRoster.length === 0

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-lg mx-auto pb-28">
      <style>{`
        @keyframes callup-pop {
          0% { transform: scale(1); }
          45% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .callup-toggle-animation {
          transition: all 0.15s cubic-bezier(0.3, 0.9, 0.4, 1.3);
        }
        .callup-toggle-animation:active:not(:disabled) {
          transform: scale(0.92);
        }
        .callup-toggle-animation.just-set {
          animation: callup-pop 0.32s cubic-bezier(0.3, 1.4, 0.4, 1);
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/20">
              <ClipboardList className="w-6 h-6 text-brand-accent" />
            </span>
            Convocazioni
          </h1>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
            {selectedEvent?.team_sector || (mySectors.length === 1 ? mySectors[0] : roleLabel)}
          </span>
        </div>
      </div>

      {/* Team Sector Chips */}
      {mySectors.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
          <button
            type="button"
            onClick={() => setSelectedSector('all')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none whitespace-nowrap',
              selectedSector === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-[var(--surface-05)] border-[var(--border-soft)] text-muted-foreground hover:bg-[var(--surface-05)]'
            )}
          >
            Tutte
          </button>
          {mySectors.map(sec => (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSector(sec)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none whitespace-nowrap',
                selectedSector === sec
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-[var(--surface-05)] border-[var(--border-soft)] text-muted-foreground hover:bg-[var(--surface-05)]'
              )}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      {/* Match picker */}
      {isMatchesError ? (
        <div className="glass-card rounded-2xl border-black/5 dark:border-white/10">
          <QueryErrorState error={matchesError} onRetry={() => refetchMatches()} />
        </div>
      ) : isNoSectorAssigned ? (
        <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-05)] border border-[var(--border-soft)] flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <UserX className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-foreground">Nessuna leva assegnata</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Non risultano atleti attivi nella tua leva per questa stagione sportiva. Contatta il presidente o il direttore per l'assegnazione.
          </p>
        </div>
      ) : isLoadingMatches || isLoadingSectors ? (
        <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`match-sk-${i}`}
              className="w-40 h-20 flex-shrink-0 rounded-2xl bg-[var(--surface-05)] border border-[var(--border-soft)] animate-pulse"
            />
          ))}
        </div>
      ) : isMatchesEmpty ? (
        <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-05)] border border-[var(--border-soft)] flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <CalendarX2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-foreground">Nessuna partita in programma</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Non ci sono partite future per la leva selezionata. Crea un nuovo evento di tipo partita dal calendario.
          </p>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
          {filteredMatches.map(match => {
            const isHome = match.event_type === 'home_match'
            const isActive = match.id === selectedEventId
            return (
              <button
                key={match.id}
                type="button"
                onClick={() => setSelectedEventId(match.id)}
                className={cn(
                  'flex-shrink-0 w-40 rounded-2xl border p-3 flex flex-col gap-2 text-left transition-all cursor-pointer',
                  isActive
                    ? 'bg-brand-accent/15 border-brand-accent shadow-sm'
                    : 'bg-[var(--surface-05)] border-[var(--border-soft)] hover:bg-[var(--surface-05)]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest',
                    isHome ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                  )}
                >
                  {isHome ? <Home className="w-2.5 h-2.5" /> : <Plane className="w-2.5 h-2.5" />}
                  {isHome ? 'Casa' : 'Trasferta'}
                </span>
                <span className="text-sm font-black text-foreground leading-tight truncate">
                  vs {match.opponent || 'Avversario'}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {formatMatchDate(match.start_date)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Event hero card */}
      {selectedEvent && (
        <div
          className={cn(
            'rounded-[2rem] p-4 flex flex-col gap-3.5 border transition-colors',
            isLocked ? 'bg-[var(--surface-05)] border-[var(--rose)]/30' : 'glass-card border-black/5 dark:border-white/10'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-05)] border border-[var(--border-soft)] flex items-center justify-center font-mono text-xs font-black text-muted-foreground flex-shrink-0">
                {crestInitials(selectedEvent.opponent)}
              </div>
              <div className="min-w-0">
                <b className="block text-sm font-black italic uppercase tracking-tight text-foreground truncate">
                  vs {selectedEvent.opponent || 'Avversario'}
                </b>
                <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                  {selectedEvent.description || selectedEvent.team_sector || 'Partita ufficiale'}
                </span>
              </div>
            </div>

            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--rose)]/10 border border-[var(--rose)]/30 text-[var(--rose)]">
                <Lock className="w-3 h-3" />
                Bloccata
              </span>
            ) : isPublished ? (
              <span className="inline-flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                Pubblicata
              </span>
            ) : (
              <Badge tone="neutral" icon={<PenLine className="w-3 h-3" />} className="px-2.5 py-1.5 text-[9px]">
                Bozza
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80 pl-0.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--gold)] flex-shrink-0" />
            {formatFullDate(selectedEvent.start_date)}
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-black/10 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[var(--gold)]">
                <Clock className="w-2.5 h-2.5" />
                Ritrovo
              </span>
              <b className="font-mono text-lg font-bold text-foreground leading-none">
                {selectedEvent.meetup_time ? formatTime(selectedEvent.meetup_time) : '—'}
              </b>
            </div>
            <div className="text-muted-foreground/40 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0 text-right">
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                Inizio gara
                <Flag className="w-2.5 h-2.5" />
              </span>
              <b className="font-mono text-lg font-bold text-foreground leading-none">
                {formatTime(selectedEvent.start_date)}
              </b>
            </div>
          </div>

          {isPublished && (
            <div className="flex items-center justify-between gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/25 text-emerald-500">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0',
                    !isLocked && 'animate-pulse'
                  )}
                />
                {isLocked ? 'Visibile ai giocatori' : 'Modifiche live per i giocatori'}
              </span>
              <button
                type="button"
                disabled={isLocked || unpublishMutation.isPending}
                onClick={() => unpublishMutation.mutate()}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border-[1.5px] text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer',
                  isLocked
                    ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                    : 'border-border text-muted-foreground hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/10 active:scale-95'
                )}
              >
                <Undo2 className="w-3.5 h-3.5" />
                Ritira pubblicazione
              </button>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-[var(--rose)]/10 border border-[var(--rose)]/25">
              <div className="w-8 h-8 rounded-full bg-[var(--rose)]/15 text-[var(--rose)] flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-xs font-bold text-[var(--rose)]">Convocazione bloccata</b>
                <span className="block text-[11px] font-semibold text-[var(--rose)]/85 leading-snug">
                  {isPublished
                    ? <>Il ritrovo delle {selectedEvent.meetup_time ? formatTime(selectedEvent.meetup_time) : '--:--'} è già iniziato: la lista non è più modificabile.</>
                    : <>Il ritrovo è passato senza mai pubblicare la convocazione: i giocatori non l'hanno vista.</>}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Counter card */}
      {selectedEvent && !isEventRosterEmpty && !isRosterError && (
        <div className="glass-card rounded-2xl p-5 border-black/5 dark:border-white/10 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <b className="text-xl font-black text-emerald-500 tracking-tight">{stats.called}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Convocati</span>
            </div>
            <div className="flex flex-col items-center border-l border-[var(--border-soft)]">
              <b className="text-xl font-black text-foreground/70 tracking-tight">{stats.notCalled}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Non conv.</span>
            </div>
            <div className="flex flex-col items-center border-l border-[var(--border-soft)]">
              <b className="text-xl font-black text-foreground tracking-tight">{stats.total}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Rosa</span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden flex">
            {stats.total > 0 && (
              <>
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(stats.called / stats.total) * 100}%` }}
                />
                <div
                  className="bg-black/20 dark:bg-white/10 h-full transition-all duration-300"
                  style={{ width: `${(stats.notCalled / stats.total) * 100}%` }}
                />
              </>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground font-medium text-center">
            <b>{stats.called}</b> convocati su <b>{stats.total}</b> atleti della rosa.
          </p>
        </div>
      )}

      {/* Roster list */}
      {selectedEvent && (
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <span>Rosa {selectedEvent.team_sector || ''}</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Convocato
            </span>
          </div>

          {isRosterError ? (
            <div className="glass-card rounded-2xl border-black/5 dark:border-white/10">
              <QueryErrorState error={rosterError} onRetry={() => refetchRoster()} />
            </div>
          ) : (isLoadingRoster || isLoadingCallUps) && eventRoster.length === 0 ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`roster-sk-${i}`} className="flex items-center gap-3 p-3 bg-[var(--surface-05)] border border-[var(--border-soft)] rounded-2xl animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-05)] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="h-4 bg-[var(--surface-05)] rounded-md w-3/5" />
                    <div className="h-3 bg-[var(--surface-05)] rounded-md w-1/3" />
                  </div>
                  <div className="w-24 h-8 rounded-full bg-[var(--surface-05)] flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : isEventRosterEmpty ? (
            <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-05)] border border-[var(--border-soft)] flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-foreground">Nessun atleta in rosa</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Non sono presenti atleti attivi nella leva di questa partita.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {eventRoster.map((player: PlayerRosterItem, idx: number) => {
                const called = calledUpIds.has(player.id)
                const isBusy = toggleMutation.isPending && justSetPlayerId === player.id

                return (
                  <div
                    key={player.id}
                    className={cn(
                      'flex items-center gap-3 p-3 bg-[var(--surface-05)] border border-[var(--border-soft)] hover:border-[var(--border-soft)] rounded-2xl transition-all duration-300',
                      called && 'bg-[var(--surface-05)] border-[var(--border-soft)]',
                      isLocked && 'opacity-55'
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center font-mono text-xs font-black text-brand-accent/80 flex-shrink-0 select-none">
                      {player.figc_registration
                        ? player.figc_registration.substring(player.figc_registration.length - 2)
                        : String(idx + 1).padStart(2, '0')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground block truncate leading-tight">
                        {player.last_name} {player.first_name}
                      </span>
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block mt-0.5 leading-none">
                        {player.team_sector || 'Nessun settore'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isLocked || isBusy}
                      onClick={() => toggleMutation.mutate({ playerId: player.id, isCalledUp: !called })}
                      className={cn(
                        'callup-toggle-animation flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full border-[1.5px] text-[10px] font-black uppercase tracking-wider flex-shrink-0',
                        called
                          ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                          : 'bg-[var(--surface-05)] border-[var(--border-soft)] text-muted-foreground/60 hover:text-foreground hover:border-[var(--border-strong)]',
                        isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                        justSetPlayerId === player.id && 'just-set'
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0',
                          called ? 'border-black bg-black text-emerald-500' : 'border-current'
                        )}
                      >
                        {called ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </span>
                      {called ? 'Convocato' : 'Convoca'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Publish bar (draft only) */}
      {selectedEvent && !isPublished && !isLocked && eventRoster.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40">
          <button
            type="button"
            disabled={stats.called === 0 || publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
            className={cn(
              'w-full h-14 rounded-full flex items-center justify-center gap-2.5 text-sm font-black uppercase tracking-wider text-white shadow-2xl shadow-brand-accent/40 transition-transform active:scale-[0.98]',
              stats.called === 0 || publishMutation.isPending
                ? 'bg-brand-accent/40 cursor-not-allowed'
                : 'bg-brand-accent hover:bg-brand-accent/90 cursor-pointer'
            )}
          >
            <Send className="w-4 h-4" />
            Pubblica convocazione
            <span className="font-mono bg-white/20 px-2.5 py-0.5 rounded-full text-xs">{stats.called}</span>
          </button>
        </div>
      )}

      {/* Floating Save Toast */}
      <div
        className={cn(
          'fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400 z-50 pointer-events-none transition-all duration-300 transform',
          toastMessage ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'
        )}
      >
        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
        {toastMessage}
      </div>
    </div>
  )
}

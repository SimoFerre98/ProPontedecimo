import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { format, addDays, subDays, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns'
import { it } from 'date-fns/locale/it'
import { 
  CalendarCheck, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Users,
  CheckCircle2, 
  XCircle, 
  FileText, 
  UserX
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { attendanceService, type AttendanceStatus, type AttendanceRecord } from '@/services/attendanceService'

export default function Attendance() {
  const { profile } = useAuth()
  const { selectedSeasonId } = useAppStore()
  const queryClient = useQueryClient()

  // Date state: defaults to today's date formatted as YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [selectedSector, setSelectedSector] = useState('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [justSetPlayerId, setJustSetPlayerId] = useState<string | null>(null)

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  // 1. Fetch complete active roster for this season.
  // RLS automatically limits results to the coach's assigned sectors.
  const { data: completeRoster = [], isLoading: isLoadingRoster } = useQuery({
    queryKey: ['attendance-complete-roster', selectedSeasonId],
    queryFn: () => attendanceService.getRosterForAttendance(selectedSeasonId!),
    enabled: !!selectedSeasonId
  })

  // Extract unique sectors from the roster to build the filter chips
  const sectors = useMemo(() => {
    const unique = new Set(completeRoster.map(p => p.team_sector).filter(Boolean))
    return Array.from(unique) as string[]
  }, [completeRoster])

  // Reset selected sector if it is no longer available in the active roster
  useEffect(() => {
    if (selectedSector !== 'all' && !sectors.includes(selectedSector)) {
      setSelectedSector('all')
    }
  }, [sectors, selectedSector])

  // Filter roster by selected sector
  const filteredRoster = useMemo(() => {
    if (selectedSector === 'all') return completeRoster
    return completeRoster.filter(p => p.team_sector === selectedSector)
  }, [completeRoster, selectedSector])

  // Extract filtered player IDs to query attendance records
  const filteredPlayerIds = useMemo(() => {
    return filteredRoster.map(p => p.id)
  }, [filteredRoster])

  // 2. Fetch attendance records for the roster on the selected date
  const { data: attendanceRecords = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['attendance-records', selectedSeasonId, selectedDate],
    queryFn: () => attendanceService.getAttendanceForDate(completeRoster.map(p => p.id), selectedDate),
    enabled: completeRoster.length > 0,
    placeholderData: keepPreviousData
  })

  // Map attendance status per player ID for O(1) lookups
  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {}
    attendanceRecords.forEach(rec => {
      map[rec.player_id] = rec
    })
    return map
  }, [attendanceRecords])

  // 3. Optimistic Mutation to set/update attendance status
  const mutation = useMutation({
    mutationFn: ({ playerId, status }: { playerId: string; status: AttendanceStatus }) =>
      attendanceService.setAttendanceStatus(playerId, selectedDate, status, profile?.id),
    onMutate: async ({ playerId, status }) => {
      setJustSetPlayerId(playerId)
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['attendance-records', selectedSeasonId, selectedDate] })

      // Snapshot the previous value
      const previousRecords = queryClient.getQueryData<AttendanceRecord[]>(['attendance-records', selectedSeasonId, selectedDate]) || []

      // Optimistically update the list
      const newRecords = [...previousRecords]
      const idx = newRecords.findIndex(r => r.player_id === playerId)
      if (idx > -1) {
        newRecords[idx] = { ...newRecords[idx], status }
      } else {
        newRecords.push({
          id: 'temp-id',
          player_id: playerId,
          session_date: selectedDate,
          status,
          type: 'training',
          created_by: profile?.id || null,
          created_at: new Date().toISOString(),
          notes: null
        })
      }

      queryClient.setQueryData(['attendance-records', selectedSeasonId, selectedDate], newRecords)

      return { previousRecords }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['attendance-records', selectedSeasonId, selectedDate], context?.previousRecords)
      setJustSetPlayerId(null)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', selectedSeasonId, selectedDate] })
      setToastMessage("Presenza aggiornata")
      
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }

      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null)
        setJustSetPlayerId(null)
        toastTimerRef.current = null
      }, 1400)
    }
  })

  // Date calculations
  const parsedDate = useMemo(() => parseISO(selectedDate), [selectedDate])

  const formattedDateLabel = useMemo(() => {
    const formatted = format(parsedDate, 'eee d MMMM', { locale: it })
    // Capitalize first letter of day and month
    return formatted.replace(/(^\w|\s\w)/g, m => m.toUpperCase())
  }, [parsedDate])

  const relativeDateText = useMemo(() => {
    if (isToday(parsedDate)) return 'Oggi · allenamento'
    if (isYesterday(parsedDate)) return 'Ieri · allenamento'
    if (isTomorrow(parsedDate)) return 'Domani · allenamento'
    return 'Allenamento'
  }, [parsedDate])

  const handleDayStep = (direction: 'back' | 'forward') => {
    const newDate = direction === 'back' ? subDays(parsedDate, 1) : addDays(parsedDate, 1)
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
  }

  // Attendance stats for the filtered list
  const stats = useMemo(() => {
    const total = filteredRoster.length
    let present = 0
    let absent = 0
    let justified = 0

    filteredRoster.forEach(p => {
      const rec = attendanceMap[p.id]
      if (rec) {
        if (rec.status === 'present') present++
        else if (rec.status === 'absent') absent++
        else if (rec.status === 'justified') justified++
      }
    })

    const unmarked = total - present - absent - justified

    return { total, present, absent, justified, unmarked }
  }, [filteredRoster, attendanceMap])

  // Render role indicator
  const roleLabel = useMemo(() => {
    if (profile?.role === 'president') return 'Presidente · tutte le leve'
    if (profile?.role === 'director') return 'Direttore · tutte le leve'
    if (profile?.role === 'coach') return 'Allenatore · registro presenze'
    return 'Registro presenze'
  }, [profile])

  const isRosterEmpty = completeRoster.length === 0
  const isFilteredRosterEmpty = filteredRoster.length === 0
  const isLoading = isLoadingRoster || (isLoadingRecords && completeRoster.length > 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-lg mx-auto pb-12">
      <style>{`
        @keyframes pop {
          0% { transform: scale(1); }
          45% { transform: scale(1.22); }
          100% { transform: scale(1); }
        }
        .status-btn-animation {
          transition: all 0.2s cubic-bezier(0.3, 0.9, 0.4, 1.3);
        }
        .status-btn-animation:active {
          transform: scale(0.85);
        }
        .status-btn-animation.just-set {
          animation: pop 0.32s cubic-bezier(0.3, 1.4, 0.4, 1);
        }
      `}</style>

      {/* Header and Eyebrow */}
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <CalendarCheck className="w-6 h-6 text-primary" />
            </span>
            Presenze
          </h1>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
            {isRosterEmpty ? roleLabel : sectors.length === 1 ? sectors[0] : roleLabel}
          </span>
        </div>
      </div>

      {/* Team Sector Chips */}
      {sectors.length > 1 && !isRosterEmpty && (
        <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
          <button
            type="button"
            onClick={() => setSelectedSector('all')}
            className={cn(
              "px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5",
              selectedSector === 'all'
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
            )}
          >
            Tutte
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              selectedSector === 'all' ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"
            )}>
              {completeRoster.length}
            </span>
          </button>
          {sectors.map(sec => {
            const count = completeRoster.filter(p => p.team_sector === sec).length
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSector(sec)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5",
                  selectedSector === sec
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                )}
              >
                {sec}
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  selectedSector === sec ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Date Stepper */}
      <div className="flex items-center justify-between bg-black/10 dark:bg-white/5 rounded-2xl p-2 border border-black/5 dark:border-white/5">
        <button
          onClick={() => handleDayStep('back')}
          className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground active:scale-95"
          aria-label="Giorno precedente"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="relative flex items-center justify-center flex-1 cursor-pointer group">
          <div className="flex items-center gap-2 text-center select-none py-1 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <Calendar className="w-4 h-4 text-primary" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-foreground tracking-tight leading-none">
                {formattedDateLabel}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {relativeDateText}
              </span>
            </div>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value)
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        <button
          onClick={() => handleDayStep('forward')}
          className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground active:scale-95"
          aria-label="Giorno successivo"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Stats and Segment Progress Bar */}
      {!isRosterEmpty && !isFilteredRosterEmpty && (
        <div className="glass-card rounded-2xl p-5 border-black/5 dark:border-white/10 flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col items-center">
              <b className="text-xl font-black text-emerald-500 tracking-tight">{stats.present}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Presenti</span>
            </div>
            <div className="flex flex-col items-center border-l border-white/5">
              <b className="text-xl font-black text-rose-500 tracking-tight">{stats.absent}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Assenti</span>
            </div>
            <div className="flex flex-col items-center border-l border-white/5">
              <b className="text-xl font-black text-amber-500 tracking-tight">{stats.justified}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Giustif.</span>
            </div>
            <div className="flex flex-col items-center border-l border-white/5">
              <b className="text-xl font-black text-foreground tracking-tight">{stats.total}</b>
              <span className="text-[10px] text-muted-foreground font-semibold">Totale</span>
            </div>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden flex">
            {stats.total > 0 && (
              <>
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${(stats.present / stats.total) * 100}%` }}
                />
                <div 
                  className="bg-rose-500 h-full transition-all duration-300" 
                  style={{ width: `${(stats.absent / stats.total) * 100}%` }}
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-300" 
                  style={{ width: `${(stats.justified / stats.total) * 100}%` }}
                />
                <div 
                  className="bg-black/20 dark:bg-white/10 h-full transition-all duration-300" 
                  style={{ width: `${(stats.unmarked / stats.total) * 100}%` }}
                />
              </>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground font-medium text-center">
            <b>{stats.present}</b> presenti · <b>{stats.absent}</b> assenti · <b>{stats.justified}</b> giustificat{stats.justified === 1 ? 'o' : 'i'}
            {stats.unmarked > 0 && (
              <> · <b>{stats.unmarked}</b> da segnare</>
            )}
            {" "}su un totale di <b>{stats.total}</b> atleti.
          </p>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <span>Rosa {selectedSector !== 'all' ? selectedSector : ''}</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />P</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />A</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />G</span>
          </div>
        </div>

        {/* Loading skeleton state */}
        {isLoading && completeRoster.length === 0 ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-4 bg-white/10 rounded-md w-3/5" />
                  <div className="h-3 bg-white/10 rounded-md w-1/3" />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : isRosterEmpty ? (
          /* Empty state - No players in season */
          <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <UserX className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-foreground">Nessun atleta in rosa</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Non sono presenti atleti attivi in questa stagione sportiva. Puoi importare atleti tramite il wizard o inserirne di nuovi.
            </p>
          </div>
        ) : isFilteredRosterEmpty ? (
          /* Empty state - No players in filtered sector */
          <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-foreground">Nessun atleta in questa leva</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Non sono presenti atleti attivi nella leva selezionata. Scegli un'altra leva o cambia filtri.
            </p>
          </div>
        ) : (
          /* Roster List */
          <div className="space-y-2.5">
            {filteredRoster.map((player, idx) => {
              const rec = attendanceMap[player.id]
              const currentStatus = rec?.status || null

              return (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300",
                    currentStatus && "bg-white/[0.04] border-white/10"
                  )}
                >
                  {/* Avatar / Index circle */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-xs font-black text-primary/80 flex-shrink-0 select-none">
                    {player.figc_registration 
                      ? player.figc_registration.substring(player.figc_registration.length - 2)
                      : String(idx + 1).padStart(2, '0')}
                  </div>

                  {/* Player Name and Team Sector */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-foreground block truncate leading-tight">
                      {player.last_name} {player.first_name}
                    </span>
                    <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block mt-0.5 leading-none">
                      {player.team_sector || 'Nessun settore'}
                    </span>
                  </div>

                  {/* Tri-state buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={mutation.isPending && justSetPlayerId === player.id}
                      onClick={() => mutation.mutate({ playerId: player.id, status: 'present' })}
                      className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center status-btn-animation cursor-pointer",
                        currentStatus === 'present'
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                          : "bg-white/5 border-white/10 text-muted-foreground/45 hover:text-emerald-500 hover:border-emerald-500/40",
                        justSetPlayerId === player.id && currentStatus === 'present' && "just-set"
                      )}
                      aria-label="Presente"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>

                    {/* Absent */}
                    <button
                      type="button"
                      disabled={mutation.isPending && justSetPlayerId === player.id}
                      onClick={() => mutation.mutate({ playerId: player.id, status: 'absent' })}
                      className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center status-btn-animation cursor-pointer",
                        currentStatus === 'absent'
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                          : "bg-white/5 border-white/10 text-muted-foreground/45 hover:text-rose-500 hover:border-rose-500/40",
                        justSetPlayerId === player.id && currentStatus === 'absent' && "just-set"
                      )}
                      aria-label="Assente"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>

                    {/* Justified */}
                    <button
                      type="button"
                      disabled={mutation.isPending && justSetPlayerId === player.id}
                      onClick={() => mutation.mutate({ playerId: player.id, status: 'justified' })}
                      className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center status-btn-animation cursor-pointer",
                        currentStatus === 'justified'
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                          : "bg-white/5 border-white/10 text-muted-foreground/45 hover:text-amber-500 hover:border-amber-500/40",
                        justSetPlayerId === player.id && currentStatus === 'justified' && "just-set"
                      )}
                      aria-label="Giustificato"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Save Toast Notice */}
      <div
        className={cn(
          "fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400 z-50 pointer-events-none transition-all duration-300 transform",
          toastMessage ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90"
        )}
      >
        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
        {toastMessage}
      </div>
    </div>
  )
}

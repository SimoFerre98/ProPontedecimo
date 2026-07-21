import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns/format'
import { it } from 'date-fns/locale/it'
import { Users, Cake, IdCard, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { medicalService, type SquadRosterMember } from '@/services/medicalService'
import MedicalStatusIndicator from '@/components/MedicalStatusIndicator'

export default function SquadraAtleti() {
  const { profile } = useAuth()
  const { selectedSeasonId } = useAppStore()

  const [selectedSector, setSelectedSector] = useState('all')

  // Unscoped roster fetch: RLS already limits this to the coach's own assigned
  // players (or everyone for president/director), same pattern as Convocazioni.tsx.
  const {
    data: roster = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['squad-athletes-roster', selectedSeasonId],
    queryFn: () => medicalService.getSquadRoster(selectedSeasonId!),
    enabled: !!selectedSeasonId
  })

  const mySectors = useMemo(() => {
    const unique = new Set(roster.map(p => p.team_sector).filter(Boolean))
    return Array.from(unique) as string[]
  }, [roster])

  useEffect(() => {
    if (selectedSector !== 'all' && !mySectors.includes(selectedSector)) {
      setSelectedSector('all')
    }
  }, [mySectors, selectedSector])

  const filteredRoster = useMemo(() => {
    if (selectedSector === 'all') return roster
    return roster.filter(p => p.team_sector === selectedSector)
  }, [roster, selectedSector])

  const roleLabel = useMemo(() => {
    if (profile?.role === 'president') return 'Presidente · tutte le leve'
    if (profile?.role === 'director') return 'Direttore · tutte le leve'
    if (profile?.role === 'coach') return 'Allenatore · la mia leva'
    return 'Anagrafica squadra'
  }, [profile])

  const isNoSectorAssigned = !isLoading && !isError && mySectors.length === 0
  const isRosterEmpty = !isLoading && !isError && !isNoSectorAssigned && filteredRoster.length === 0

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </span>
            Squadra
          </h1>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
            {mySectors.length === 1 ? mySectors[0] : roleLabel}
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
                : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
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
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
              )}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isError ? (
        <div className="glass-card rounded-2xl border-black/5 dark:border-white/10">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      ) : isNoSectorAssigned ? (
        <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <UserX className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-foreground">Nessuna leva assegnata</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Non risultano atleti attivi nella tua leva per questa stagione sportiva. Contatta il presidente o il direttore per l'assegnazione.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`squad-sk-${i}`} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-4 bg-white/10 rounded-md w-2/5" />
                <div className="h-3 bg-white/10 rounded-md w-3/5" />
              </div>
              <div className="w-20 h-6 rounded-full bg-white/10 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : isRosterEmpty ? (
        <div className="glass-card rounded-2xl p-10 text-center border-black/5 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-foreground">Nessun atleta in rosa</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Non sono presenti atleti attivi nella leva selezionata per questa stagione sportiva.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRoster.map((player: SquadRosterMember) => (
            <SquadraAtletaCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </div>
  )
}

function SquadraAtletaCard({ player }: Readonly<{ player: SquadRosterMember }>) {
  const status = medicalService.calculateStatus(player.medical_expiry)

  const initials = `${player.first_name?.[0] ?? ''}${player.last_name?.[0] ?? ''}`.toUpperCase()

  const formattedBirthDate = player.birth_date
    ? format(new Date(player.birth_date), 'd MMMM yyyy', { locale: it })
    : null

  return (
    <div className="glass-card rounded-2xl p-4 border-black/5 dark:border-white/10 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-sm font-black text-primary/80 flex-shrink-0 select-none">
            {initials || '??'}
          </div>
          <div className="min-w-0">
            <b className="block text-sm font-black text-foreground truncate leading-tight">
              {player.last_name} {player.first_name}
            </b>
            {player.team_sector && (
              <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block mt-0.5 leading-none">
                {player.team_sector}
              </span>
            )}
          </div>
        </div>
        <MedicalStatusIndicator status={status} expiry={player.medical_expiry} />
      </div>

      <div className="flex items-center gap-4 px-0.5 text-[11px] font-semibold text-muted-foreground/80">
        <span className="flex items-center gap-1.5">
          <Cake className="w-3.5 h-3.5 text-muted-foreground/50" />
          {formattedBirthDate ?? 'Data di nascita non disponibile'}
        </span>
        <span className="flex items-center gap-1.5">
          <IdCard className="w-3.5 h-3.5 text-muted-foreground/50" />
          {player.figc_registration || 'Tessera non disponibile'}
        </span>
      </div>
    </div>
  )
}

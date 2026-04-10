import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserPlus, 
  Filter, 
  User, 
  Calendar, 
  Smartphone,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Users,
  Activity,
  X,
  SortAsc,
  SortDesc,
  ClipboardCheck,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { athleteService, type Player } from '@/services/athleteService'
import { FilterToolbar } from '@/components/ui/FilterToolbar'
import AddAthleteModal from '@/components/modals/AddAthleteModal'
import { Pagination } from '@/components/ui/Pagination'

type FiltersState = {
  isActive: 'all' | 'active' | 'inactive'
  isRegistered: 'all' | 'yes' | 'no'
  medicalStatus: 'all' | 'expired' | 'valid' | 'missing'
  sortBy: 'last_name' | 'created_at' | 'medical_expiry'
  sortDir: 'asc' | 'desc'
}

const DEFAULT_FILTERS: FiltersState = {
  isActive: 'all',
  isRegistered: 'all',
  medicalStatus: 'all',
  sortBy: 'last_name',
  sortDir: 'asc',
}

function activeFilterCount(f: FiltersState) {
  let c = 0
  if (f.isActive !== 'all') c++
  if (f.isRegistered !== 'all') c++
  if (f.medicalStatus !== 'all') c++
  if (f.sortBy !== 'last_name' || f.sortDir !== 'asc') c++
  return c
}

export default function Athletes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 12
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FiltersState>(DEFAULT_FILTERS)

  const { data, isLoading } = useQuery({
    queryKey: ['players', search, sectorFilter, page, filters],
    queryFn: () => athleteService.getPlayers(search, sectorFilter, page, pageSize, filters as any),
  })

  const players = data?.data || []
  const totalCount = data?.count || 0

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => athleteService.getUniqueSectors(),
  })
  
  const availableSectors = sectorsData || []
  const filterSectors = ['all', ...availableSectors]

  const filterCount = activeFilterCount(filters)

  function applyFilters() {
    setFilters(pendingFilters)
    setPage(0)
    setShowFilters(false)
  }

  function resetFilters() {
    setPendingFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setPage(0)
  }

  function setPending<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setPendingFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
            <TrendingUp className="w-4 h-4" />
            <span>Database Atleti</span>
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tight italic uppercase">
            Anagrafica <span className="text-primary NOT-italic">Atleti</span>
          </h1>
          <p className="text-muted-foreground font-medium border-l-2 border-primary/30 pl-4 max-w-xl">
            Gestione centralizzata di tutti gli atleti della Pro Pontedecimo. Monitora stato, tesseramenti e scadenze.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Totale Atleti</span>
            <span className="text-2xl font-black text-foreground">{totalCount || 0}</span>
          </div>
          <Button 
            onClick={() => {
              setSelectedPlayer(null)
              setIsModalOpen(true)
            }}
            className="pill bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5 transition-transform group-hover:rotate-12" /> 
            Nuovo Atleta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'In Rosa', 
            val: players?.filter(p => p.is_active).length || 0, 
            icon: Users, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-500/10',
            hint: 'Atleti attualmente in squadra'
          },
          { 
            label: 'Tesserati FIGC', 
            val: players?.filter(p => p.is_registered).length || 0, 
            icon: ClipboardCheck, 
            color: 'text-blue-500', 
            bg: 'bg-blue-500/10',
            hint: 'Atleti con tessera federale'
          },
          { 
            label: 'Settori', 
            val: availableSectors.length, 
            icon: ShieldCheck, 
            color: 'text-primary', 
            bg: 'bg-primary/10',
            hint: 'Leve/squadre attive'
          },
          { 
            label: 'Visite Scadute', 
            val: players?.filter(p => p.medical_expiry && new Date(p.medical_expiry) < new Date()).length || 0, 
            icon: Activity, 
            color: 'text-amber-500', 
            bg: 'bg-amber-500/10', 
            link: '/visite',
            hint: 'Certificati medici da rinnovare'
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            onClick={() => stat.link && navigate(stat.link)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            title={stat.hint}
            className={cn(
              "glass-card p-5 flex items-center justify-between border-black/5 dark:border-white/5 group hover:border-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-all",
              stat.link && "cursor-pointer active:scale-95"
            )}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-foreground">{stat.val}</p>
            </div>
            <div className={cn("w-12 h-12 pill flex items-center justify-center shadow-inner transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar + Filter Button */}
      <div className="flex flex-col lg:flex-row w-full items-stretch lg:items-center gap-2">
        <FilterToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(0)
          }}
          searchPlaceholder="Cerca per nome, cognome o codice fiscale..."
          sectors={filterSectors}
          activeSector={sectorFilter}
          onSectorChange={(sector) => {
            setSectorFilter(sector)
            setPage(0)
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <Button
          variant="outline"
          onClick={() => { setShowFilters(!showFilters); setPendingFilters(filters) }}
          className={cn(
            "pill h-14 px-5 shrink-0 gap-2 border transition-all font-black uppercase tracking-widest text-[10px] w-full lg:w-auto justify-center",
            filterCount > 0
              ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-black/10 dark:border-white/10 hover:border-primary"
          )}
        >
          <Filter className="w-4 h-4" />
          Filtri
          {filterCount > 0 && (
            <span className="bg-primary text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="glass-card border border-primary/20 rounded-[2rem] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-widest text-foreground">Filtri Avanzati</p>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 pill hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stato in Rosa */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Stato Squadra</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['all', 'Tutti'],
                      ['active', '🟢 In Rosa'],
                      ['inactive', '⚫ Ritirati'],
                    ] as [FiltersState['isActive'], string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setPending('isActive', val)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border",
                          pendingFilters.isActive === val
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tesseramento */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Tesseramento FIGC</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['all', 'Tutti'],
                      ['yes', '✅ Tesserati'],
                      ['no', '⚠️ Non Tesserati'],
                    ] as [FiltersState['isRegistered'], string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setPending('isRegistered', val)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border",
                          pendingFilters.isRegistered === val
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visita Medica */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Visita Medica</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['all', 'Tutte'],
                      ['valid', '✅ Valida'],
                      ['expired', '🔴 Scaduta'],
                      ['missing', '❓ Mancante'],
                    ] as [FiltersState['medicalStatus'], string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setPending('medicalStatus', val)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border",
                          pendingFilters.medicalStatus === val
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ordinamento */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Ordina Per</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['last_name', 'Cognome A→Z'],
                      ['created_at', 'Ultimi Iscritti'],
                      ['medical_expiry', 'Scadenza Medica'],
                    ] as [FiltersState['sortBy'], string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => {
                          if (pendingFilters.sortBy === val) {
                            setPending('sortDir', pendingFilters.sortDir === 'asc' ? 'desc' : 'asc')
                          } else {
                            setPendingFilters(prev => ({ ...prev, sortBy: val, sortDir: val === 'created_at' ? 'desc' : 'asc' }))
                          }
                        }}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between gap-2",
                          pendingFilters.sortBy === val
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <span>{lbl}</span>
                        {pendingFilters.sortBy === val && (
                          pendingFilters.sortDir === 'asc'
                            ? <SortAsc className="w-3.5 h-3.5 opacity-80" />
                            : <SortDesc className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={resetFilters}
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Azzera filtri
                </button>
                <Button
                  onClick={applyFilters}
                  className="pill bg-primary hover:bg-primary/90 text-white gap-2 h-10 px-6 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
                >
                  Applica Filtri
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chips */}
      {filterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtri attivi:</span>
          {filters.isActive !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">
              {filters.isActive === 'active' ? 'In Rosa' : 'Ritirati'}
              <button onClick={() => { setFilters(f => ({ ...f, isActive: 'all' })); setPage(0) }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.isRegistered !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">
              {filters.isRegistered === 'yes' ? 'Tesserati' : 'Non Tesserati'}
              <button onClick={() => { setFilters(f => ({ ...f, isRegistered: 'all' })); setPage(0) }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.medicalStatus !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">
              Medica: {filters.medicalStatus === 'expired' ? 'Scaduta' : filters.medicalStatus === 'valid' ? 'Valida' : 'Mancante'}
              <button onClick={() => { setFilters(f => ({ ...f, medicalStatus: 'all' })); setPage(0) }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {(filters.sortBy !== 'last_name' || filters.sortDir !== 'asc') && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">
              {filters.sortBy === 'created_at' ? 'Ultimi Iscritti' : filters.sortBy === 'medical_expiry' ? 'Scadenza Medica' : 'Cognome'} {filters.sortDir === 'desc' ? '↓' : '↑'}
              <button onClick={() => { setFilters(f => ({ ...f, sortBy: 'last_name', sortDir: 'asc' })); setPage(0) }}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Main List Grid/Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`athlete-skel-${i}`} className="glass-card p-8 h-64 animate-pulse bg-muted/20 border-black/5 dark:border-white/10 rounded-[2rem]" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="glass-card rounded-[2rem] p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 pill bg-muted/30 flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-black uppercase tracking-wider text-foreground">Nessun atleta trovato</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {filterCount > 0 ? 'Prova ad azzerare i filtri o cambiare i criteri di ricerca.' : 'Aggiungi il primo atleta con il pulsante in alto.'}
          </p>
          {filterCount > 0 && (
            <Button onClick={resetFilters} variant="outline" className="pill mt-2 h-10 px-6 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10">
              Azzera Filtri
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-card overflow-x-auto rounded-[2rem] border-black/5 dark:border-white/10 no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr className="border-b border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="p-6">Atleta</th>
                <th className="p-6">Settore</th>
                <th className="p-6">Contatto</th>
                <th className="p-6">Scadenza Medica</th>
                <th className="p-6">Stato Squadra</th>
                <th className="p-6">Tesserato</th>
                <th className="p-6 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {players?.map((player) => {
                  const isExpired = player.medical_expiry && new Date(player.medical_expiry) < new Date()
                  return (
                    <motion.tr
                      layout
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="group border-b border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner group-hover:scale-105 transition-transform">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-black text-sm uppercase italic group-hover:text-primary transition-colors">{player.last_name} <span className="text-primary NOT-italic">{player.first_name}</span></div>
                            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{player.birth_date || 'Data n.n.'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-bold uppercase tracking-wider">{player.team_sector || '-'}</span>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-bold tabular-nums">{player.phone_player || player.parent1_phone || '-'}</span>
                      </td>
                      <td className="p-6">
                        <span className={cn("text-xs font-bold tabular-nums", isExpired && "text-red-500 font-black")}>
                          {player.medical_expiry || '-'}
                          {isExpired && ' ⚠'}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className={cn(
                          "inline-flex px-3 py-1.5 rounded-xl items-center gap-2 border transition-all",
                          player.is_active 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        )}>
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {player.is_active ? 'In Rosa' : 'Ritirato'}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className={cn(
                          "inline-flex px-3 py-1.5 rounded-xl items-center gap-2 border transition-all",
                          player.is_registered
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}>
                          <ShieldCheck className="w-3 h-3" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {player.is_registered ? 'Tesserato' : 'Non Tess.'}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => {
                            setSelectedPlayer(player)
                            setIsModalOpen(true)
                          }}
                          className="text-primary hover:text-primary/80 transition-colors flex items-center justify-end gap-1.5 group/btn"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Dettagli</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {players?.map((player) => {
              const isExpired = player.medical_expiry && new Date(player.medical_expiry) < new Date()
              return (
                <motion.div
                  layout
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card p-6 flex flex-col gap-5 group hover:border-primary/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                  {/* Header */}
                  <div className="flex items-start justify-between relative">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner group-hover:scale-105 transition-transform">
                        <User className="w-7 h-7 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xl font-black text-foreground leading-tight tracking-tight uppercase italic group-hover:text-primary transition-colors">
                          {player.last_name} <span className="text-primary NOT-italic font-bold">{player.first_name}</span>
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {player.team_sector || 'Settore non specificato'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Nato il</span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{player.birth_date || '-'}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Smartphone className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Telefono</span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{player.phone_player || player.parent1_phone || '-'}</p>
                    </div>
                  </div>

                  {/* Scadenza medica se presente */}
                  {player.medical_expiry && (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border",
                      isExpired
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-muted/30 text-muted-foreground border-white/5"
                    )}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Medica: {player.medical_expiry}{isExpired ? ' — SCADUTA' : ''}</span>
                    </div>
                  )}

                  {/* Footer badges */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Stato squadra */}
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg flex items-center gap-1.5 border text-[9px] font-black uppercase tracking-widest",
                        player.is_active 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        <span>{player.is_active ? 'In Rosa' : 'Ritirato'}</span>
                      </div>
                      {/* Tesserato */}
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg flex items-center gap-1.5 border text-[9px] font-black uppercase tracking-widest",
                        player.is_registered
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      )}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>{player.is_registered ? 'Tesserato' : 'Non Tess.'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedPlayer(player)
                        setIsModalOpen(true)
                      }}
                      className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 group/btn"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Dettagli</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Pagination 
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        className="mt-8"
      />

      <AddAthleteModal 
        isOpen={isModalOpen}
        player={selectedPlayer}
        availableSectors={availableSectors}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPlayer(null)
        }}
        onSuccess={() => {
          setIsModalOpen(false)
          setSelectedPlayer(null)
        }}
      />
    </div>
  )
}

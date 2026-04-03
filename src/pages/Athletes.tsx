import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  UserPlus, 
  Filter, 
  MoreVertical, 
  User, 
  Calendar, 
  Smartphone,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Users,
  Award,
  LayoutGrid,
  List,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { athleteService, type Player } from '@/services/athleteService'
import AddAthleteModal from '@/components/modals/AddAthleteModal'
import { Pagination } from '@/components/ui/Pagination'

export default function Athletes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 12
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const { data, isLoading } = useQuery({
    queryKey: ['players', search, sectorFilter, page],
    queryFn: () => athleteService.getPlayers(search, sectorFilter, page, pageSize),
  })

  const players = data?.data || []
  const totalCount = data?.count || 0

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => athleteService.getUniqueSectors(),
  })
  
  const availableSectors = sectorsData || []
  const filterSectors = ['all', ...availableSectors]

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
            Anagrafica <span className="text-primary NOT-italic">Tesserati</span>
          </h1>
          <p className="text-muted-foreground font-medium border-l-2 border-primary/30 pl-4 max-w-xl">
            Gestione centralizzata di tutti gli atleti della Pro Pontedecimo. Monitora stato, contatti e scadenze.
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

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Attivi', val: players?.filter(p => p.is_active).length || 0, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Settori', val: availableSectors.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Visite Scadute', val: players?.filter(p => p.medical_expiry && new Date(p.medical_expiry) < new Date()).length || 0, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/visite' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            onClick={() => stat.link && navigate(stat.link)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "glass-card p-6 flex items-center justify-between border-black/5 dark:border-white/5 group hover:border-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-all",
              stat.link && "cursor-pointer active:scale-95"
            )}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-foreground">{stat.val}</p>
            </div>
            <div className={cn("w-14 h-14 pill flex items-center justify-center shadow-inner transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca calciatore..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0) // Reset to first page on search
              }}
              className="w-full h-16 pl-16 pr-8 text-xl pill glass-card border-2 border-black/5 dark:border-white/10 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            {filterSectors.map(sector => (
              <button
                key={sector}
                onClick={() => {
                  setSectorFilter(sector)
                  setPage(0) // Reset to first page on filter
                }}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                  sectorFilter === sector 
                    ? "bg-primary text-white border-primary glow-primary" 
                    : "bg-black/5 dark:bg-white/5 text-muted-foreground border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                {sector === 'all' ? 'Tutti' : sector}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/10 dark:border-white/10 h-14">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-3 rounded-xl transition-all h-full aspect-square flex items-center justify-center",
                viewMode === 'grid' ? "bg-white dark:bg-black/50 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-3 rounded-xl transition-all h-full aspect-square flex items-center justify-center",
                viewMode === 'table' ? "bg-white dark:bg-black/50 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <Button variant="outline" className="pill border-black/10 dark:border-white/10 hover:border-primary h-14 aspect-square p-0">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

      {/* Main List Grid/Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`athlete-skel-${i}`} className="glass-card p-8 h-64 animate-pulse bg-muted/20 border-black/5 dark:border-white/10 rounded-[2rem]" />
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-card overflow-x-auto rounded-[2rem] border-black/5 dark:border-white/10 no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr className="border-b border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="p-6">Atleta</th>
                <th className="p-6">Settore</th>
                <th className="p-6">Contatto</th>
                <th className="p-6">Scadenza Medica</th>
                <th className="p-6">Stato</th>
                <th className="p-6 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {players?.map((player) => {
                  const statusLabel = player.is_active ? 'Attivo' : 'Inattivo'
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
                        <span className="text-xs font-bold tabular-nums">{player.medical_expiry || '-'}</span>
                      </td>
                      <td className="p-6">
                        <div className={cn(
                          "inline-flex px-3 py-1.5 rounded-xl flex items-center gap-2 border transition-all",
                          player.is_active 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        )}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{statusLabel}</span>
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
              const statusLabel = player.is_active ? 'Attivo' : 'Inattivo'
              return (
                <motion.div
                  layout
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card p-6 flex flex-col gap-6 group hover:border-primary/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

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

                  <div className="grid grid-cols-2 gap-3 pt-2">
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

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                    <div className={cn(
                      "px-3 py-1.5 rounded-xl flex items-center gap-2 border transition-all",
                      player.is_active 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    )}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{statusLabel}</span>
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

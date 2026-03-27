import { useState } from 'react'
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
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { athleteService } from '@/services/athleteService'

export default function Athletes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')

  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: athleteService.getPlayers
  })

  const filteredPlayers = players?.filter(player => {
    const fullName = `${player.first_name} ${player.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase())
    const matchesSector = sectorFilter === 'all' || player.team_sector === sectorFilter
    return matchesSearch && matchesSector
  })

  // Get unique sectors for filter
  const sectors = ['all', ...Array.from(new Set(players?.map(p => p.team_sector).filter((s): s is string => !!s) || []))]

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
            <span className="text-2xl font-black text-foreground">{players?.length || 0}</span>
          </div>
          <Button className="pill bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 active:scale-95 transition-all">
            <UserPlus className="w-5 h-5 transition-transform group-hover:rotate-12" /> 
            Nuovo Atleta
          </Button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Attivi', val: players?.filter(p => p.is_active).length || 0, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Settori', val: sectors.length - 1, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Top Scorer', val: 'N/A', icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={`athlete-stat-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center justify-between border-white/5 group hover:border-primary/20 transition-all"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-foreground">{stat.val}</p>
            </div>
            <div className={cn("w-14 h-14 pill flex items-center justify-center shadow-inner", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cerca per nome, cognome o settore..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-16 pl-14 text-lg pill glass-card border-white/5 focus-visible:ring-primary shadow-2xl"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          <div className="flex items-center gap-2 p-1.5 glass-card rounded-2xl border-white/5">
            {sectors.map((sector) => (
              <button
                key={`selector-${sector}`}
                onClick={() => setSectorFilter(sector)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  sectorFilter === sector 
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {sector === 'all' ? 'Tutti i settori' : sector}
              </button>
            ))}
          </div>
          <Button variant="outline" className="pill border-white/10 hover:border-primary h-14 aspect-square p-0">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {new Array(6).fill(0).map((_, i) => (
            <div key={`athlete-skeleton-${i}`} className="glass-card p-8 h-64 animate-pulse bg-white/5 rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPlayers?.map((player) => {
              const status = player.is_active ? 'Attivo' : 'Inattivo'
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
                    <button className="p-2 pill hover:bg-white/10 text-muted-foreground/40 hover:text-primary transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
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
                      <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                    </div>
                    <button className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 group/btn">
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
    </div>
  )
}

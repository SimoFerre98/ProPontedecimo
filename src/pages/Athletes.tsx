import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { 
  Search, 
  Filter, 
  Plus, 
  User, 
  MoreVertical, 
  Smartphone, 
  MapPin,
  Mail,
  Calendar,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Player = {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
  birth_date: string | null
  phone_player: string | null
  email: string | null
  medical_expiry: string | null
  is_active: boolean
}

export default function Athletes() {
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState<string>('all')

  const { data: players, isLoading } = useQuery({
    queryKey: ['players', search, sectorFilter],
    queryFn: async () => {
      let query = supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true })

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      }
      
      if (sectorFilter !== 'all') {
        query = query.eq('team_sector', sectorFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Player[]
    }
  })

  const sectors = [...new Set(players?.map(p => p.team_sector).filter(Boolean))] as string[]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Anagrafica Atleti</h1>
          <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
            Gestisci gli iscritti, le scadenze e i settori della stagione.
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 pill bg-primary text-white font-bold shadow-lg glow-primary self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          Aggiungi Atleta
        </motion.button>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cerca per nome o cognome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 pill glass-card border-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSectorFilter('all')}
            className={cn(
              "px-5 py-2.5 pill text-xs font-bold transition-all whitespace-nowrap border",
              sectorFilter === 'all' 
                ? "bg-primary text-white border-primary glow-primary" 
                : "glass-card border-white/10 text-muted-foreground hover:text-primary hover:border-primary/30"
            )}
          >
            Tutti i Settori
          </button>
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setSectorFilter(s)}
              className={cn(
                "px-5 py-2.5 pill text-xs font-bold transition-all whitespace-nowrap border capitalize",
                sectorFilter === s
                  ? "bg-primary text-white border-primary glow-primary" 
                  : "glass-card border-white/10 text-muted-foreground hover:text-primary hover:border-primary/30"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Athletes Grid/List ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card h-48 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : players?.length === 0 ? (
        <div className="glass-card rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 pill bg-muted/20 flex items-center justify-center mb-6">
            <User className="w-10 h-10 text-muted-foreground opacity-20" />
          </div>
          <h3 className="text-xl font-bold">Nessun atleta trovato</h3>
          <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
            Prova a modificare la ricerca o i filtri per visualizzare altri risultati.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {players?.map((p, idx) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-6 rounded-[2.5rem] hover:shadow-2xl hover:border-primary/20 transition-all group relative overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 pill bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl tracking-tight leading-none group-hover:text-primary transition-colors">
                        {p.first_name} {p.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 pill bg-muted/50 border border-white/10 text-muted-foreground">
                          {p.team_sector ?? 'N/A'}
                        </span>
                        {!p.is_active && (
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 pill bg-destructive/10 text-destructive">
                            Inattivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 pill hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-foreground/70 font-medium">
                    <div className="w-8 h-8 pill bg-muted/20 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span>{p.birth_date ? new Date(p.birth_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-foreground/70 font-medium">
                    <div className="w-8 h-8 pill bg-muted/20 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span>{p.phone_player ?? 'Nessun telefono'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-foreground/70 font-medium">
                    <div className="w-8 h-8 pill bg-muted/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className={cn(
                        "w-4 h-4",
                        p.medical_expiry && new Date(p.medical_expiry) < new Date() ? "text-destructive" : "text-emerald-500"
                      )} />
                    </div>
                    <span className={cn(
                      p.medical_expiry && new Date(p.medical_expiry) < new Date() ? "text-destructive font-bold" : ""
                    )}>
                      Visita: {p.medical_expiry ? new Date(p.medical_expiry).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-7 h-7 pill bg-muted/30 border-2 border-background" />
                    ))}
                  </div>
                  <button className="text-xs font-bold text-primary flex items-center gap-1 group/btn px-4 py-2 pill hover:bg-primary/5 transition-all">
                    Vedi Scheda
                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

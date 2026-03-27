import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  User,
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { medicalService, type VisitStatus } from '@/services/medicalService'
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { it } from "date-fns/locale/it";

export default function MedicalVisits() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')

  const { data: visits, isLoading } = useQuery({
    queryKey: ['medical-visits'],
    queryFn: () => medicalService.getMedicalVisits()
  })

  const getStatus = medicalService.calculateStatus

  const filteredVisits = visits?.filter(p => {
    const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSector = sectorFilter === 'all' || p.team_sector === sectorFilter
    return matchesSearch && matchesSector
  })

  // Get unique sectors for filter
  const sectors = ['all', ...Array.from(new Set(visits?.map(p => p.team_sector).filter((s): s is string => !!s) || []))]

  const stats = {
    valid: visits?.filter(p => getStatus(p.medical_expiry) === 'valid').length || 0,
    expiring: visits?.filter(p => getStatus(p.medical_expiry) === 'expiring').length || 0,
    expired: visits?.filter(p => getStatus(p.medical_expiry) === 'expired').length || 0,
    missing: visits?.filter(p => getStatus(p.medical_expiry) === 'missing').length || 0,
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <div className="p-2 pill bg-primary/10 border border-primary/20">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            Visite Mediche
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Gestione idoneità agonistica e scadenze certificati
          </p>
        </div>

        <div className="flex gap-2">
          <StatBadge count={stats.expired} label="Scadute" type="expired" />
          <StatBadge count={stats.expiring} label="In Scadenza" type="expiring" />
          <StatBadge count={stats.valid} label="Valide" type="valid" />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cerca atleta..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-lg pill glass-card border-none focus-visible:ring-2 focus-visible:ring-primary shadow-md placeholder:text-muted-placeholder/50"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {sectors.map(sector => (
            <button
              key={`sector-filter-${sector}`}
              onClick={() => setSectorFilter(sector)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                sectorFilter === sector 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" 
                  : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {sector === 'all' ? 'Tutti i settori' : sector}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atleta</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Settore</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data Scadenza</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stato</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  new Array(6).fill(0).map((_, i) => (
                    <tr key={`skel-med-row-${i}`} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8">
                        <div className="h-6 bg-white/5 pill w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredVisits?.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key="empty-visits"
                  >
                    <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground/30">
                      <div className="flex flex-col items-center gap-3">
                        <Stethoscope className="w-12 h-12" />
                        <p className="font-bold">Nessun atleta trovato con questi criteri</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredVisits?.map((visit, idx) => {
                    const status = getStatus(visit.medical_expiry)
                    return (
                      <motion.tr 
                        key={visit.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                        className="group transition-colors"
                      >
                        <td className="px-6 py-5 text-center font-bold text-muted-foreground/50 tabular-nums text-xs italic">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 pill bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                                {visit.last_name} {visit.first_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="pill bg-white/5 border border-white/10 px-3 py-1 inline-flex items-center text-xs font-black uppercase tracking-wider text-muted-foreground/80">
                            {visit.team_sector ?? 'N/D'}
                          </div>
                        </td>
                        <td className="px-6 py-5 font-black text-sm tabular-nums">
                          {visit.medical_expiry ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground/60" />
                              {format(new Date(visit.medical_expiry), 'dd MMMM yyyy', { locale: it })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 italic">Non pervenuta</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <StatusIndicator status={status} expiry={visit.medical_expiry || null} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 pill hover:bg-white/10 text-muted-foreground hover:text-primary transition-all">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatBadge({ count, label, type }: Readonly<{ count: number, label: string, type: VisitStatus }>) {
  const colors = {
    valid: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    expiring: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    expired: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    missing: 'text-muted-foreground bg-white/5 border-white/10'
  }

  return (
    <div className={cn("px-4 py-2 rounded-2xl border flex flex-col items-center min-w-[100px]", colors[type])}>
      <span className="text-2xl font-black leading-none">{count}</span>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
    </div>
  )
}

function StatusIndicator({ status, expiry }: Readonly<{ status: VisitStatus, expiry: string | null }>) {
  const configs = {
    valid: {
      label: 'Valida',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      class: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
      glow: 'shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]'
    },
    expiring: {
      label: 'In Scadenza',
      icon: <Clock className="w-3.5 h-3.5" />,
      class: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
      glow: 'shadow-[0_0_15px_-3px_rgba(251,191,36,0.3)]'
    },
    expired: {
      label: 'Scaduta',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      class: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
      glow: 'shadow-[0_0_15px_-3px_rgba(248,113,113,0.3)]'
    },
    missing: {
      label: 'Pendente',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      class: 'bg-white/5 text-muted-foreground border-white/10',
      glow: ''
    }
  }

  const cfg = configs[status]
  const daysLeft = expiry ? differenceInDays(new Date(expiry), new Date()) : null

  return (
    <div className="flex flex-col gap-1">
      <div className={cn(
        "px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit",
        cfg.class,
        cfg.glow
      )}>
        {cfg.icon}
        {cfg.label}
      </div>
      {status === 'expiring' && daysLeft !== null && (
        <span className="text-[9px] font-bold text-amber-400/80 pl-1">
          Scade tra {daysLeft} giorn{daysLeft === 1 ? 'o' : 'i'}
        </span>
      )}
      {status === 'expired' && daysLeft !== null && (
        <span className="text-[9px] font-bold text-rose-400/80 pl-1">
          Scaduta da {Math.abs(daysLeft)} giorn{Math.abs(daysLeft) === 1 ? 'o' : 'i'}
        </span>
      )}
    </div>
  )
}

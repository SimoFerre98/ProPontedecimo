import { useState, useMemo } from 'react'
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
import { medicalService, type MedicalVisitRecord, type VisitStatus } from '@/services/medicalService'
import { Pagination } from '@/components/ui/Pagination'
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { it } from "date-fns/locale/it";

export default function MedicalVisits() {
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 15

  const { data, isLoading } = useQuery({
    queryKey: ['medical-visits', search, sectorFilter, page],
    queryFn: () => medicalService.getMedicalVisits(search, sectorFilter, page, pageSize),
  })

  const visits = data?.data || []
  const totalCount = data?.count || 0

  const getStatus = medicalService.calculateStatus

  // Get unique sectors for filter
  const sectors = ['all', ...Array.from(new Set(visits.map((p: MedicalVisitRecord) => p.team_sector).filter((s: string | null): s is string => !!s) || []))]

  const stats = useMemo(() => {
    if (!visits) return { expired: 0, expiring: 0, valid: 0 }

    return visits.reduce((acc, visit) => {
      const status = medicalService.calculateStatus(visit.medical_expiry)
      if (status === 'expired' || status === 'missing') acc.expired++
      else if (status === 'expiring') acc.expiring++
      else acc.valid++
      return acc
    }, { expired: 0, expiring: 0, valid: 0 })
  }, [visits])

  // filteredVisits is now handled server-side, so we just use 'visits'
  const filteredVisits = visits

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
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
            <input
              type="text"
              placeholder="Cerca atleti..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="h-16 pl-16 w-full text-xl pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary shadow-2xl transition-all font-medium placeholder:text-muted-foreground/40 bg-transparent text-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 p-1.5 glass-card rounded-2xl border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar">
            {sectors.map(sector => (
              <button
                key={sector}
                onClick={() => {
                  setSectorFilter(sector)
                  setPage(0)
                }}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  sectorFilter === sector 
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                )}
              >
                {sector === 'all' ? 'Tutti' : sector}
              </button>
            ))}
          </div>
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden border-black/5 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02]">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atleta</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Settore</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data Scadenza</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stato</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`med-skeleton-row-${i}`} className="animate-pulse">
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

      <Pagination 
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        className="mt-6"
      />
    </div>
  )
}

function StatBadge({ count, label, type }: Readonly<{ count: number, label: string, type: VisitStatus }>) {
  const colors = {
    valid: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    expiring: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    expired: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    missing: 'text-muted-foreground bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
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
      class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
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

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope,
  Calendar,
  User,
  ChevronRight,
  ArrowDown,
  ArrowUp
} from 'lucide-react'
import { medicalService, type MedicalVisitRecord } from '@/services/medicalService'
import { Pagination } from '@/components/ui/Pagination'
import { FilterToolbar } from '@/components/ui/FilterToolbar'
import { QueryErrorState } from '@/components/ui/query-error-state'
import MedicalVisitModal from '@/components/modals/MedicalVisitModal'
import MedicalStatusIndicator from '@/components/MedicalStatusIndicator'
import { StatsGrid } from '@/components/ui/StatsGrid'
import { format } from "date-fns/format";
import { it } from "date-fns/locale/it";

export default function MedicalVisits() {
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 15

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<MedicalVisitRecord | null>(null)
  const [sortBy, setSortBy] = useState<'last_name' | 'first_name' | 'team_sector' | 'medical_expiry'>('last_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['medical-visits', search, sectorFilter, page, sortBy, sortDir],
    queryFn: () => medicalService.getMedicalVisits(search, sectorFilter, page, pageSize, sortBy, sortDir),
  })

  function handleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir(p => p === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const visits = data?.data || []
  const totalCount = data?.count || 0

  const getStatus = medicalService.calculateStatus

  // Get unique sectors for filter
  const sectors = ['all', ...Array.from(new Set(visits.map((p: MedicalVisitRecord) => p.team_sector).filter((s: string | null): s is string => !!s) || []))]

  const { data: statsData } = useQuery({
    queryKey: ['medical-visits-stats', search, sectorFilter],
    queryFn: () => medicalService.getMedicalStats(search, sectorFilter),
  })

  const stats = statsData || { expired: 0, expiring: 0, valid: 0 }

  // filteredVisits is now handled server-side, so we just use 'visits'
  const filteredVisits = visits

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1 flex flex-col items-center md:items-start text-center md:text-left">
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

        <StatsGrid
          variant="badge"
          items={[
            { label: 'Scadute', value: stats.expired, color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
            { label: 'In Scadenza', value: stats.expiring, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
            { label: 'Valide', value: stats.valid, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
          ]}
        />
      </div>

      {/* Filters Bar */}
      <FilterToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        searchPlaceholder="Cerca atleti..."
        sectors={sectors}
        activeSector={sectorFilter}
        onSectorChange={(sector) => {
          setSectorFilter(sector)
          setPage(0)
        }}
      />

      {/* Main Content */}
      <div className="glass-card overflow-hidden border-black/5 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02]">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none" onClick={() => handleSort('last_name')}>
                  <div className="flex items-center gap-2">
                    Atleta
                    {sortBy === 'last_name' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />)}
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none" onClick={() => handleSort('team_sector')}>
                  <div className="flex items-center gap-2">
                    Settore
                    {sortBy === 'team_sector' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />)}
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none" onClick={() => handleSort('medical_expiry')}>
                  <div className="flex items-center gap-2">
                    Data Scadenza
                    {sortBy === 'medical_expiry' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />)}
                  </div>
                </th>
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
                ) : isError ? (
                  <tr key="error">
                    <td colSpan={6} className="px-6 py-6">
                      <QueryErrorState error={error} onRetry={() => refetch()} />
                    </td>
                  </tr>
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
                        onClick={() => {
                          setSelectedVisit(visit)
                          setIsModalOpen(true)
                        }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                        className="group transition-colors cursor-pointer"
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
                          <MedicalStatusIndicator status={status} expiry={visit.medical_expiry || null} />
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

      <MedicalVisitModal
        isOpen={isModalOpen}
        record={selectedVisit}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedVisit(null)
        }}
      />
    </div>
  )
}

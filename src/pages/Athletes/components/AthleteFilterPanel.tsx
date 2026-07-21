import { motion, AnimatePresence } from 'framer-motion'
import { X, SortAsc, SortDesc } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { FiltersState } from '../types'

interface AthleteFilterPanelProps {
  showFilters: boolean
  filters: FiltersState
  pendingFilters: FiltersState
  setPending: <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => void
  setPendingFilters: (updater: (prev: FiltersState) => FiltersState) => void
  applyFilters: () => void
  resetFilters: () => void
  setShowFilters: (show: boolean) => void
  setFilters: (updater: (f: FiltersState) => FiltersState) => void
  setPage: (page: number) => void
  filterCount: number
}

export default function AthleteFilterPanel({
  showFilters,
  filters,
  pendingFilters,
  setPending,
  setPendingFilters,
  applyFilters,
  resetFilters,
  setShowFilters,
  setFilters,
  setPage,
  filterCount,
}: Readonly<AthleteFilterPanelProps>) {
  return (
    <>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">

                {/* Stato in Rosa */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Stato Squadra</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['all', 'Tutti'],
                      ['active', '🟢 Attivo'],
                      ['inactive', '⚫ Non Attivo'],
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

                {/* Privacy */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Privacy</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['all', 'Tutti'],
                      ['accepted', '✅ Accettata'],
                      ['missing', '❓ Mancante'],
                    ] as [FiltersState['privacyStatus'], string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setPending('privacyStatus', val)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border",
                          pendingFilters.privacyStatus === val
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matricola FIGC */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Matricola FIGC</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['all', 'Tutti'],
                      ['missing', '❓ Mancante'],
                    ] as [FiltersState['registrationStatus'], string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setPending('registrationStatus', val)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border",
                          pendingFilters.registrationStatus === val
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
              {filters.isActive === 'active' ? 'Attivo' : 'Non Attivo'}
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
          {filters.privacyStatus !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">
              Privacy: {filters.privacyStatus === 'accepted' ? 'Accettata' : 'Mancante'}
              <button onClick={() => { setFilters(f => ({ ...f, privacyStatus: 'all' })); setPage(0) }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.registrationStatus !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">
              Matricola: Mancante
              <button onClick={() => { setFilters(f => ({ ...f, registrationStatus: 'all' })); setPage(0) }}><X className="w-3 h-3" /></button>
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
    </>
  )
}

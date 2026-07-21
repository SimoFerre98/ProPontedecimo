import { motion } from 'framer-motion'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AthleteBannersProps {
  overdueCount: number
  missingRegistrationCount: number
  onNavigateToPayments: () => void
  onFilterMissingRegistration: () => void
}

export default function AthleteBanners({
  overdueCount,
  missingRegistrationCount,
  onNavigateToPayments,
  onFilterMissingRegistration,
}: Readonly<AthleteBannersProps>) {
  if (overdueCount === 0 && missingRegistrationCount === 0) return null

  return (
    <div className={cn(
      "grid grid-cols-1 gap-4",
      overdueCount > 0 && missingRegistrationCount > 0 && "lg:grid-cols-2"
    )}>
      {/* Banner Pagamenti in Sospeso */}
      {overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNavigateToPayments}
          className="cursor-pointer flex items-center gap-4 px-6 py-4 rounded-3xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-all group"
        >
          <div className="w-10 h-10 pill bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
              {overdueCount} {overdueCount === 1 ? 'atleta ha' : 'atleti hanno'} rate non pagate
            </p>
            <p className="text-xs text-red-500/70 font-medium mt-0.5">
              Rata scaduta da oltre 15 giorni — clicca per gestire i pagamenti
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-red-500/50 transition-transform group-hover:translate-x-1" />
        </motion.div>
      )}

      {/* Banner Matricola FIGC Mancante */}
      {missingRegistrationCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onFilterMissingRegistration}
          className="cursor-pointer flex items-center gap-4 px-6 py-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-all group"
        >
          <div className="w-10 h-10 pill bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              {missingRegistrationCount} {missingRegistrationCount === 1 ? 'atleta attivo è' : 'atleti attivi sono'} senza matricola
            </p>
            <p className="text-xs text-amber-500/70 font-medium mt-0.5">
              Nessun nuovo iscritto deve restare privo di matricola — clicca per filtrare la lista
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500/50 transition-transform group-hover:translate-x-1" />
        </motion.div>
      )}
    </div>
  )
}

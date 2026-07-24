import {
  User,
  ShieldCheck,
  ChevronRight,
  SortAsc,
  SortDesc,
  Trash2,
  Euro,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { type Player } from '@/services/athleteService'
import type { FiltersState } from '../types'

interface AthleteTableViewProps {
  players: Player[]
  isAdmin: boolean
  filters: FiltersState
  onSort: (field: FiltersState['sortBy']) => void
  onOpenDetails: (player: Player) => void
  onOpenSummary: (player: Player) => void
  onDelete: (player: Player) => void
}

export default function AthleteTableView({
  players,
  isAdmin,
  filters,
  onSort,
  onOpenDetails,
  onOpenSummary,
  onDelete,
}: Readonly<AthleteTableViewProps>) {
  return (
    <div className="glass-card overflow-x-auto rounded-[2rem] border-black/5 dark:border-white/10 no-scrollbar">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="bg-black/5 dark:bg-white/5">
          <tr className="border-b border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <th className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none relative" onClick={() => onSort('last_name')}>
              <div className="flex items-center gap-2">
                Atleta
                {filters.sortBy === 'last_name' && (filters.sortDir === 'asc' ? <SortAsc className="w-3.5 h-3.5 text-brand-accent" /> : <SortDesc className="w-3.5 h-3.5 text-brand-accent" />)}
              </div>
            </th>
            <th className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none relative" onClick={() => onSort('team_sector')}>
              <div className="flex items-center gap-2">
                Settore
                {filters.sortBy === 'team_sector' && (filters.sortDir === 'asc' ? <SortAsc className="w-3.5 h-3.5 text-brand-accent" /> : <SortDesc className="w-3.5 h-3.5 text-brand-accent" />)}
              </div>
            </th>
            <th className="p-6">Contatto</th>
            <th className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none relative" onClick={() => onSort('medical_expiry')}>
              <div className="flex items-center gap-2">
                Scadenza Medica
                {filters.sortBy === 'medical_expiry' && (filters.sortDir === 'asc' ? <SortAsc className="w-3.5 h-3.5 text-brand-accent" /> : <SortDesc className="w-3.5 h-3.5 text-brand-accent" />)}
              </div>
            </th>
            <th className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none relative" onClick={() => onSort('is_active')}>
              <div className="flex items-center gap-2">
                Stato Squadra
                {filters.sortBy === 'is_active' && (filters.sortDir === 'asc' ? <SortAsc className="w-3.5 h-3.5 text-brand-accent" /> : <SortDesc className="w-3.5 h-3.5 text-brand-accent" />)}
              </div>
            </th>
            <th className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none relative" onClick={() => onSort('is_registered')}>
              <div className="flex items-center gap-2">
                Tesserato
                {filters.sortBy === 'is_registered' && (filters.sortDir === 'asc' ? <SortAsc className="w-3.5 h-3.5 text-brand-accent" /> : <SortDesc className="w-3.5 h-3.5 text-brand-accent" />)}
              </div>
            </th>
            <th className="p-6">Matricola</th>
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
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent/20 to-brand-accent/5 flex items-center justify-center border border-brand-accent/20 shadow-inner group-hover:scale-105 transition-transform">
                        <User className="w-6 h-6 text-brand-accent" />
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase italic group-hover:text-brand-accent transition-colors">{player.last_name} <span className="text-brand-accent not-italic">{player.first_name}</span></div>
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
                        {player.is_active ? 'Attivo' : 'Non Attivo'}
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
                  <td className="p-6">
                    <span className="text-xs font-bold tabular-nums">{player.figc_registration || '-'}</span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-3.5">
                      <button
                        onClick={() => {
                          onOpenSummary(player)
                        }}
                        className="text-foreground/75 hover:text-brand-accent transition-colors flex items-center gap-1 group/btn"
                      >
                        <Euro className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pagamenti</span>
                      </button>
                      <button
                        onClick={() => {
                          onOpenDetails(player)
                        }}
                        className="text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1 group/btn"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">Dettagli</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(player)
                          }}
                          className="p-2 pill text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Calendar,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Clock,
  Trash2,
  FileText,
  Euro,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Player } from '@/services/athleteService'

interface AthleteGridViewProps {
  players: Player[]
  isAdmin: boolean
  onOpenDetails: (player: Player) => void
  onOpenSummary: (player: Player) => void
  onDelete: (player: Player) => void
}

export default function AthleteGridView({
  players,
  isAdmin,
  onOpenDetails,
  onOpenSummary,
  onDelete,
}: Readonly<AthleteGridViewProps>) {
  return (
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
              className="glass-card p-6 flex flex-col gap-5 group hover:border-brand-accent/30 transition-all relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-colors" />

              {/* Header */}
              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-accent/20 to-brand-accent/5 flex items-center justify-center border border-brand-accent/20 shadow-inner group-hover:scale-105 transition-transform">
                    <User className="w-7 h-7 text-brand-accent" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-foreground leading-tight tracking-tight uppercase italic group-hover:text-brand-accent transition-colors">
                      {player.last_name} <span className="text-brand-accent not-italic font-bold">{player.first_name}</span>
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

              {player.figc_registration && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border bg-muted/30 text-muted-foreground border-white/5">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span>Matricola: {player.figc_registration}</span>
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenSummary(player)}
                    className="text-foreground/75 hover:text-brand-accent transition-colors flex items-center gap-1 group/btn"
                  >
                    <Euro className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pagamenti</span>
                  </button>
                  <button
                    onClick={() => onOpenDetails(player)}
                    className="text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1 group/btn ml-auto"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Dettagli</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(player)
                  }}
                  className="absolute top-4 right-4 p-2 pill bg-background/50 backdrop-blur-sm border border-black/5 dark:border-white/10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shadow-sm z-20"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

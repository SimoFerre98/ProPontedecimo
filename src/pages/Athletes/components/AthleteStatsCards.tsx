import { motion } from 'framer-motion'
import { ClipboardCheck, ShieldCheck, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Player } from '@/services/athleteService'

interface AthleteStatsCardsProps {
  players: Player[]
  availableSectors: string[]
  onNavigate: (link: string) => void
}

export default function AthleteStatsCards({ players, availableSectors, onNavigate }: Readonly<AthleteStatsCardsProps>) {
  const stats = [
    {
      label: 'Tesserati FIGC',
      val: players?.filter(p => p.is_registered).length || 0,
      icon: ClipboardCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      hint: 'Atleti con tessera federale'
    },
    {
      label: 'Settori',
      val: availableSectors.length,
      icon: ShieldCheck,
      color: 'text-primary',
      bg: 'bg-primary/10',
      hint: 'Leve/squadre attive'
    },
    {
      label: 'Visite Scadute',
      val: players?.filter(p => p.medical_expiry && new Date(p.medical_expiry) < new Date()).length || 0,
      icon: Activity,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      link: '/visite',
      hint: 'Certificati medici da rinnovare'
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          onClick={() => stat.link && onNavigate(stat.link)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          title={stat.hint}
          className={cn(
            "glass-card p-5 flex items-center justify-between border-black/5 dark:border-white/5 group hover:border-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-all",
            stat.link && "cursor-pointer active:scale-95"
          )}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-foreground">{stat.val}</p>
          </div>
          <div className={cn("w-12 h-12 pill flex items-center justify-center shadow-inner transition-transform group-hover:scale-110", stat.bg)}>
            <stat.icon className={cn("w-6 h-6", stat.color)} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

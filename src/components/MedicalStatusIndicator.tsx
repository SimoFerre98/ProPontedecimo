import { AlertTriangle, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VisitStatus } from '@/services/medicalService'
import { differenceInDays } from "date-fns/differenceInDays";

export default function MedicalStatusIndicator({ status, expiry }: Readonly<{ status: VisitStatus, expiry: string | null }>) {
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

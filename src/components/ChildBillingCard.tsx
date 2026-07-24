import { useMemo } from 'react'
import { Euro, Calendar, CheckCircle2, Clock, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns/format'
import { it } from 'date-fns/locale/it'
import { differenceInDays } from 'date-fns/differenceInDays'
import { medicalService } from '@/services/medicalService'
import type { PaymentReference } from '@/services/paymentService'

interface ChildBillingCardProps {
  firstName: string
  lastName: string
  teamSector: string | null
  seasonName: string
  medicalExpiry: string | null
  payments: Omit<PaymentReference, 'player'>[]
}

export default function ChildBillingCard({
  firstName,
  lastName,
  teamSector,
  seasonName,
  medicalExpiry,
  payments,
}: ChildBillingCardProps) {
  // Calcolo statistiche pagamenti
  const stats = useMemo(() => {
    const currentPayments = payments.filter(p => p.plan !== 'carried_over')
    const carriedOverPayments = payments.filter(p => p.plan === 'carried_over')

    const totalAmount = currentPayments.reduce((sum, p) => sum + (p.amount_eur || 0), 0)
    const paidAmount = currentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount_eur ?? p.amount_eur ?? 0), 0)
    const paidCount = currentPayments.filter(p => p.status === 'paid').length
    const totalCount = currentPayments.length
    const remainingAmount = totalAmount - paidAmount
    const overdueCount = currentPayments.filter(p => p.status === 'overdue').length

    const hasCarriedOver = carriedOverPayments.length > 0
    const carriedOverAmount = carriedOverPayments.reduce((sum, p) => sum + (p.amount_eur || 0), 0)
    const carriedOverPaid = carriedOverPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount_eur ?? p.amount_eur ?? 0), 0)
    const carriedOverRemaining = carriedOverAmount - carriedOverPaid

    return {
      totalAmount,
      paidAmount,
      paidCount,
      totalCount,
      remainingAmount,
      overdueCount,
      hasCarriedOver,
      carriedOverAmount,
      carriedOverRemaining,
    }
  }, [payments])

  // Stato visita medica
  const medicalStatus = medicalService.calculateStatus(medicalExpiry)
  const daysLeft = medicalExpiry ? differenceInDays(new Date(medicalExpiry), new Date()) : null

  const medicalConfig = {
    valid: {
      label: 'Valida',
      icon: <CheckCircle2 className="w-4 h-4" />,
      classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]',
    },
    expiring: {
      label: 'In Scadenza',
      icon: <Clock className="w-4 h-4" />,
      classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]',
    },
    expired: {
      label: 'Scaduta',
      icon: <AlertCircle className="w-4 h-4" />,
      classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]',
    },
    missing: {
      label: 'Non Inserita',
      icon: <AlertTriangle className="w-4 h-4" />,
      classes: 'bg-[var(--surface-05)] text-muted-foreground border-[var(--border-soft)]',
    },
  }[medicalStatus]

  const formattedExpiry = medicalExpiry
    ? format(new Date(medicalExpiry), "dd MMM yyyy", { locale: it })
    : 'Mancante'

  return (
    <div className="glass-card rounded-[2.5rem] border-white/10 p-6 md:p-8 space-y-6 relative overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
            {lastName} <span className="text-brand-accent not-italic">{firstName}</span>
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
            {teamSector || 'Nessun settore'} · Stagione {seasonName}
          </p>
        </div>
        
        {/* Badge Visita Medica */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Badge className={cn("px-4 py-1.5 tracking-wider", medicalConfig.classes)} icon={medicalConfig.icon}>
            <span>Visita: {medicalConfig.label}</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-black/5 dark:border-white/5">
        {/* Colonna Pagamenti */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Euro className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Stato Pagamenti</h4>
          </div>

          {payments.length === 0 ? (
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-white/5 flex flex-col justify-center py-6 text-center text-muted-foreground/50">
              <p className="text-xs font-black uppercase tracking-wider">Nessuna quota assegnata</p>
              <p className="text-[10px] mt-1">Non è stato configurato un piano rate per la stagione corrente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Quota Stagione</p>
                <p className="text-sm font-black text-foreground mt-0.5 tabular-nums">
                  €{stats.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">
                  {stats.totalCount} {stats.totalCount === 1 ? 'rata' : 'rate'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Saldate</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                  €{stats.paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] text-emerald-600/75 dark:text-emerald-400/75 mt-0.5">
                  {stats.paidCount} di {stats.totalCount} pagate
                </p>
              </div>

              <div className={cn(
                "p-3.5 rounded-2xl border col-span-2 md:col-span-1",
                stats.overdueCount > 0 
                  ? "bg-rose-500/5 border-rose-500/10" 
                  : "bg-black/5 dark:bg-white/5 border-white/5"
              )}>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Residuo</p>
                <p className={cn(
                  "text-sm font-black mt-0.5 tabular-nums",
                  stats.overdueCount > 0 ? "text-rose-500" : "text-foreground"
                )}>
                  €{stats.remainingAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">
                  {stats.overdueCount > 0 ? `${stats.overdueCount} in ritardo!` : 'In regola'}
                </p>
              </div>
            </div>
          )}

          {/* Gestione insoluti da stagioni precedenti */}
          {stats.hasCarriedOver && stats.carriedOverRemaining > 0 && (
            <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400">
              <span className="text-[9px] font-black uppercase tracking-wider">Debito pregresso da saldare:</span>
              <span className="text-xs font-black tabular-nums">
                €{stats.carriedOverRemaining.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Colonna Visita Medica */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Calendar className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Certificato Medico</h4>
          </div>

          <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 flex flex-col justify-between h-[calc(100%-2.5rem)] min-h-[92px]">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Data di Scadenza</p>
              <p className="text-lg font-black text-foreground mt-1 tracking-tight">
                {formattedExpiry}
              </p>
            </div>

            {/* Messaggio specifico di avviso per la scadenza */}
            {medicalStatus === 'expiring' && daysLeft !== null && (
              <p className="text-[9px] font-semibold text-amber-500 mt-2">
                Scade tra {daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'}. Rinnova al più presto!
              </p>
            )}
            {medicalStatus === 'expired' && (
              <p className="text-[9px] font-semibold text-rose-500 mt-2">
                Certificato scaduto! Non è consentito svolgere attività sportiva.
              </p>
            )}
            {medicalStatus === 'missing' && (
              <p className="text-[9px] font-semibold text-muted-foreground mt-2">
                Certificato medico non inserito a sistema.
              </p>
            )}
            {medicalStatus === 'valid' && (
              <p className="text-[9px] font-semibold text-emerald-500 mt-2">
                Certificato in regola e attivo.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

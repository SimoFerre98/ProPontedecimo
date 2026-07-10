import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Euro, CheckCircle2, Clock, AlertCircle, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns/format'
import { it } from 'date-fns/locale/it'
import { paymentService, PAYMENT_METHODS, type PaymentReference, type PaymentStatus } from '@/services/paymentService'
import { useAppStore } from '@/store/useAppStore'

interface PlayerPaymentSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  playerId: string | null
  playerName: string
  playerTeamSector: string | null
}

export default function PlayerPaymentSummaryModal({
  isOpen,
  onClose,
  playerId,
  playerName,
  playerTeamSector,
}: PlayerPaymentSummaryModalProps) {
  const { selectedSeasonId, seasons } = useAppStore()

  const currentSeason = useMemo(() => {
    return seasons.find(s => s.id === selectedSeasonId)
  }, [seasons, selectedSeasonId])

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['playerPayments', playerId, selectedSeasonId],
    queryFn: () => paymentService.getPaymentsByPlayer(playerId!, selectedSeasonId),
    enabled: !!playerId && !!selectedSeasonId && isOpen,
  })

  // Calcolo statistiche
  const stats = useMemo(() => {
    const currentPayments = payments.filter(p => p.plan !== 'carried_over')
    const carriedOverPayments = payments.filter(p => p.plan === 'carried_over')

    const totalAmount = currentPayments.reduce((sum, p) => sum + (p.amount_eur || 0), 0)
    const paidAmount = currentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount_eur ?? p.amount_eur ?? 0), 0)
    const paidCount = currentPayments.filter(p => p.status === 'paid').length
    const totalCount = currentPayments.length
    const remainingAmount = totalAmount - paidAmount
    const overdueAmount = currentPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + (p.amount_eur || 0), 0)

    const hasCarriedOver = carriedOverPayments.length > 0
    const carriedOverAmount = carriedOverPayments.reduce((sum, p) => sum + (p.amount_eur || 0), 0)
    const carriedOverPaid = carriedOverPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount_eur ?? p.amount_eur ?? 0), 0)
    const carriedOverRemaining = carriedOverAmount - carriedOverPaid
    const carriedOverStatus = carriedOverPayments[0]?.status

    return {
      totalAmount,
      paidAmount,
      paidCount,
      totalCount,
      remainingAmount,
      overdueAmount,
      hasCarriedOver,
      carriedOverAmount,
      carriedOverRemaining,
      carriedOverStatus,
    }
  }, [payments])

  const getMethodText = (p: PaymentReference) => {
    if (!p.payment_method) return ''
    const methodLabel = PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method
    const receiptText = p.receipt_number ? ` · Ricevuta n. ${p.receipt_number}` : ''
    return `${methodLabel}${receiptText}`
  }

  const getDaysOverdueText = (dueDateStr: string | null) => {
    if (!dueDateStr) return ''
    const due = new Date(dueDateStr + 'T00:00:00')
    const today = new Date()
    due.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return ''
    return `Scaduta da ${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-[95vw] max-w-xl max-h-[92vh] glass-card rounded-[3rem] shadow-2xl border-black/5 dark:border-white/10 overflow-hidden overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase italic text-foreground">
                  Riepilogo <span className="text-primary not-italic">Pagamenti</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
                  {playerName} — {playerTeamSector || 'Nessun settore'} · {currentSeason?.name || 'Nessuna stagione'}
                </p>
              </div>
              <button onClick={onClose} className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Caricamento pagamenti...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground/45 border border-dashed border-muted-foreground/20 rounded-3xl">
                  <Euro className="w-12 h-12" />
                  <p className="text-sm font-black uppercase tracking-widest">Nessun piano rate configurato</p>
                  <p className="text-xs text-muted-foreground/60">Assegna una nuova quota a questo atleta per impostare il piano rate.</p>
                </div>
              ) : (
                <>
                  {/* Stat Cards */}
                  <div className={cn("grid gap-3", stats.hasCarriedOver ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3")}>
                    <div className="p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <Euro className="w-4 h-4" />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Quota Totale</p>
                      <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                        € {stats.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] font-medium text-muted-foreground/70 mt-1">
                        {stats.totalCount} {stats.totalCount === 1 ? 'rata pianificata' : 'rate pianificate'}
                      </p>
                    </div>

                    <div className="p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Rate Saldate</p>
                      <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                        € {stats.paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] font-medium text-muted-foreground/70 mt-1">
                        {stats.paidCount} di {stats.totalCount} rate pagate
                      </p>
                    </div>

                    <div className="p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 mb-3">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Residuo</p>
                      <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                        € {stats.remainingAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] font-medium text-muted-foreground/70 mt-1">
                        {stats.overdueAmount > 0 ? (
                          <span className="text-rose-500 font-bold">di cui € {stats.overdueAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} scaduti</span>
                        ) : 'in regola'}
                      </p>
                    </div>

                    {stats.hasCarriedOver && (
                      <div className="p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                        <div>
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
                            <Clock className="w-4 h-4" />
                          </div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Debito Pregresso</p>
                          <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                            € {stats.carriedOverAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <p className="text-[9px] font-bold mt-2">
                          {stats.carriedOverStatus === 'paid' ? (
                            <span className="text-emerald-500 uppercase tracking-widest">Saldato</span>
                          ) : (
                            <span className="text-amber-500 uppercase tracking-widest">In attesa</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dettaglio rate */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap pl-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Dettaglio Rate</span>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" /> Scaduta e non pagata
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar">
                      {payments.map((p) => {
                        const isOverdueUnpaid = p.status === 'overdue'
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              'grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-4 rounded-2xl border transition-all',
                              isOverdueUnpaid
                                ? 'border-rose-500/30 bg-rose-500/5 border-l-4 border-l-rose-500'
                                : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5'
                            )}
                          >
                            <div className={cn(
                              'flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 border',
                              isOverdueUnpaid
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-foreground'
                            )}>
                              {p.plan === 'carried_over' ? (
                                <>
                                  <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                                  <span className="text-[6px] font-black uppercase tracking-wider mt-0.5">Debito</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-black leading-none">{p.installment_no}</span>
                                  <span className="text-[7px] font-black uppercase tracking-wider mt-0.5">Rata</span>
                                </>
                              )}
                            </div>

                            <div className="min-w-0 flex flex-col justify-center">
                              <span className={cn('text-xs font-bold flex items-center gap-1.5', isOverdueUnpaid ? 'text-rose-500' : 'text-foreground/80')}>
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground/45 shrink-0" />
                                {p.due_date ? format(new Date(p.due_date), 'dd MMM yyyy', { locale: it }) : '—'}
                              </span>
                              {p.plan === 'carried_over' && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 mt-0.5">
                                  Debito Pregresso
                                </span>
                              )}
                              {isOverdueUnpaid && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-rose-500 mt-0.5">
                                  {getDaysOverdueText(p.due_date)}
                                </span>
                              )}
                              {p.status === 'paid' && p.payment_method && (
                                <span className="text-[9px] font-medium text-muted-foreground/60 mt-0.5 truncate">
                                  {getMethodText(p)}
                                </span>
                              )}
                            </div>

                            <div className={cn('text-sm font-black tabular-nums whitespace-nowrap px-2', isOverdueUnpaid ? 'text-rose-500' : 'text-foreground')}>
                              € {(p.amount_eur || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </div>

                            <div>
                              <StatusBadge status={p.status} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full md:w-32 h-12 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-black uppercase tracking-widest text-[10px] text-foreground transition-all"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const configs = {
    paid: { label: 'Pagato', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    pending: { label: 'In Attesa', icon: Clock, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    overdue: { label: 'Scaduto', icon: AlertCircle, className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  }
  const { label, icon: Icon, className } = configs[status]
  return (
    <div className={cn('pill px-3 py-1.5 text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border', className)}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
  )
}

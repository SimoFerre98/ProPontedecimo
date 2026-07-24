import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, CheckCircle2, Clock, AlertCircle, Plus,
  User, Euro, FileText, CreditCard, Smartphone, Banknote, Building2, Pencil,
  Download, TrendingUp
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns/format'
import { it } from 'date-fns/locale/it'
import { paymentService, PAYMENT_METHODS, type PaymentStatus, type PaymentReference } from '@/services/paymentService'
import type { PaymentsFilters } from '@/types/filters'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/button'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { useAuth } from '@/hooks/useAuth'
import { exportToXlsx } from '@/lib/xlsxExport'
import PaymentModal from '@/components/modals/PaymentModal'
import NewPaymentModal from '@/components/modals/NewPaymentModal'
import { useAppStore } from '@/store/useAppStore'
import { FinancialTrendChart } from '@/components/charts/FinancialTrendChart'
import { StatsGrid } from '@/components/ui/StatsGrid'
import { Badge } from '@/components/ui/Badge'

const METHOD_ICONS: Record<string, React.ElementType> = {
  satispay: Smartphone,
  contanti: Banknote,
  pos: CreditCard,
  iban: Building2,
}

export default function Payments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const pageSize = 15
  const [selectedPayment, setSelectedPayment] = useState<PaymentReference | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { selectedSeasonId } = useAppStore()
  const { role } = useAuth()
  const isAdmin = role === 'president' || role === 'director'

  const paymentsFilters: PaymentsFilters = { status: statusFilter, sortBy: 'due_date', sortDir: 'asc' }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const dataToExport = await paymentService.getPaymentsForExport(
        search,
        paymentsFilters,
        selectedSeasonId
      )

      const mappedRows = dataToExport.map(p => ({
        'Cognome': p.player?.last_name || '',
        'Nome': p.player?.first_name || '',
        'Settore': p.player?.team_sector || '',
        'Rata': p.plan === 'carried_over' ? 'Debito Pregresso' : `${p.installment_no}ª Rata`,
        'Piano': p.plan === 'carried_over' ? 'Debito Pregresso' : p.plan === 'annual' ? 'Unica' : 'Rateale',
        'Scadenza': p.due_date || '',
        'Importo Previsto': p.amount_eur ?? 0,
        'Importo Pagato': p.paid_amount_eur ?? 0,
        'Metodo': p.payment_method ? (PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method) : '',
        'N. Ricevuta': p.receipt_number || '',
        'Data Ricevuta': p.receipt_date || '',
        'Stato': p.status === 'paid' ? 'Pagato' : p.status === 'pending' ? 'In Attesa' : p.status === 'overdue' ? 'Scaduto' : p.status
      }))

      exportToXlsx(mappedRows, 'esportazione_pagamenti.xlsx', 'Pagamenti')
    } catch (err) {
      console.error("Errore durante l'esportazione dei pagamenti:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['payments', search, statusFilter, page, selectedSeasonId],
    queryFn: () => paymentService.getPayments(search, paymentsFilters, page, pageSize, selectedSeasonId),
    enabled: !!selectedSeasonId,
  })

  const { data: trendData } = useQuery({
    queryKey: ['financial-trend', selectedSeasonId],
    queryFn: () => paymentService.getFinancialTrend(selectedSeasonId!),
    enabled: isAdmin && !!selectedSeasonId,
  })

  const payments = useMemo(() => data?.data ?? [], [data])
  const totalCount = data?.count || 0

  const stats = useMemo(() => ({
    paid: payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (p.paid_amount_eur ?? p.amount_eur ?? 0), 0),
    pending: payments.filter((p) => p.status === 'pending').reduce((a, p) => a + (p.amount_eur ?? 0), 0),
    overdue: payments.filter((p) => p.status === 'overdue').length,
  }), [payments])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-accent font-black uppercase tracking-[0.2em] text-[10px]">
            <Euro className="w-4 h-4" />
            <span>Quote Associative</span>
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tight italic uppercase">
            Gestione <span className="text-brand-accent not-italic">Pagamenti</span>
          </h1>
          <p className="text-muted-foreground font-medium border-l-2 border-brand-accent/30 pl-4">
            Quote annuali e rate stagionali — 1ª rata: 15 set · 2ª rata: 15 gen
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowNewModal(true)}
            className="pill bg-brand-accent hover:bg-brand-accent/90 text-white gap-2 h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand-accent/30"
          >
            <Plus className="w-5 h-5" /> Nuova Quota
          </Button>
        )}
      </div>

      {/* Nuova Sezione Finanziaria per Admin */}
      {isAdmin && selectedSeasonId && trendData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gold">
              <TrendingUp className="w-4 h-4" />
              <span>Andamento Finanziario</span>
            </div>
            <Badge tone="neutral" icon={<span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />} className="gap-2 px-3 py-1 text-[10px] normal-case tracking-normal">
              <span>Visibile solo ad Amministratori</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-[2rem] relative overflow-hidden group border border-[var(--border-soft)] transition-all duration-300 hover:border-emerald-500/20 hover:-translate-y-1"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 bg-emerald-500 group-hover:opacity-20 transition-opacity" />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Incassato Totale</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">
                    € {trendData.totals.incassato_totale.toLocaleString('it-IT')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2 font-medium bg-background/50 pill inline-block px-2 py-0.5 border border-black/5 dark:border-white/10">
                    {trendData.totals.previsto_totale > 0 
                      ? `${((trendData.totals.incassato_totale / trendData.totals.previsto_totale) * 100).toFixed(1)}% del previsto`
                      : '0% del previsto'
                    }
                  </p>
                </div>
                <div className="w-12 h-12 pill flex items-center justify-center shrink-0 ml-4 border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-6 rounded-[2rem] relative overflow-hidden group border border-[var(--border-soft)] transition-all duration-300 hover:border-brand-accent/20 hover:-translate-y-1"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 bg-brand-accent group-hover:opacity-20 transition-opacity" />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Previsto Totale</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">
                    € {trendData.totals.previsto_totale.toLocaleString('it-IT')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2 font-medium bg-background/50 pill inline-block px-2 py-0.5 border border-black/5 dark:border-white/10">
                    quote + rate pianificate
                  </p>
                </div>
                <div className="w-12 h-12 pill flex items-center justify-center shrink-0 ml-4 border bg-brand-accent/10 border-brand-accent/20 text-brand-accent">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-[2rem] relative overflow-hidden group border border-[var(--border-soft)] transition-all duration-300 hover:border-gold/20 hover:-translate-y-1"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 bg-gold group-hover:opacity-20 transition-opacity" />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Insoluti Recuperati</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">
                    € {trendData.totals.insoluti_recuperati.toLocaleString('it-IT')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2 font-medium bg-background/50 pill inline-block px-2 py-0.5 border border-black/5 dark:border-white/10">
                    {trendData.totals.incassato_totale > 0
                      ? `${((trendData.totals.insoluti_recuperati / trendData.totals.incassato_totale) * 100).toFixed(1)}% dell'incassato`
                      : '0% dell\'incassato'
                    }
                  </p>
                </div>
                <div className="w-12 h-12 pill flex items-center justify-center shrink-0 ml-4 border bg-gold/10 border-gold/20 text-gold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6 rounded-[2rem] relative overflow-hidden group border border-[var(--border-soft)] transition-all duration-300 hover:border-muted-foreground/20 hover:-translate-y-1"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 bg-muted group-hover:opacity-20 transition-opacity" />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Rate Future Residue</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">
                    € {trendData.totals.rate_future_residue.toLocaleString('it-IT')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2 font-medium bg-background/50 pill inline-block px-2 py-0.5 border border-black/5 dark:border-white/10">
                    non ancora in scadenza
                  </p>
                </div>
                <div className="w-12 h-12 pill flex items-center justify-center shrink-0 ml-4 border bg-muted/10 border-muted/20 text-muted-foreground">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </div>

          <FinancialTrendChart data={trendData} />

          <div className="flex items-center gap-4 my-8">
            <div className="h-[1px] flex-1 bg-black/5 dark:bg-white/5" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Dettaglio Pagamenti</span>
            <div className="h-[1px] flex-1 bg-black/5 dark:bg-white/5" />
          </div>
        </div>
      )}

      {/* Stats */}
      <StatsGrid
        items={[
          { label: 'Incassato', value: `€ ${stats.paid.toLocaleString('it-IT')}`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Da Riscuotere', value: `€ ${stats.pending.toLocaleString('it-IT')}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Rate Scadute', value: stats.overdue, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-accent transition-colors" />
          <input
            placeholder="Cerca per nome atleta..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="h-14 pl-14 w-full pill glass-card border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 font-medium placeholder:text-muted-foreground/60 bg-transparent text-foreground text-sm transition-all"
          />
        </div>
        <div className="flex flex-col md:flex-row w-full md:w-auto items-stretch md:items-center gap-2">
          <div className="flex items-center gap-1.5 p-1.5 glass-card rounded-2xl border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar">
            {(['all', 'pending', 'paid', 'overdue'] as const).map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(0) }}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  statusFilter === status ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20 scale-105' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                {status === 'all' ? 'Tutti' : status === 'pending' ? 'In Attesa' : status === 'paid' ? 'Pagati' : 'Scaduti'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={totalCount === 0 || isExporting}
              className="pill h-14 px-5 shrink-0 gap-2 border border-black/10 dark:border-white/10 hover:border-brand-accent transition-all font-black uppercase tracking-widest text-[10px] w-full md:w-auto justify-center disabled:opacity-50"
            >
              {isExporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? 'Esportazione...' : 'Esporta Excel'}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border-black/5 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-05)]">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atleta</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rata</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scadenza</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Importo</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Metodo</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ricevuta</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stato</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-6">
                        <div className="h-5 bg-[var(--surface-05)] pill w-full" />
                      </td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr key="error">
                    <td colSpan={8} className="px-6 py-6">
                      <QueryErrorState error={error} onRetry={() => refetch()} />
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="empty">
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground/60">
                        <FileText className="w-12 h-12" />
                        <p className="font-bold">Nessun pagamento trovato</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  payments.map(p => {
                    const isOverdue = p.status === 'overdue' || (p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date())
                    const MethodIcon = p.payment_method ? (METHOD_ICONS[p.payment_method] ?? CreditCard) : null
                    return (
                      <motion.tr
                        key={p.id} layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="group transition-colors hover:bg-[var(--surface-05)]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20">
                              <User className="w-4 h-4 text-brand-accent" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-foreground">{p.player.last_name} {p.player.first_name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{p.player.team_sector}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge tone="neutral">
                            {p.plan === 'carried_over' ? (
                              <span className="text-amber-500 font-black uppercase">Debito Pregresso</span>
                            ) : (
                              <>
                                {`${p.installment_no}ª Rata`}
                                {p.plan === 'annual' && <span className="text-brand-accent/60">· Unica</span>}
                              </>
                            )}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          {p.due_date ? (
                            <span className={cn('text-xs font-bold tabular-nums', isOverdue && p.status !== 'paid' ? 'text-red-500' : 'text-foreground/70')}>
                              {format(new Date(p.due_date), 'dd MMM yyyy', { locale: it })}
                              {isOverdue && p.status !== 'paid' && ' ⚠'}
                            </span>
                          ) : <span className="text-muted-foreground/60 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-0.5">
                            <p className="text-sm font-black tabular-nums text-foreground/90">
                              € {(p.paid_amount_eur ?? p.amount_eur ?? 0).toLocaleString('it-IT')}
                            </p>
                            {p.paid_amount_eur && p.amount_eur && p.paid_amount_eur !== p.amount_eur && (
                              <p className="text-[10px] text-muted-foreground/60">previsto: € {p.amount_eur}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {MethodIcon && p.payment_method ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70">
                              <MethodIcon className="w-4 h-4" />
                              {PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label}
                            </div>
                          ) : <span className="text-muted-foreground/60 text-xs italic">—</span>}
                        </td>
                        <td className="px-6 py-5">
                          {p.receipt_number ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 uppercase tracking-tighter">
                                <FileText className="w-3 h-3 text-brand-accent/60" /> N. {p.receipt_number}
                              </p>
                              {p.receipt_date && (
                                <p className="text-[10px] text-muted-foreground/60">
                                  {format(new Date(p.receipt_date), 'dd MMM yyyy', { locale: it })}
                                </p>
                              )}
                            </div>
                          ) : <span className="text-muted-foreground/60 text-xs italic">Non emessa</span>}
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="flex items-center gap-1.5 ml-auto text-[10px] font-black uppercase tracking-widest text-brand-accent hover:text-brand-accent/70 transition-colors group/btn"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {p.status === 'paid' ? 'Modifica' : 'Registra'}
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

      <Pagination currentPage={page} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} className="mt-6" />

      <PaymentModal
        isOpen={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      <NewPaymentModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const configs = {
    paid: { label: 'Pagato', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    pending: { label: 'In Attesa', icon: Clock, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    overdue: { label: 'Scaduto', icon: AlertCircle, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  }
  const { label, icon: Icon, className } = configs[status]
  return (
    <div className={cn('pill px-3 py-1.5 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 border', className)}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
  )
}

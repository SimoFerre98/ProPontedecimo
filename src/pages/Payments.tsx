import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  MoreVertical,
  User,
  Euro,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from "date-fns/format";
import { it } from "date-fns/locale/it";
import { paymentService, type PaymentStatus } from '@/services/paymentService'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/button'

export default function Payments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const pageSize = 15
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payments', search, statusFilter, page],
    queryFn: () => paymentService.getPayments(search, statusFilter, page, pageSize)
  })

  const payments = data?.data || []
  const totalCount = data?.count || 0

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) => 
      paymentService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })

  const stats = useMemo(() => {
    return {
      total: totalCount,
      paid: payments.filter((p: any) => p.status === 'paid').reduce((acc: number, p: any) => acc + (p.amount_eur ?? 0), 0),
      pending: payments.filter((p: any) => p.status === 'pending').reduce((acc: number, p: any) => acc + (p.amount_eur ?? 0), 0),
    }
  }, [payments, totalCount])

  const filteredPayments = payments // Server side handled now

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3 italic uppercase">
            Gestione <span className="text-primary NOT-italic">Pagamenti</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium border-l-2 border-primary/30 pl-3">
            Monitoraggio quote associative e rate stagionali.
          </p>
        </div>
        <Button className="pill bg-primary hover:bg-primary/90 text-white gap-2 h-12 px-6 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" /> Nuovo Pagamento
        </Button>
      </div>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Totale Previsto', value: stats.total, icon: Euro, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Incassato', value: stats.paid, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'In Attesa', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center justify-between border-white/5 group hover:border-primary/20 transition-all cursor-default"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-black text-foreground tabular-nums group-hover:text-primary transition-colors">
                € {stat.value.toLocaleString('it-IT')}
              </p>
            </div>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-inner", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
          <input 
            placeholder="Cerca per nome atleta o causale..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="h-16 pl-16 w-full text-xl pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary shadow-2xl focus:scale-[1.01] transition-all font-medium placeholder:text-muted-foreground/40 bg-transparent text-foreground focus:outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2 p-1.5 glass-card rounded-2xl border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar">
          {['all', 'pending', 'paid', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status as PaymentStatus | 'all')
                setPage(0)
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                statusFilter === status 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              {status === 'all' ? 'Tutti' : 
               status === 'pending' ? 'In Attesa' : 
               status === 'paid' ? 'Pagati' : 'Scaduti'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border-black/5 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atleta</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rata</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Importo</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ricevuta</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stato</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`payment-skeleton-row-${i}`} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-8">
                        <div className="h-6 bg-white/5 pill w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredPayments?.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key="empty-payments"
                  >
                    <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground/30">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-12 h-12" />
                        <p className="font-bold">Nessun pagamento trovato</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredPayments?.map((p, idx) => (
                    <motion.tr 
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group transition-colors hover:bg-white/[0.01]"
                    >
                      <td className="px-6 py-5 text-center font-bold text-muted-foreground/50 tabular-nums text-xs italic">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                              {p.player.last_name} {p.player.first_name}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{p.player.team_sector}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="pill bg-white/5 border border-white/10 px-3 py-1 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {p.installment_no}° Rata
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-sm tabular-nums text-foreground/90">
                        € {p.amount_eur?.toLocaleString('it-IT') ?? '0,00'}
                      </td>
                      <td className="px-6 py-5">
                        {p.receipt_number ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 uppercase tracking-tighter">
                              <FileText className="w-3 h-3 text-primary/60" />
                              N. {p.receipt_number}
                            </p>
                            {p.receipt_date && (
                              <p className="text-[10px] text-muted-foreground/60 font-medium lowercase">
                                {format(new Date(p.receipt_date), 'dd MMM yyyy', { locale: it })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground/20 uppercase italic transition-opacity group-hover:opacity-100 opacity-50">Non emessa</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge 
                          status={p.status} 
                          onClick={() => {
                            const statusOrder: PaymentStatus[] = ['pending', 'paid', 'overdue']
                            const currentIndex = statusOrder.indexOf(p.status)
                            const next = statusOrder[(currentIndex + 1) % statusOrder.length]
                            updateStatusMutation.mutate({ id: p.id, status: next })
                          }}
                        />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 pill hover:bg-white/10 text-muted-foreground hover:text-primary transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
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
    </div>
  )
}

function StatusBadge({ status, onClick }: Readonly<{ status: PaymentStatus; onClick: () => void }>) {
  const configs = {
    paid: {
      label: 'Pagato',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]"
    },
    pending: {
      label: 'In Attesa',
      icon: <Clock className="w-3.5 h-3.5" />,
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
    },
    overdue: {
      label: 'Scaduto',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      className: "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20 shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]"
    }
  }

  const { label, icon, className } = configs[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        "pill px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all active:scale-95",
        className
      )}
    >
      {icon}
      {label}
    </button>
  )
}

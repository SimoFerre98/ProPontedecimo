import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  MoreVertical,
  Calendar,
  User,
  Euro,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from "date-fns/format";
import { it } from "date-fns/locale/it";

type PaymentStatus = 'pending' | 'paid' | 'overdue'

interface Payment {
  id: string
  installment_no: number
  amount_eur: number | null
  receipt_number: string | null
  receipt_date: string | null
  status: PaymentStatus
  notes: string | null
  created_at: string
  player: {
    first_name: string
    last_name: string
    team_sector: string | null
  }
}

export default function Payments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const queryClient = useQueryClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          player:players(first_name, last_name, team_sector)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as Payment[]
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaymentStatus }) => {
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })

  const filteredPayments = payments?.filter(p => {
    const fullName = `${p.player.first_name} ${p.player.last_name}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  const stats = {
    total: payments?.reduce((acc, p) => acc + (p.amount_eur ?? 0), 0) ?? 0,
    paid: payments?.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.amount_eur ?? 0), 0) ?? 0,
    pending: payments?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount_eur ?? 0), 0) ?? 0,
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            <CreditCard className="w-10 h-10 text-primary" />
            Pagamenti
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Monitoraggio quote associative e rate stagionali
          </p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white pill px-6 py-3 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" />
          Nuovo Pagamento
        </button>
      </div>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 pill bg-primary/10 flex items-center justify-center text-primary">
            <Euro className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Totale Previsto</p>
            <p className="text-xl font-black tabular-nums">€ {stats.total.toLocaleString('it-IT')}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-3xl flex items-center gap-4 border-emerald-500/20">
          <div className="w-12 h-12 pill bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Incassato</p>
            <p className="text-xl font-black tabular-nums text-emerald-600">€ {stats.paid.toLocaleString('it-IT')}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-3xl flex items-center gap-4 border-amber-500/20">
          <div className="w-12 h-12 pill bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">In Attesa</p>
            <p className="text-xl font-black tabular-nums text-amber-600">€ {stats.pending.toLocaleString('it-IT')}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Cerca per nome atleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-medium placeholder:text-muted-foreground/50 backdrop-blur-md"
          />
        </div>
        <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-4 py-2 pill text-xs font-bold transition-all capitalize",
                statusFilter === f 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "hover:bg-white/5 text-muted-foreground"
              )}
            >
              {f === 'all' ? 'Tutti' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
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
                {(() => {
                  if (isLoading) {
                    return Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-row-${i}`} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-8">
                          <div className="h-6 bg-white/5 pill w-full" />
                        </td>
                      </tr>
                    ))
                  }
                  
                  if (filteredPayments?.length === 0) {
                    return (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key="empty-state"
                      >
                        <td colSpan={7} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-30">
                            <FileText className="w-12 h-12" />
                            <p className="font-bold">Nessun pagamento trovato</p>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  }

                  return filteredPayments?.map((p, idx) => (
                    <motion.tr 
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                      className="group transition-colors"
                    >
                      <td className="px-6 py-5 text-center font-bold text-muted-foreground/50 tabular-nums text-xs italic">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 pill bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                              {p.player.last_name} {p.player.first_name}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">{p.player.team_sector}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="pill bg-white/5 border border-white/10 px-3 py-1 inline-flex items-center gap-2 text-xs font-black">
                          {p.installment_no}° Rata
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-sm tabular-nums">
                        € {p.amount_eur?.toLocaleString('it-IT') ?? '0,00'}
                      </td>
                      <td className="px-6 py-5">
                        {p.receipt_number ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              N. {p.receipt_number}
                            </p>
                            {p.receipt_date && (
                              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(p.receipt_date), 'dd MMM yyyy', { locale: it })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground/30 uppercase italic">Non emessa</span>
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
                        <button className="p-2 pill hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                })()}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, onClick }: Readonly<{ status: PaymentStatus; onClick: () => void }>) {
  const configs = {
    paid: {
      label: 'Pagato',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
    },
    pending: {
      label: 'In Attesa',
      icon: <Clock className="w-3.5 h-3.5" />,
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
    },
    overdue: {
      label: 'Scaduto',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      className: "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
    }
  }

  const { label, icon, className } = configs[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        "pill px-3 py-1.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border transition-all active:scale-90",
        className
      )}
    >
      {icon}
      {label}
    </button>
  )
}

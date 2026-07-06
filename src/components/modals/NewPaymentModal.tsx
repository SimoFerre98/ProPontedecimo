import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, User, Euro, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { paymentService, type PaymentPlan } from '@/services/paymentService'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface NewPaymentModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PlayerOption {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
}

export default function NewPaymentModal({ isOpen, onClose }: NewPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [searchPlayer, setSearchPlayer] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null)
  const [plan, setPlan] = useState<PaymentPlan>('installments')
  const [amount, setAmount] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isOpen) { setSelectedPlayer(null); setSearchPlayer(''); setAmount(''); setPlan('installments'); return }
    supabase.from('players').select('id, first_name, last_name, team_sector').eq('is_active', true).order('last_name')
      .then(({ data }) => setPlayers(data || []))
  }, [isOpen])

  const filtered = players.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchPlayer.toLowerCase())
  ).slice(0, 6)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayer || !amount) return
    setLoading(true)
    try {
      const amountNum = parseFloat(amount)
      const currentYear = new Date().getFullYear()
      const sep15 = `${currentYear}-09-15`
      const nextYear = new Date().getMonth() >= 8 ? currentYear + 1 : currentYear
      const jan15 = `${nextYear}-01-15`

      const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).single()
      if (!season) throw new Error("No active season found")

      if (plan === 'annual') {
        // Unica rata con scadenza 15 settembre
        await paymentService.upsertPayment({
          player_id: selectedPlayer.id,
          season_id: season.id,
          installment_no: 1,
          plan: 'annual',
          due_date: sep15,
          amount_eur: amountNum,
          status: 'pending',
        })
      } else {
        // Due rate uguali
        const half = Math.round((amountNum / 2) * 100) / 100
        await paymentService.upsertPayment({ player_id: selectedPlayer.id, season_id: season.id, installment_no: 1, plan: 'installments', due_date: sep15, amount_eur: half, status: 'pending' })
        await paymentService.upsertPayment({ player_id: selectedPlayer.id, season_id: season.id, installment_no: 2, plan: 'installments', due_date: jan15, amount_eur: amountNum - half, status: 'pending' })
      }

      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['overduePaymentsCount'] })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isValid = !!selectedPlayer && !!amount && parseFloat(amount) > 0

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
            className="relative w-[95vw] max-w-md max-h-[90vh] glass-card rounded-[3rem] shadow-2xl border-black/5 dark:border-white/10 overflow-hidden overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase italic text-foreground">
                  Nuova <span className="text-primary not-italic">Quota</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
                  Assegna quota associativa a un atleta
                </p>
              </div>
              <button onClick={onClose} className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
              {/* Selezione atleta */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Atleta <span className="text-red-500">*</span>
                </span>
                {selectedPlayer ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/30 bg-primary/5">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground">{selectedPlayer.last_name} {selectedPlayer.first_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{selectedPlayer.team_sector}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedPlayer(null)} className="text-muted-foreground/50 hover:text-foreground text-xs font-bold transition-colors">
                      Cambia
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input
                        placeholder="Cerca atleta..."
                        value={searchPlayer}
                        onChange={e => setSearchPlayer(e.target.value)}
                        className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary font-bold pl-10 text-sm"
                      />
                    </div>
                    {searchPlayer && (
                      <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                        {filtered.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 text-center py-3">Nessun atleta trovato</p>
                        ) : filtered.map(p => (
                          <button
                            key={p.id} type="button"
                            onClick={() => { setSelectedPlayer(p); setSearchPlayer('') }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-primary/10 transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{p.last_name} {p.first_name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{p.team_sector}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Piano di pagamento */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">Piano di Pagamento</span>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'annual' as PaymentPlan, label: 'Quota Unica', sub: 'Scad. 15 Settembre' },
                    { value: 'installments' as PaymentPlan, label: '2 Rate', sub: '15 Set + 15 Gen' },
                  ]).map(opt => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setPlan(opt.value)}
                      className={cn(
                        'flex flex-col items-start px-4 py-3 rounded-2xl border text-left transition-all',
                        plan === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-black/10 dark:border-white/10 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      <span className="text-sm font-black">{opt.label}</span>
                      <span className="text-[10px] font-bold opacity-70 mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Importo totale */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Importo Totale <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <Euro className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                  <Input
                    type="number" step="0.01" min="0" required
                    placeholder="es. 250.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-14"
                  />
                </div>
                {plan === 'installments' && amount && parseFloat(amount) > 0 && (
                  <p className="text-[10px] text-muted-foreground/60 pl-3">
                    1ª rata: € {(parseFloat(amount) / 2).toFixed(2)} · 2ª rata: € {(parseFloat(amount) / 2).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Azioni */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 pill font-black uppercase tracking-widest text-[10px]">
                  Annulla
                </Button>
                <Button
                  type="submit" disabled={loading || !isValid}
                  className="flex-[2] h-12 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Crea Quota
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, User, Euro, Users, Plus, Minus, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { paymentService } from '@/services/paymentService'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { useFormModal } from '@/hooks/useFormModal'

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

const MONTHS_STEP_DAYS = 60

export default function NewPaymentModal({ isOpen, onClose }: NewPaymentModalProps) {
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [searchPlayer, setSearchPlayer] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null)
  const [amount, setAmount] = useState('')
  
  const currentYear = new Date().getFullYear()
  const defaultFirstDate = `${currentYear}-09-15`
  
  const [installments, setInstallments] = useState<{ amount_eur: number; due_date: string }[]>([
    { amount_eur: 0, due_date: defaultFirstDate }
  ])

  const { selectedSeasonId } = useAppStore()

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlayer(null)
      setSearchPlayer('')
      setAmount('')
      setInstallments([{ amount_eur: 0, due_date: defaultFirstDate }])
      return
    }
    supabase.from('players').select('id, first_name, last_name, team_sector').eq('is_active', true).order('last_name')
      .then(({ data }) => setPlayers(data || []))
  }, [isOpen])

  const filtered = players.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchPlayer.toLowerCase())
  ).slice(0, 6)

  // Splitta l'importo totale equamente sulle rate correnti
  const splitEvenly = (total: number, count: number, currentInstallments: typeof installments) => {
    if (count <= 0) return []
    const base = Math.floor((total / count) * 100) / 100
    let allocated = 0
    return currentInstallments.map((inst, i) => {
      const amount = i === count - 1 ? Math.round((total - allocated) * 100) / 100 : base
      allocated += base
      return { ...inst, amount_eur: amount }
    })
  }

  // Cambia l'importo totale e aggiorna di conseguenza la somma delle rate
  const handleAmountChange = (val: string) => {
    setAmount(val)
    const total = parseFloat(val) || 0
    setInstallments(prev => splitEvenly(total, prev.length, prev))
  }

  // Stepper per numero rate
  const handleSetRateCount = (n: number) => {
    const newCount = Math.max(1, Math.min(12, n))
    const total = parseFloat(amount) || 0
    let newInsts = [...installments]

    if (newCount > installments.length) {
      // Aggiungi righe
      const lastDate = installments.length > 0 ? installments[installments.length - 1].due_date : defaultFirstDate
      for (let i = installments.length; i < newCount; i++) {
        const lastD = new Date(lastDate + 'T00:00:00')
        lastD.setDate(lastD.getDate() + MONTHS_STEP_DAYS)
        const nextDateStr = lastD.toISOString().split('T')[0]
        newInsts.push({ amount_eur: 0, due_date: nextDateStr })
      }
    } else if (newCount < installments.length) {
      // Rimuovi righe
      newInsts = newInsts.slice(0, newCount)
    }

    newInsts = splitEvenly(total, newCount, newInsts)
    setInstallments(newInsts)
  }

  const handleInstallmentAmountChange = (idx: number, val: number) => {
    setInstallments(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], amount_eur: val }
      return next
    })
  }

  const handleInstallmentDateChange = (idx: number, val: string) => {
    setInstallments(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], due_date: val }
      return next
    })
  }

  const handleSplitEvenlyBtn = () => {
    const total = parseFloat(amount) || 0
    setInstallments(prev => splitEvenly(total, prev.length, prev))
  }

  const totalTarget = parseFloat(amount) || 0
  const currentSum = useMemo(() => {
    return installments.reduce((sum, inst) => sum + (inst.amount_eur || 0), 0)
  }, [installments])

  const isSumValid = useMemo(() => {
    return Math.abs(currentSum - totalTarget) <= 0.01
  }, [currentSum, totalTarget])

  const areDatesValid = useMemo(() => {
    return installments.every(inst => !!inst.due_date)
  }, [installments])

  const areAmountsValid = useMemo(() => {
    return installments.every(inst => inst.amount_eur > 0)
  }, [installments])

  const isValid = selectedPlayer && totalTarget > 0 && isSumValid && areDatesValid && areAmountsValid

  const { loading, submit: handleSubmit } = useFormModal({
    onSubmit: async () => {
      // Non un return silenzioso: l'hook interpreta qualsiasi ritorno senza errore
      // come successo (invalida le query e chiude il modale). `isValid`/il disabled
      // sul button non coprono `selectedSeasonId` (store globale, non nel form), quindi
      // questo path è realmente raggiungibile se la stagione non è ancora selezionata.
      if (!selectedPlayer || !selectedSeasonId) {
        throw new Error('Seleziona un atleta e assicurati che una stagione sia attiva prima di salvare.')
      }
      await paymentService.createPaymentPlan(
        selectedPlayer.id,
        selectedSeasonId,
        totalTarget,
        installments
      )
    },
    invalidateKeys: [['payments'], ['overduePaymentsCount']],
    onClose,
  })

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
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase italic text-foreground">
                  Nuova <span className="text-primary not-italic">Quota</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
                  Piano rate personalizzato per atleta
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

              {selectedPlayer && (
                <>
                  {/* Importo totale */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                      Importo Totale <span className="text-red-500">*</span>
                    </span>
                    <div className="relative">
                      <Euro className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                      <Input
                        type="number" step="0.01" min="0" required
                        placeholder="es. 300.00"
                        value={amount}
                        onChange={e => handleAmountChange(e.target.value)}
                        className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-14"
                      />
                    </div>
                  </div>

                  {/* Stepper Numero Rate */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">Numero di Rate</span>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleSetRateCount(installments.length - 1)}
                          disabled={installments.length <= 1}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="min-w-[4.5rem] flex flex-col items-center justify-center">
                          <span className="font-mono text-base font-black text-foreground leading-none">{installments.length}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                            {installments.length === 1 ? 'rata' : 'rate'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetRateCount(installments.length + 1)}
                          disabled={installments.length >= 12}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSplitEvenlyBtn}
                        className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all text-[9px] font-black uppercase tracking-widest"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Dividi Equamente
                      </button>
                    </div>
                  </div>

                  {/* Elenco Rate */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap pl-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Piano Rate</span>
                      <div className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
                        isSumValid
                          ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                      )}>
                        {isSumValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        Somma rate: € {currentSum.toLocaleString('it-IT', { minimumFractionDigits: 2 })} / € {totalTarget.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar">
                      {installments.map((inst, i) => (
                        <div key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 focus-within:border-primary/30 transition-colors">
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 shrink-0">
                            <span className="text-sm font-black text-primary leading-none">{i + 1}</span>
                            <span className="text-[7px] font-black uppercase tracking-wider text-primary/70 mt-0.5">Rata</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 pl-1">Importo</span>
                            <div className="relative">
                              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                              <Input
                                type="number" step="0.01" min="0" required
                                value={inst.amount_eur || ''}
                                onChange={e => handleInstallmentAmountChange(i, parseFloat(e.target.value) || 0)}
                                className="h-9 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-xs font-bold pl-8 pr-2"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 pl-1">Scadenza</span>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                              <Input
                                type="date" required
                                value={inst.due_date}
                                onChange={e => handleInstallmentDateChange(i, e.target.value)}
                                className="h-9 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-xs font-bold pl-8 pr-2"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 pl-3">
                      Tolleranza consentita: ± € 0,01 rispetto all'importo totale.
                    </p>
                  </div>
                </>
              )}

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
                  Crea Piano Rate
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

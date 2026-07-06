import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X, Loader2, ShieldAlert, CreditCard } from 'lucide-react'
import { athleteService, type Player } from '@/services/athleteService'
import { cn } from '@/lib/utils'

interface DeleteAthleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  athlete: Player | null
}

export default function DeleteAthleteModal({ isOpen, onClose, onSuccess, athlete }: Readonly<DeleteAthleteModalProps>) {
  const [loading, setLoading] = useState(false)
  const [checkingPayments, setCheckingPayments] = useState(true)
  const [hasDebts, setHasDebts] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const checkPayments = useCallback(async () => {
    if (!athlete) return
    setCheckingPayments(true)
    try {
      const debts = await athleteService.hasUnfinishedPayments(athlete.id)
      setHasDebts(debts)
    } catch (error) {
      console.error('Error checking payments:', error)
      setErrorMsg('Errore durante la verifica dei pagamenti.')
    } finally {
      setCheckingPayments(false)
    }
  }, [athlete])

  useEffect(() => {
    if (isOpen && athlete) {
      checkPayments()
      setInputValue('')
      setErrorMsg(null)
    }
  }, [isOpen, athlete, checkPayments])

  const expectedName = athlete ? `${athlete.first_name} ${athlete.last_name}`.trim().toLowerCase() : ''
  const isConfirmValid = inputValue.trim().toLowerCase() === expectedName

  const handleDelete = async () => {
    if (!athlete || !isConfirmValid || hasDebts) return
    
    setLoading(true)
    setErrorMsg(null)
    try {
      await athleteService.deleteAthlete(athlete.id)
      onSuccess()
    } catch (error) {
      console.error('Error deleting athlete:', error)
      setErrorMsg("Errore durante l'eliminazione. Potrebbero esserci dati correlati che impediscono la cancellazione.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !athlete) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-[95vw] max-w-md max-h-[90vh] glass-card rounded-[3rem] p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] border border-red-500/20 overflow-hidden overflow-y-auto no-scrollbar"
          >
            {/* Background Decor */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="w-14 h-14 pill bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-foreground uppercase italic leading-none">
                  Elimina <span className="text-primary not-italic">Atleta</span>
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">
                  Azione irreversibile
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {checkingPayments ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verifica pagamenti...</p>
              </div>
            ) : hasDebts ? (
              /* Blocked State */
              <div className="space-y-6">
                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 pill bg-amber-500/20 flex items-center justify-center text-amber-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground uppercase tracking-tight">Cancellazione Bloccata</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      L'atleta <strong>{athlete.first_name} {athlete.last_name}</strong> ha pagamenti in sospeso o scaduti.
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground/70 leading-relaxed italic text-center px-4">
                  Per procedere con l'eliminazione, è necessario prima regolarizzare o rimuovere i pagamenti associati nella sezione Amministrazione.
                </p>

                <button
                  onClick={onClose}
                  className="w-full h-14 pill bg-foreground text-background font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
                >
                  Ho Capito
                </button>
              </div>
            ) : (
              /* Confirmation State */
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Stai per eliminare definitivamente:
                  </p>
                  <p className="text-lg font-black text-foreground uppercase italic">
                    {athlete.last_name} <span className="text-primary not-italic font-bold">{athlete.first_name}</span>
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[11px] font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">
                      Copia il nome per confermare:
                    </p>
                    <p className="text-sm font-black text-foreground mb-4 bg-background/50 px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 select-all text-center">
                      {athlete.first_name} {athlete.last_name}
                    </p>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Scrivi qui..."
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && isConfirmValid && !loading) void handleDelete() }}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border text-sm font-bold text-center transition-all bg-transparent focus:outline-none",
                        isConfirmValid 
                          ? "border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                          : "border-black/10 dark:border-white/10 focus:border-red-500/50"
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 h-14 pill bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={!isConfirmValid || loading}
                    className="flex-[1.5] h-14 pill bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-2xl shadow-red-500/40 active:scale-95"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Elimina Atleta
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

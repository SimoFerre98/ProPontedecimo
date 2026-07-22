import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HeartPulse, User, Calendar, Save } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { medicalService, type MedicalVisitRecord } from '@/services/medicalService'
import { useFormModal } from '@/hooks/useFormModal'

interface MedicalVisitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  record: MedicalVisitRecord | null
}

export default function MedicalVisitModal({ isOpen, onClose, onSuccess, record }: Readonly<MedicalVisitModalProps>) {
  const [medicalExpiry, setMedicalExpiry] = useState('')

  useEffect(() => {
    if (isOpen && record) {
      setMedicalExpiry(record.medical_expiry || '')
    } else {
      setMedicalExpiry('')
    }
  }, [isOpen, record])

  const { loading, submit: handleSubmit } = useFormModal({
    onSubmit: async () => {
      // Invariante garantita dal render (isOpen && record &&), ma usiamo throw
      // invece di return silenzioso: l'hook interpreta qualsiasi ritorno senza
      // errore come successo e chiamerebbe onClose().
      if (!record) throw new Error('record non disponibile')
      await medicalService.updateMedicalExpiry(record.id, medicalExpiry || null)
    },
    // Invalida tutte le query correlate per aggiornare liste, stats e campanella
    invalidateKeys: [['medical-visits'], ['medical-visits-stats'], ['notifications']],
    onSuccess,
    onClose,
  })

  return (
    <AnimatePresence>
      {isOpen && record && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-[95vw] max-w-2xl glass-card p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 pill bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20 shadow-inner">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase leading-none">Aggiorna <span className="text-brand-accent not-italic">Visita</span></h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="p-4 glass-card rounded-2xl flex items-center gap-4 border border-black/5 dark:border-white/5">
                <div className="w-10 h-10 pill bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                  <User className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase">{record.last_name} {record.first_name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{record.team_sector || 'Nessun Settore'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="medical-expiry-date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">Data di Scadenza del Certificato</label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                  <Input
                    id="medical-expiry-date"
                    type="date"
                    required
                    value={medicalExpiry}
                    onChange={e => setMedicalExpiry(e.target.value)}
                    className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-brand-accent text-base pl-14 font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  className="flex-1 h-14 pill font-black uppercase tracking-widest text-[10px] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !medicalExpiry}
                  className="flex-[2] h-14 pill bg-brand-accent hover:bg-brand-accent/90 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand-accent/40 gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner size="sm" tone="white" /> : <Save className="w-5 h-5" />}
                  Aggiorna Scadenza
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

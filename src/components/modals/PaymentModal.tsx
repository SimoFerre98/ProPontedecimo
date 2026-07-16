import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, Euro, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { paymentService, PAYMENT_METHODS, type PaymentReference, type PaymentMethod } from '@/services/paymentService'
import { useFormModal } from '@/hooks/useFormModal'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: PaymentReference | null
}

export default function PaymentModal({ isOpen, onClose, payment }: PaymentModalProps) {
  const [paidAmount, setPaidAmount] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState<PaymentMethod>('contanti')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen && payment) {
      setPaidAmount(payment.paid_amount_eur?.toString() || payment.amount_eur?.toString() || '')
      setReceiptNumber(payment.receipt_number || '')
      setReceiptDate(payment.receipt_date || new Date().toISOString().split('T')[0])
      setMethod((payment.payment_method as PaymentMethod) || 'contanti')
      setNotes(payment.notes || '')
    }
  }, [isOpen, payment])

  const { loading, submit: handleSubmit } = useFormModal({
    onSubmit: async () => {
      if (!payment) return
      await paymentService.recordPayment(payment.id, {
        paid_amount_eur: parseFloat(paidAmount) || 0,
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        payment_method: method,
        notes: notes || undefined,
      })
    },
    invalidateKeys: [['payments'], ['overduePaymentsCount']],
    onClose,
  })

  const isValid = paidAmount !== '' && parseFloat(paidAmount) > 0 && receiptNumber.trim() !== '' && receiptDate !== ''

  return (
    <AnimatePresence>
      {isOpen && payment && (
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
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase italic text-foreground">
                  Registra <span className="text-primary not-italic">Pagamento</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
                  {payment.player.last_name} {payment.player.first_name} — {`${payment.installment_no}ª Rata`}
                </p>
              </div>
              <button onClick={onClose} className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
              {/* Importo */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Importo Pagato <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <Euro className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                  <Input
                    type="number" step="0.01" min="0" required
                    placeholder={payment.amount_eur?.toString() || '0.00'}
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-14"
                  />
                </div>
                {payment.amount_eur && (
                  <p className="text-[10px] text-muted-foreground/50 pl-3">Importo previsto: € {payment.amount_eur}</p>
                )}
              </div>

              {/* Metodo di pagamento */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Metodo di Pagamento <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold transition-all',
                        method === m.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-black/10 dark:border-white/10 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numero ricevuta + data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                    N° Ricevuta <span className="text-red-500">*</span>
                  </span>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input
                      required placeholder="es. 001"
                      value={receiptNumber}
                      onChange={e => setReceiptNumber(e.target.value)}
                      className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary font-bold pl-10 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                    Data <span className="text-red-500">*</span>
                  </span>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input
                      type="date" required
                      value={receiptDate}
                      onChange={e => setReceiptDate(e.target.value)}
                      className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary font-bold pl-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">Note (opzionale)</span>
                <textarea
                  rows={2}
                  placeholder="Eventuali note..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-2xl glass-card border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:outline-none px-5 py-3 text-sm font-medium placeholder:text-muted-foreground/40 bg-transparent text-foreground resize-none"
                />
              </div>

              {/* Azioni */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 pill font-black uppercase tracking-widest text-[10px]">
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isValid}
                  className="flex-[2] h-12 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Conferma Pagamento
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

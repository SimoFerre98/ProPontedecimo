import { useState } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/errors'

/**
 * Hook unificato per i modali con singola azione di submit.
 *
 * Centralizza il pattern ricorrente:
 *   setLoading(true) → onSubmit() → invalidateQueries → onSuccess?() → onClose()
 *   catch → toast.error(getErrorMessage)   // il modale resta aperto, i dati non si perdono
 *   finally → setLoading(false)
 *
 * Uso minimale:
 *   const { loading, submit } = useFormModal({
 *     onSubmit: () => myService.doSomething(payload),
 *     invalidateKeys: [['my-query']],
 *     onClose,
 *   })
 *   <form onSubmit={submit}>…</form>
 *
 * Modali che seguono questo pattern (migrati in US-036):
 *   AddAthleteModal, AddInventoryModal, NewPaymentModal, PaymentModal, MedicalVisitModal
 *
 * Modali esclusi (forma diversa — non forzare in questo hook):
 *   EventModal, TaskModal      — due azioni indipendenti nello stesso modale (submit + delete, loading separati)
 *   DeleteAthleteModal         — contratto diverso: non invalida query proprie, non chiama onClose() in caso di successo
 *   ProfileModal               — 4 azioni asincrone indipendenti (nome, avatar, password, …)
 *   NewSeasonWizardModal       — wizard multi-step con operazioni scaglionate
 *   SettingsModal, SendEmailModal, CalendarModal, PlayerPaymentSummaryModal — non seguono il pattern
 */

interface UseFormModalOptions {
  /** La chiamata asincrona da eseguire al submit (già pronta, senza try/catch) */
  onSubmit: () => Promise<void>
  /** Query key da invalidare in caso di successo. Ogni elemento è una singola QueryKey. */
  invalidateKeys?: QueryKey[]
  /** Callback opzionale aggiuntiva in caso di successo, eseguita prima di onClose */
  onSuccess?: () => void
  /** Callback per chiudere il modale, chiamata solo in caso di successo */
  onClose: () => void
}

interface UseFormModalResult {
  loading: boolean
  /** Handler da passare a onSubmit del form o da chiamare direttamente */
  submit: (e?: React.FormEvent) => Promise<void>
}

export function useFormModal({
  onSubmit,
  invalidateKeys,
  onSuccess,
  onClose,
}: UseFormModalOptions): UseFormModalResult {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    try {
      await onSubmit()
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          await queryClient.invalidateQueries({ queryKey: key })
        }
      }
      onSuccess?.()
      onClose()
    } catch (error) {
      // Non chiamare onClose() nel catch: i dati inseriti devono restare visibili
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return { loading, submit }
}

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000

const VARIANT_CONFIG: Record<ToastVariant, { icon: typeof CheckCircle2; borderClass: string; iconClass: string }> = {
  success: { icon: CheckCircle2, borderClass: 'border-[var(--emerald)]/40', iconClass: 'text-[var(--emerald)]' },
  error: { icon: AlertCircle, borderClass: 'border-[var(--rose)]/40', iconClass: 'text-[var(--rose)]' },
  info: { icon: Info, borderClass: 'border-[var(--gold)]/40', iconClass: 'text-[var(--gold)]' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, variant, message }])
    setTimeout(() => dismiss(id), TOAST_DURATION_MS)
  }, [dismiss])

  const value: ToastContextValue = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 w-[min(92vw,22rem)]">
        <AnimatePresence>
          {toasts.map((t) => {
            const { icon: Icon, borderClass, iconClass } = VARIANT_CONFIG[t.variant]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'glass-card border pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl',
                  borderClass
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconClass)} strokeWidth={2.5} />
                <p className="text-[13px] font-bold text-foreground leading-snug flex-1">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast deve essere usato dentro un ToastProvider')
  }
  return ctx
}

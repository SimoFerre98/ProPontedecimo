import { AlertTriangle, RotateCw } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'

interface QueryErrorStateProps {
  error: unknown
  onRetry: () => void
  className?: string
}

export function QueryErrorState({ error, onRetry, className }: QueryErrorStateProps) {
  return (
    <div className={className ?? 'flex flex-col items-center justify-center gap-3 py-16 text-center'}>
      <div className="w-12 h-12 rounded-full bg-[var(--rose)]/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-[var(--rose)]" />
      </div>
      <p className="text-sm font-bold text-foreground max-w-sm">{getErrorMessage(error)}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full pill text-xs font-black uppercase tracking-wider hover:bg-[var(--surface-05)] transition-colors"
      >
        <RotateCw className="w-3.5 h-3.5" />
        Riprova
      </button>
    </div>
  )
}

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoadingSpinnerSize = 'sm' | 'md' | 'lg'
type LoadingSpinnerTone = 'primary' | 'white' | 'muted'

const SIZE_CLASSES: Record<LoadingSpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

const TONE_CLASSES: Record<LoadingSpinnerTone, string> = {
  primary: 'text-brand-accent',
  white: 'text-white',
  muted: 'text-muted-foreground',
}

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize
  tone?: LoadingSpinnerTone
  fullPage?: boolean
  label?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', tone = 'primary', fullPage = false, label, className }: Readonly<LoadingSpinnerProps>) {
  const icon = <Loader2 className={cn(SIZE_CLASSES[size], TONE_CLASSES[tone], 'animate-spin', className)} />

  if (!fullPage) return icon

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        {icon}
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'brand' | 'emerald' | 'gold' | 'rose'

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-05)] text-muted-foreground border-[var(--border-soft)]',
  brand: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20',
  emerald: 'bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20',
  gold: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/20',
  rose: 'bg-[var(--rose)]/10 text-[var(--rose)] border-[var(--rose)]/20',
}

interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, className, children }: Readonly<BadgeProps>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest w-fit',
        TONE_STYLES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}

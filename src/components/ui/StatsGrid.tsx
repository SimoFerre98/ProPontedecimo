import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface StatsGridItem {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: string
  bg?: string
  onClick?: () => void
  hint?: string
}

interface StatsGridProps {
  items: StatsGridItem[]
  variant?: 'grid' | 'badge'
  className?: string
  cardClassName?: string
  iconShape?: 'rounded' | 'circle'
}

export function StatsGrid({ items, variant = 'grid', className, cardClassName, iconShape = 'rounded' }: Readonly<StatsGridProps>) {
  if (variant === 'badge') {
    return (
      <div className={cn('flex flex-wrap gap-2 justify-center md:justify-end w-full md:w-auto', className)}>
        {items.map(item => (
          <div
            key={item.label}
            title={item.hint}
            className={cn('px-4 py-2 rounded-2xl border flex flex-col items-center min-w-[100px]', item.color)}
          >
            <span className="text-2xl font-black leading-none">{item.value}</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{item.label}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6', className)}>
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            onClick={item.onClick}
            title={item.hint}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn(
              'glass-card p-6 flex items-center justify-between border-[var(--border-soft)] group hover:border-brand-accent/20 transition-all',
              item.onClick && 'cursor-pointer active:scale-95',
              cardClassName
            )}
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
              <p className="text-3xl font-black text-foreground tabular-nums">{item.value}</p>
            </div>
            {Icon && (
              <div className={cn('w-12 h-12 flex items-center justify-center shadow-inner transition-transform group-hover:scale-110', iconShape === 'circle' ? 'pill' : 'rounded-2xl', item.bg)}>
                <Icon className={cn('w-6 h-6', item.color)} />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GUIDE_CHAPTERS } from '@/data/guideChapters'

export default function Guide() {
  const location = useLocation()
  const variant = location.pathname.startsWith('/portal') ? 'portal' : 'staff'
  const filteredChapters = GUIDE_CHAPTERS.filter(c => !c.audience || c.audience === 'both' || c.audience === variant)
  const [activeChapterId, setActiveChapterId] = useState(filteredChapters[0]?.id ?? GUIDE_CHAPTERS[0].id)
  const activeChapter = filteredChapters.find(c => c.id === activeChapterId) ?? filteredChapters[0]
  const ActiveContent = activeChapter.Component

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-4 flex flex-col gap-3">
        <div className="glass-card rounded-[2rem] p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black">Guida del gestionale</h1>
            <p className="text-xs text-muted-foreground">Per orientarti senza chiedere aiuto</p>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 no-scrollbar">
          {filteredChapters.map((chapter, index) => {
            const Icon = chapter.icon
            const isActive = chapter.id === activeChapterId
            const isAvailable = chapter.status === 'available'

            return (
              <button
                key={chapter.id}
                type="button"
                disabled={!isAvailable}
                aria-current={isActive}
                onClick={() => isAvailable && setActiveChapterId(chapter.id)}
                className={cn(
                  'flex-shrink-0 w-60 lg:w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all',
                  isActive && 'bg-brand-accent text-white shadow-lg',
                  !isActive && isAvailable && 'bg-muted/40 hover:bg-muted/60 border border-border',
                  !isAvailable && 'bg-muted/20 border border-border/50 cursor-not-allowed opacity-70'
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : isAvailable ? 'text-brand-accent' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold truncate', !isActive && !isAvailable && 'text-muted-foreground')}>
                    {index + 1}. {chapter.title}
                  </p>
                  <p className={cn('text-[11px] truncate', isActive ? 'text-white/80' : 'text-muted-foreground')}>
                    {chapter.description}
                  </p>
                </div>
                {!isAvailable && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold flex-shrink-0">
                    In arrivo
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <article className="lg:col-span-8 glass-card rounded-[2rem] p-6 sm:p-8">
        {ActiveContent && <ActiveContent variant={variant} />}
      </article>
    </div>
  )
}

import { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { format, addDays, startOfDay, isBefore, isAfter, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { StaffTask, TaskStatus } from '@/services/staffService'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_STYLES: Record<TaskStatus, string> = {
  done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  ready: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  archive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  created: "bg-brand-accent/10 text-brand-accent border-brand-accent/20 shadow-brand-accent/10",
  todo: "bg-brand-accent/10 text-brand-accent border-brand-accent/20 shadow-brand-accent/10",
  in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20"
}

interface TaskTimelineProps {
  tasks: StaffTask[]
  onTaskClick: (task: StaffTask) => void
}

export default function TaskTimeline({ tasks, onTaskClick }: Readonly<TaskTimelineProps>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Create an array of 21 days starting from 3 days ago to show some past and future
  const days = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 21 }).map((_, i) => addDays(today, i - 3))
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Filter tasks that fall within our timeline range
  const visibleTasks = useMemo(() => {
    const rangeStart = days[0]
    const rangeEnd = days.at(-1)!
    
    return tasks.filter(task => {
      if (!task.start_date || !task.end_date) return false
      const start = new Date(task.start_date)
      const end = new Date(task.end_date)
      return (isAfter(end, rangeStart) || isSameDay(end, rangeStart)) && 
             (isBefore(start, rangeEnd) || isSameDay(start, rangeEnd))
    }).slice(0, 8) // Limit to top 8 tasks for space
  }, [tasks, days])

  return (
    <div className="glass-card p-6 border-[var(--border-soft)] space-y-4 overflow-hidden relative group">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
            <Calendar className="w-4 h-4 text-brand-accent" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground italic">
            Timeline <span className="text-brand-accent not-italic">Settimanale</span>
          </h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')} className="p-1.5 pill hover:bg-[var(--surface-05)] text-muted-foreground transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll('right')} className="p-1.5 pill hover:bg-[var(--surface-05)] text-muted-foreground transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar relative pt-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="inline-flex min-w-full">
          {/* Timeline Grid */}
          <div className="relative">
            {/* Days Header */}
            <div className="flex border-b border-[var(--border-soft)] pb-2">
              {days.map((day) => {
                const isToday = isSameDay(day, new Date())
                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "w-24 shrink-0 flex flex-col items-center justify-center p-2 rounded-xl transition-all",
                      isToday ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/20" : "text-muted-foreground opacity-60"
                    )}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      {format(day, 'EEE', { locale: it })}
                    </span>
                    <span className="text-lg font-black leading-none mt-1">
                      {format(day, 'd')}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Task Bars Overlay */}
            <div className="mt-4 space-y-2 pb-2">
              {visibleTasks.map((task, idx) => {
                const start = new Date(task.start_date!)
                const end = new Date(task.end_date!)
                
                // Calculate position
                const actualStart = isBefore(start, days[0]) ? days[0] : start
                const actualEnd = isAfter(end, days.at(-1)!) ? days.at(-1)! : end
                
                const startPosIndex = days.findIndex(d => isSameDay(d, actualStart))
                const endPosIndex = days.findIndex(d => isSameDay(d, actualEnd))
                
                if (startPosIndex === -1) return null
                
                const width = (endPosIndex - startPosIndex + 1) * 96 // 96px per day
                const left = startPosIndex * 96

                return (
                  <motion.div
                    key={task.id}
                    layoutId={`task-bar-${task.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onTaskClick(task)}
                    className="relative cursor-pointer group/bar"
                    style={{ height: '32px' }}
                  >
                    <div 
                      className={cn(
                        "absolute h-full rounded-lg transition-all border shadow-lg flex items-center px-3 group-hover/bar:scale-[1.02] active:scale-95 group-hover/bar:brightness-110",
                        STATUS_STYLES[task.status]
                      )}
                      style={{ 
                        left: `${left}px`, 
                        width: `${width}px`,
                        maxWidth: 'calc(100% - 10px)',
                      }}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest truncate">
                        {task.title}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Vertical Today Line */}
            {days.some(d => isSameDay(d, new Date())) && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-brand-accent/40 shadow-[0_0_8px_oklch(from_var(--brand-accent)_l_c_h/0.5)] z-10 pointer-events-none"
                style={{ left: `${days.findIndex(d => isSameDay(d, new Date())) * 96 + 48}px` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-accent" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertCircle,
  ClipboardList
} from 'lucide-react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { calendarService, type CalendarEvent } from '@/services/calendarService'
import TaskModal from './TaskModal'
import MedicalVisitModal from './MedicalVisitModal'
import { medicalService } from '@/services/medicalService'
import { staffService, type StaffTask } from '@/services/staffService'

interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CalendarModal({ isOpen, onClose }: Readonly<CalendarModalProps>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null)
  const [selectedMedical, setSelectedMedical] = useState<MedicalVisitRecord | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false)

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', format(currentDate, 'yyyy-MM')],
    queryFn: () => calendarService.getEventsForMonth(currentDate),
    enabled: isOpen
  })

  // Calendar Logic
  const mouthStart = startOfMonth(currentDate)
  const mouthEnd = endOfMonth(mouthStart)
  const startDate = startOfWeek(mouthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(mouthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'task') {
      setSelectedTask(event.originalData)
      setIsTaskModalOpen(true)
    } else if (event.type === 'medical') {
      setSelectedMedical(event.originalData)
      setIsMedicalModalOpen(true)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[95vw] lg:w-[80vw] h-[90vh] glass-card overflow-hidden flex flex-col border border-white/20 shadow-2xl rounded-[3rem]"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-foreground">
                Calendario <span className="text-primary NOT-italic">Eventi</span>
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Monitoraggio Task e Visite Mediche
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center bg-black/20 p-1.5 pill border border-white/5">
              <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="px-6 min-w-[160px] text-center">
                <span className="text-lg font-black italic uppercase text-foreground">
                  {format(currentDate, 'MMMM yyyy', { locale: it })}
                </span>
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="grid grid-cols-7 gap-4 min-w-[800px]">
            {/* Week Headers */}
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center py-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  {day}
                </span>
              </div>
            ))}

            {/* Day Cells */}
            {calendarDays.map((day) => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.date), day))
              const isCurrentMonth = isSameMonth(day, mouthStart)
              
              return (
                <div 
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[120px] rounded-[2rem] p-4 transition-all border group/day relative",
                    isCurrentMonth ? "bg-white/5 border-white/5 hover:border-primary/30" : "opacity-20 border-transparent",
                    isToday(day) && "ring-1 ring-primary ring-offset-4 ring-offset-background bg-primary/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "text-xl font-black italic leading-none",
                      isToday(day) ? "text-primary" : "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && isCurrentMonth && (
                      <div className="flex gap-1">
                        {dayEvents.some(e => e.type === 'medical') && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />}
                        {dayEvents.some(e => e.type === 'task') && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.6)]" />}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto no-scrollbar pr-1">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter truncate transition-all flex items-center gap-1.5 border shrink-0",
                          event.type === 'task' 
                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
                        )}
                      >
                        {event.type === 'task' ? <ClipboardList className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                        {event.title.replace('Task: ', '').replace('Scadenza Visita: ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Staff Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scadenze Mediche</span>
          </div>
        </div>
      </motion.div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
      />

      <MedicalVisitModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        onSuccess={() => {
          setIsMedicalModalOpen(false)
        }}
        record={selectedMedical}
      />
    </div>
  )
}

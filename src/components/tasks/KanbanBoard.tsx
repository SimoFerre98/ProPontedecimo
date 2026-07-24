import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  User,
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StaffTask, TaskStatus } from '@/services/staffService'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface KanbanBoardProps {
  tasks: StaffTask[]
  onTaskClick: (task: StaffTask) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onAddTask: (status: TaskStatus) => void
}

const COLUMNS: { id: TaskStatus; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'created', label: 'Created', icon: Briefcase, color: 'text-slate-400' },
  { id: 'ready', label: 'Ready', icon: Clock, color: 'text-amber-500' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
  { id: 'archive', label: 'Archive', icon: Archive, color: 'text-muted-foreground' }
]

export default function KanbanBoard({ tasks, onTaskClick, onStatusChange, onAddTask }: Readonly<KanbanBoardProps>) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.effectAllowed = 'move'
    
    // Create a ghost image or just let browser handle it
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement
    ghost.style.position = 'absolute'
    ghost.style.top = '-1000px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => ghost.remove(), 0)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) {
      onStatusChange(taskId, newStatus)
    }
    setDraggedTaskId(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px] items-start pb-20 overflow-x-auto lg:overflow-visible">
      {COLUMNS.map((column) => (
        <div 
          key={column.id}
          className="flex flex-col gap-6"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", column.id === 'done' ? 'bg-emerald-500/10 border-emerald-500/20' : column.id === 'ready' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[var(--surface-05)] border-[var(--border-soft)]')}>
                <column.icon className={cn("w-4 h-4", column.color)} />
              </div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-foreground">
                {column.label}
              </h3>
              <span className="bg-[var(--surface-05)] text-[10px] font-black px-2 py-0.5 rounded-full text-muted-foreground border border-[var(--border-soft)]">
                {tasks.filter(t => t.status === column.id).length}
              </span>
            </div>
            
            <button 
              onClick={() => onAddTask(column.id)}
              className="p-2 pill hover:bg-[var(--surface-05)] text-muted-foreground transition-all group/add hover:text-brand-accent"
            >
              <Plus className="w-4 h-4 group-hover/add:scale-125 transition-transform" />
            </button>
          </div>

          {/* Column Tasks Container */}
          <div className={cn(
            "flex-1 flex flex-col gap-4 p-2 rounded-3xl min-h-[400px] transition-all duration-300",
            draggedTaskId ? "bg-brand-accent/5 ring-1 ring-brand-accent/20 ring-dashed" : "bg-transparent"
          )}>
            <AnimatePresence mode="popLayout">
              {tasks
                .filter(t => t.status === column.id)
                .map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    draggable
                    onDragStartCapture={(e) => handleDragStart(e, task.id)}
                    // dragend nativo scatta sempre (drop riuscito o annullato): serve per non lasciare la card bloccata a opacity-0 se il drag viene annullato
                    onDragEndCapture={() => setDraggedTaskId(null)}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "glass-card p-5 group/card cursor-grab active:cursor-grabbing hover:border-brand-accent/30 transition-all border-[var(--border-soft)] relative",
                      draggedTaskId === task.id && "opacity-0"
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-foreground italic uppercase tracking-tight group-hover/card:text-brand-accent transition-colors line-clamp-2">
                            {task.title}
                          </h4>
                        </div>
                        <button className="p-1 h-auto text-muted-foreground/30 hover:text-foreground transition-colors ml-2">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed line-clamp-2 uppercase font-bold tracking-tight">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
                        <div className="flex items-center gap-1.5 text-muted-foreground/40">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            {task.due_date ? format(new Date(task.due_date), 'd MMM', { locale: it }) : 'No data'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-tighter max-w-[60px] truncate">
                            {task.assignee?.full_name?.split(' ')[0] || 'Unassigned'}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                            {task.assignee?.avatar_url ? (
                              <img
                                src={task.assignee.avatar_url}
                                alt={task.assignee.full_name || 'Avatar'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-3 h-3 text-brand-accent/50" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            {tasks.filter(t => t.status === column.id).length === 0 && !draggedTaskId && (
              <div className="flex-1 border-2 border-dashed border-[var(--border-strong)] rounded-[2rem] flex flex-col items-center justify-center text-center p-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-50 transition-all">
                <AlertCircle className="w-6 h-6 mb-2 text-muted-foreground" />
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Empty</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

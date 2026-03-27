import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClipboardList, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Calendar,
  User,
  MoreVertical,
  Search,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { staffService, type TaskStatus } from '@/services/staffService'
import AddTaskModal from "@/components/modals/AddTaskModal"
import { format } from "date-fns/format";
import { it } from "date-fns/locale/it";

export default function StaffTasks() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['staff-tasks'],
    queryFn: () => staffService.getTasks()
  })

  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
                         task.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    todo: tasks?.filter(t => t.status === 'todo').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    done: tasks?.filter(t => t.status === 'done').length || 0
  }

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await staffService.updateTaskStatus(taskId, newStatus)
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'done': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'in_progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 glow-primary">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
              Staff <span className="text-primary NOT-italic">Tasks</span>
            </h1>
          </div>
          <p className="text-muted-foreground font-medium border-l-2 border-primary/30 pl-3 ml-1.5 translate-y-1">
            Gestione attività e coordinamento societario.
          </p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white pill px-6 py-3 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuova Task
        </button>
      </div>

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['staff-tasks'] })}
      />

      {/* ── Stats Carousel Mock ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Da Fare', value: stats.todo, icon: Circle, color: 'text-slate-400', bg: 'bg-slate-500/10' },
          { label: 'In Corso', value: stats.in_progress, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Completate', value: stats.done, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center justify-between border-white/5 group hover:border-primary/20 transition-all"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-black text-foreground tabular-nums">{stat.value}</p>
            </div>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cerca tra le attività..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-16 pl-14 glass-card border-black/5 dark:border-white/10 focus:border-primary/30 text-xl transition-all rounded-full text-foreground"
          />
        </div>
        <div className="flex p-1.5 glass-card rounded-2xl border border-black/5 dark:border-white/10 gap-1 overflow-x-auto whitespace-nowrap lg:whitespace-normal">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                statusFilter === status 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              {status === 'all' ? 'Tutte' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tasks Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {new Array(4).fill(0).map((_, i) => (
            <div key={`staff-skeleton-${i}`} className="h-48 glass-card border-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTasks?.map((task) => (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card group hover:border-primary/20 transition-all overflow-hidden border-white/5 flex flex-col"
              >
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                      getStatusColor(task.status)
                    )}>
                      {task.status.replace('_', ' ')}
                    </div>
                    <button className="p-2 h-auto pill hover:bg-white/10 text-muted-foreground transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-foreground leading-tight group-hover:text-primary transition-colors">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                    {task.due_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary/50" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {format(new Date(task.due_date), "d MMM yyyy", { locale: it })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center overflow-hidden">
                          {task.assignee?.avatar_url ? (
                            <img src={task.assignee.avatar_url} alt={task.assignee.full_name || 'Avatar'} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-xs font-black text-foreground/80 uppercase tracking-tighter">
                          {task.assignee?.full_name || 'Non Assegnato'}
                        </span>
                      </div>
                      
                      <div className="flex gap-1.5">
                        {task.status !== 'done' && (
                          <button
                            onClick={() => handleStatusUpdate(task.id, task.status === 'todo' ? 'in_progress' : 'done')}
                            className="w-10 h-10 pill bg-white/5 hover:bg-white/10 text-emerald-500 border border-white/5 flex items-center justify-center transition-all active:scale-90"
                            title={task.status === 'todo' ? 'Inizia Task' : 'Completa Task'}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredTasks?.length === 0 && (
            <div className="col-span-full py-20 glass-card border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-foreground italic">Nessuna task trovata</p>
                <p className="text-sm text-muted-foreground font-medium">Prova a cambiare i filtri o premi "+" per crearne una nuova.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

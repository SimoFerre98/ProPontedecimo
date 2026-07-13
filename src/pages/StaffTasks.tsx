import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  ClipboardList, 
  Plus, 
  Search,
  Filter,
  LayoutGrid,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { staffService, type TaskStatus, type StaffTask } from '@/services/staffService'
import TaskModal from "@/components/modals/TaskModal"
import KanbanBoard from "@/components/tasks/KanbanBoard"
import TaskTimeline from "@/components/tasks/TaskTimeline"
import TaskListView from "@/components/tasks/TaskListView"

export default function StaffTasks() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('created')
  const [view, setView] = useState<'board' | 'list' | 'timeline'>('board')
  
  const queryClient = useQueryClient()

  const { data: tasks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-tasks'],
    queryFn: () => staffService.getTasks()
  })

  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
                         task.description?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  }) || []

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await staffService.updateTaskStatus(taskId, newStatus)
      queryClient.setQueryData(['staff-tasks'], (old: StaffTask[] | undefined) => {
        if (!old) return old
        return old.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const handleOpenEdit = (task: StaffTask) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleOpenAdd = (status: TaskStatus = 'created') => {
    setSelectedTask(null)
    setDefaultStatus(status)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center border border-primary/20 glow-primary shadow-inner">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Sprint Mode</span>
                <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase italic leading-none">
                Gestione <span className="text-primary not-italic">Task</span>
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground font-medium border-l-2 border-primary/30 pl-4 ml-2 max-w-xl text-lg italic">
            Coordinamento delle attività societarie e sportive della Pontedecimo.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Totale Attività</span>
            <span className="text-2xl font-black tabular-nums">{tasks?.length || 0}</span>
          </div>
          <button 
            onClick={() => handleOpenAdd()}
            className="h-16 bg-primary hover:bg-primary/90 text-white pill px-8 font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-2xl shadow-primary/30 transition-all active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Nuovo Task
          </button>
        </div>
      </div>

      {/* ── Timeline (Summary) ── */}
      <div className="w-full">
        <TaskTimeline tasks={tasks || []} onTaskClick={handleOpenEdit} />
      </div>

      {/* ── Filters & View Switcher ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView('board')}
            className={cn(
              "flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all relative pb-2",
              view === 'board' ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"
            )}
          >
            <Layers className="w-4 h-4" />
            Board View
            {view === 'board' && <motion.div layoutId="view-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button 
            onClick={() => setView('list')}
            className={cn(
              "flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all relative pb-2",
              view === 'list' ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            List View
            {view === 'list' && <motion.div layoutId="view-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button 
            onClick={() => setView('timeline')}
            className={cn(
              "flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all relative pb-2",
              view === 'timeline' ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"
            )}
          >
            <Calendar className="w-4 h-4" />
            Agenda
            {view === 'timeline' && <motion.div layoutId="view-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        <div className="flex items-center gap-4 flex-1 md:max-w-md">
          <div className="relative group/search flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within/search:text-primary transition-colors" />
            <Input 
              placeholder="Cerca attività..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-11 glass-card border-white/10 focus:border-primary/30 text-xs font-bold tracking-tight transition-all rounded-full text-foreground placeholder:text-muted-foreground/30"
            />
          </div>
          <button className="p-2.5 pill bg-white/5 border border-white/10 text-muted-foreground/50 hover:text-foreground transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Active View ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={`kanban-skeleton-${i}`} className="h-[600px] glass-card border-white/5 animate-pulse rounded-[2.5rem]" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card rounded-[2rem]">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      ) : (
        <div className="mt-2 min-h-[600px]">
          {view === 'board' && (
            <KanbanBoard 
              tasks={filteredTasks} 
              onTaskClick={handleOpenEdit}
              onStatusChange={handleStatusUpdate}
              onAddTask={handleOpenAdd}
            />
          )}
          {view === 'list' && (
            <TaskListView 
              tasks={filteredTasks} 
              onTaskClick={handleOpenEdit} 
            />
          )}
          {view === 'timeline' && (
            <div className="space-y-6">
              <div className="glass-card p-10 flex flex-col items-center justify-center border border-primary/20 bg-primary/5 rounded-[3rem]">
                <Calendar className="w-12 h-12 mb-4 text-primary opacity-50" />
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Modalità Agenda</h3>
                <p className="text-sm text-muted-foreground font-medium italic mt-2">Visualizzazione estesa della programmazione settimanale</p>
              </div>
              <TaskTimeline tasks={filteredTasks} onTaskClick={handleOpenEdit} />
            </div>
          )}
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        defaultStatus={defaultStatus}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['staff-tasks'] })}
      />
    </div>
  )
}

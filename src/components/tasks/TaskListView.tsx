import { 
  ClipboardList, 
  User, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  MoreVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StaffTask, TaskStatus } from '@/services/staffService'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface TaskListViewProps {
  tasks: StaffTask[]
  onTaskClick: (task: StaffTask) => void
}

const STATUS_MAP: Record<TaskStatus, { label: string; icon: any; color: string; bg: string }> = {
  created: { label: 'Creato', icon: Briefcase, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  ready: { label: 'Pronto', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  done: { label: 'Completato', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  archive: { label: 'Archiviato', icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-white/5' },
  todo: { label: 'Da Fare', icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
  in_progress: { label: 'In Corso', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' }
}

export default function TaskListView({ tasks, onTaskClick }: Readonly<TaskListViewProps>) {
  return (
    <div className="glass-card overflow-hidden border-white/5 rounded-[2.5rem]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Attività</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Stato</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Assegnatario</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Scadenza</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tasks.map((task) => {
              const statusInfo = STATUS_MAP[task.status]
              return (
                <tr 
                  key={task.id} 
                  onClick={() => onTaskClick(task)}
                  className="group hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-8 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black italic uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 font-bold uppercase truncate max-w-xs">
                        {task.description || 'Nessuna descrizione'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5",
                      statusInfo.bg
                    )}>
                      <statusInfo.icon className={cn("w-3 h-3", statusInfo.color)} />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                        {task.assignee?.avatar_url ? (
                          <img src={task.assignee.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-primary/50" />
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
                        {task.assignee?.full_name || 'Non assegnato'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: it }) : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 pill hover:bg-white/10 text-muted-foreground transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {tasks.length === 0 && (
        <div className="py-20 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-bold text-muted-foreground italic">Nessuna attività trovata.</p>
        </div>
      )}
    </div>
  )
}

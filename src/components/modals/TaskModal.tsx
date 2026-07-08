import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardList, User, Calendar, FileText, Save, Loader2, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { staffService, type StaffTask, type TaskStatus } from '@/services/staffService'
import { supabase } from '@/lib/supabase'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { combineLocalDateTime, splitLocalDateTime } from '@/lib/dateTime'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  task?: StaffTask | null
  defaultStatus?: TaskStatus
}

export default function TaskModal({ isOpen, onClose, onSuccess, task, defaultStatus }: Readonly<TaskModalProps>) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()
  
  const { data: profiles } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => staffService.getProfiles()
  })

  const [showEndTime, setShowEndTime] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: 'created' as TaskStatus,
    start_date: splitLocalDateTime(new Date().toISOString()).date,
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
  })

  // Helpers to handle ISO to Local Data
  const parseDateTime = splitLocalDateTime
  const combineDateTime = combineLocalDateTime

  useEffect(() => {
    if (isOpen) {
      if (task) {
        const start = parseDateTime(task.start_date)
        const end = parseDateTime(task.end_date || task.due_date)
        setShowEndTime(!!(task.end_date || task.due_date))
        setFormData({
          title: task.title || '',
          description: task.description || '',
          assigned_to: task.assigned_to || '',
          status: task.status || 'created',
          start_date: start.date || splitLocalDateTime(new Date().toISOString()).date,
          start_time: start.time || '09:00',
          end_date: end.date || '',
          end_time: end.time || '10:00',
        })
      } else {
        setShowEndTime(false)
        setFormData({
          title: '',
          description: '',
          assigned_to: '',
          status: defaultStatus || 'created',
          start_date: splitLocalDateTime(new Date().toISOString()).date,
          start_time: '09:00',
          end_date: '',
          end_time: '10:00',
        })
      }
      setResult(null)
    }
  }, [isOpen, task, defaultStatus])

  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const startIso = combineDateTime(formData.start_date, formData.start_time)
      const endIso = showEndTime ? combineDateTime(formData.end_date, formData.end_time) : null

      const payload = {
        title: formData.title,
        description: formData.description,
        assigned_to: formData.assigned_to,
        status: formData.status,
        start_date: startIso,
        end_date: endIso,
        due_date: endIso
      }

      if (task) {
        await staffService.updateTask(task.id, payload)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await staffService.createTask({
          ...payload,
          created_by: user?.id || ''
        })
      }
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      setResult({ success: false, message: 'Errore durante il salvataggio.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm('Sei sicuro di voler eliminare questo task?')) return
    setDeleting(true)
    try {
      await staffService.deleteTask(task.id)
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error deleting task:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-[95vw] max-w-3xl glass-card p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden max-h-[96vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-foreground italic uppercase leading-none">
                    {task ? 'Modifica' : 'Nuovo'} <span className="text-primary not-italic">Task</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                    {task ? 'Aggiorna i dettagli dell\'attività' : 'Assegnazione compiti allo staff'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label htmlFor="task_title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Titolo Attività</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="task_title"
                    required
                    placeholder="Es. Inventario magazzino"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-14"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="task_assigned" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Assegnato a</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <select
                      id="task_assigned"
                      value={formData.assigned_to}
                      onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full h-14 pl-14 pr-4 bg-transparent border border-black/5 dark:border-white/10 rounded-full focus:outline-none focus:border-primary/50 text-foreground text-sm font-bold appearance-none backdrop-blur-md"
                    >
                      <option value="" className="text-foreground bg-background">Seleziona Staff...</option>
                      {profiles?.map((p: { id: string; full_name: string | null }) => (
                        <option key={p.id} value={p.id} className="text-foreground bg-background">{p.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="task_status" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Stato</label>
                  <select
                    id="task_status"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full h-14 px-6 bg-transparent border border-black/5 dark:border-white/10 rounded-full focus:outline-none focus:border-primary/50 text-foreground text-sm font-bold appearance-none backdrop-blur-md"
                  >
                    <option value="created">Created</option>
                    <option value="ready">Ready</option>
                    <option value="done">Done</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="task_start" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Inizio</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          id="task_start"
                          type="date"
                          required
                          value={formData.start_date}
                          onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                          className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-sm pl-11 font-bold"
                        />
                      </div>
                      <div className="relative w-32">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          type="time"
                          value={formData.start_time}
                          onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                          className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-sm pl-11 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center pr-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Fine (Opzionale)</label>
                      <button
                        type="button"
                        onClick={() => setShowEndTime(!showEndTime)}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all",
                          showEndTime ? "bg-primary text-white" : "bg-black/5 dark:bg-white/5 text-muted-foreground"
                        )}
                      >
                        {showEndTime ? 'Disattiva' : 'Attiva'}
                      </button>
                    </div>
                    
                    {showEndTime ? (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                          <Input
                            id="task_end"
                            type="date"
                            required={showEndTime}
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-sm pl-11 font-bold"
                          />
                        </div>
                        <div className="relative w-32">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                          <Input
                            type="time"
                            value={formData.end_time}
                            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-sm pl-11 font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-12 flex items-center justify-center border border-dashed border-black/10 dark:border-white/10 rounded-full opacity-50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Attività di un solo giorno</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="task_desc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Descrizione</label>
                <textarea
                  id="task_desc"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[120px] p-6 bg-transparent border border-black/5 dark:border-white/10 rounded-[2rem] focus:outline-none focus:border-primary/50 text-foreground text-sm font-bold placeholder:text-muted-foreground/30 backdrop-blur-md resize-none"
                  placeholder="Dettagli del compito..."
                />
              </div>

              {result && (
                <div className={`p-4 rounded-2xl text-xs font-bold ${result.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {result.message}
                </div>
              )}

              <div className="pt-6 flex flex-col md:flex-row items-center gap-4">
                {task && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full md:w-auto h-14 pill font-black uppercase tracking-widest text-[10px] text-red-500 hover:bg-red-500/10"
                  >
                    {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />}
                    Elimina
                  </Button>
                )}
                <div className="flex-1 w-full flex gap-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={onClose}
                    className="flex-1 h-14 pill font-black uppercase tracking-widest text-[10px] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-[2] h-14 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/40 gap-3 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {task ? 'Salva Modifiche' : 'Crea Task'}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

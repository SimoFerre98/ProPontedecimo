import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardList, User, Calendar, FileText, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { staffService } from '@/services/staffService'
import { supabase } from '@/lib/supabase'
import { useQueryClient, useQuery } from '@tanstack/react-query'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddTaskModal({ isOpen, onClose, onSuccess }: Readonly<AddTaskModalProps>) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  
  const { data: profiles } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => staffService.getProfiles()
  })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await staffService.createTask({
        ...formData,
        status: 'todo',
        created_by: (await supabase.auth.getUser()).data.user?.id || ''
      })
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] })
      onSuccess?.()
      onClose()
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium'
      })
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
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
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-xl glass-card p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-foreground italic uppercase leading-none">Nuovo <span className="text-primary NOT-italic">Task</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">Assegnazione compiti allo staff</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 pill hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
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
                      {profiles?.map((p: any) => (
                        <option key={p.id} value={p.id} className="text-foreground bg-background">{p.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="task_due" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Scadenza</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <Input
                      id="task_due"
                      type="date"
                      required
                      value={formData.due_date}
                      onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                      className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="task_desc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Descrizione</label>
                <textarea
                  id="task_desc"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[120px] p-6 bg-transparent border border-black/5 dark:border-white/10 rounded-[2rem] focus:outline-none focus:border-primary/50 text-foreground text-sm font-bold placeholder:text-muted-foreground/30 backdrop-blur-md"
                  placeholder="Dettagli del compito..."
                />
              </div>

              <div className="pt-6 flex items-center gap-4">
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
                  Crea Task
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

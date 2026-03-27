import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { staffService, type TaskStatus } from '@/services/staffService'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, User, Calendar, FileText, Loader2 } from 'lucide-react'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddTaskModal({ isOpen, onClose, onSuccess }: Readonly<AddTaskModalProps>) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    status: 'todo' as TaskStatus
  })

  const { data: profiles } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => staffService.getProfiles(),
    enabled: isOpen
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await staffService.createTask({
        ...formData,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        created_by: user?.id || null
      })
      onSuccess()
      onClose()
      setFormData({ title: '', description: '', assigned_to: '', due_date: '', status: 'todo' })
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuova Attività Staff">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="task_title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Titolo Attività</label>
          <div className="relative group">
            <ClipboardList className="absolute left-3 top-1/2 -translate-y-1-2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="task_title"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
              placeholder="es. Organizzazione Torneo..."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task_assigned" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assegnato A</label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <select
              id="task_assigned"
              value={formData.assigned_to}
              onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full h-10 pl-9 pr-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-primary/50 text-foreground text-sm font-medium appearance-none backdrop-blur-md"
            >
              <option value="" className="bg-slate-900">Seleziona Staff...</option>
              {profiles?.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task_due_date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Scadenza</label>
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="task_due_date"
              type="date"
              value={formData.due_date}
              onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task_desc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrizione</label>
          <div className="relative group">
            <FileText className="absolute left-3 top-4 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <textarea
              id="task_desc"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full min-h-[100px] pl-9 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-primary/50 text-foreground text-sm font-medium placeholder:text-muted-foreground/30 backdrop-blur-md"
              placeholder="Dettagli del compito..."
            />
          </div>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crea Task"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

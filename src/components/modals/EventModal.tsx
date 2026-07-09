import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, FileText, Save, Loader2, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { eventService, type FootballEvent, type FootballEventType } from '@/services/eventService'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { combineLocalDateTime, splitLocalDateTime } from '@/lib/dateTime'
import { EVENT_TYPES_CONFIG } from '@/lib/eventTypes'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  event?: FootballEvent | null
}

export default function EventModal({ isOpen, onClose, onSuccess, event }: Readonly<EventModalProps>) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    event_type: 'generic' as FootballEventType,
    title: '',
    description: '',
    start_date: splitLocalDateTime(new Date().toISOString()).date,
    start_time: '18:00',
    meetup_time: '17:00',
  })

  // Helpers to handle ISO to Local Data
  const parseDateTime = splitLocalDateTime
  const combineDateTime = combineLocalDateTime

  const isMatch = formData.event_type === 'home_match' || formData.event_type === 'away_match'

  useEffect(() => {
    if (isOpen) {
      if (event) {
        const start = parseDateTime(event.start_date)
        const meetup = event.meetup_time ? parseDateTime(event.meetup_time) : null
        setFormData({
          event_type: event.event_type || 'generic',
          title: event.title || '',
          description: event.description || '',
          start_date: start.date || splitLocalDateTime(new Date().toISOString()).date,
          start_time: start.time || '18:00',
          meetup_time: meetup?.time || '17:00',
        })
      } else {
        setFormData({
          event_type: 'generic',
          title: '',
          description: '',
          start_date: splitLocalDateTime(new Date().toISOString()).date,
          start_time: '18:00',
          meetup_time: '17:00',
        })
      }
      setResult(null)
    }
  }, [isOpen, event])

  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const startIso = combineDateTime(formData.start_date, formData.start_time)
      const meetupIso = isMatch ? combineDateTime(formData.start_date, formData.meetup_time) : null

      if (!startIso) {
        throw new Error('Data e ora di inizio non valide.')
      }

      const payload = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_date: startIso,
        meetup_time: meetupIso,
      }

      if (event) {
        await eventService.updateEvent(event.id, payload)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await eventService.createEvent({
          ...payload,
          created_by: user?.id || null,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving event:', error)
      setResult({ success: false, message: 'Errore durante il salvataggio.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('Sei sicuro di voler eliminare questo evento?')) return
    setResult(null)
    setDeleting(true)
    try {
      await eventService.deleteEvent(event.id)
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error deleting event:', error)
      setResult({ success: false, message: 'Errore durante l\'eliminazione.' })
    } finally {
      setDeleting(false)
    }
  }

  const TypeIcon = EVENT_TYPES_CONFIG[formData.event_type]?.icon || Calendar

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
                  <TypeIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-foreground italic uppercase leading-none">
                    {event ? 'Modifica' : 'Nuovo'} <span className="text-primary not-italic">Evento</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                    {event ? 'Aggiorna i dettagli dell\'evento' : 'Organizza una nuova attività di squadra'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="event_type" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Tipo Evento</label>
                  <select
                    id="event_type"
                    value={formData.event_type}
                    onChange={e => setFormData({ ...formData, event_type: e.target.value as FootballEventType })}
                    className="w-full h-14 px-6 bg-transparent border border-black/5 dark:border-white/10 rounded-full focus:outline-none focus:border-primary/50 text-foreground text-sm font-bold appearance-none backdrop-blur-md"
                  >
                    <option value="training" className="text-foreground bg-background">Allenamento</option>
                    <option value="home_match" className="text-foreground bg-background">Partita in Casa</option>
                    <option value="away_match" className="text-foreground bg-background">Trasferta</option>
                    <option value="meeting" className="text-foreground bg-background">Riunione</option>
                    <option value="generic" className="text-foreground bg-background">Evento Generico</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label htmlFor="event_title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Titolo Evento</label>
                  <div className="relative">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="event_title"
                      required
                      placeholder="Es. Partita vs Genova"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-14"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="event_start" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">{isMatch ? 'Data e Ora Inizio Gara' : 'Data e Ora Inizio'}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input
                        id="event_start"
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
                        required
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                        className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-sm pl-11 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Orario Ritrovo (Richiesto per le partite)</label>
                  {isMatch ? (
                    <div className="relative w-full animate-in fade-in slide-in-from-top-2">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input
                        type="time"
                        required={isMatch}
                        value={formData.meetup_time}
                        onChange={e => setFormData({ ...formData, meetup_time: e.target.value })}
                        className="h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-sm pl-11 font-bold"
                      />
                    </div>
                  ) : (
                    <div className="h-12 flex items-center justify-center border border-dashed border-black/10 dark:border-white/10 rounded-full opacity-50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Nessun Ritrovo</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="event_desc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Descrizione (Opzionale)</label>
                <textarea
                  id="event_desc"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[120px] p-6 bg-transparent border border-black/5 dark:border-white/10 rounded-[2rem] focus:outline-none focus:border-primary/50 text-foreground text-sm font-bold placeholder:text-muted-foreground/30 backdrop-blur-md resize-none"
                  placeholder="Dettagli aggiuntivi sull'evento..."
                />
              </div>

              {result && (
                <div className={`p-4 rounded-2xl text-xs font-bold ${result.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {result.message}
                </div>
              )}

              <div className="pt-6 flex flex-col md:flex-row items-center gap-4">
                {event && (
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
                    {event ? 'Salva Modifiche' : 'Crea Evento'}
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

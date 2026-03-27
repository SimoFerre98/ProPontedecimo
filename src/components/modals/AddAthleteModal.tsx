import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Calendar, Smartphone, Users, Save, Loader2, Mail, HeartPulse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { athleteService } from '@/services/athleteService'
import { useQueryClient } from '@tanstack/react-query'

interface AddAthleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddAthleteModal({ isOpen, onClose, onSuccess }: Readonly<AddAthleteModalProps>) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    phone_player: '',
    phone_parent: '',
    email: '',
    team_sector: '',
    medical_expiry: '',
    is_active: true
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await athleteService.createPlayer({
        ...formData,
        birth_date: formData.birth_date || null,
        phone_player: formData.phone_player || null,
        phone_parent: formData.phone_parent || null,
        email: formData.email || null,
        team_sector: formData.team_sector || null,
        medical_expiry: formData.medical_expiry || null,
      })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      onSuccess?.()
      onClose()
      setFormData({
        first_name: '',
        last_name: '',
        birth_date: '',
        phone_player: '',
        phone_parent: '',
        email: '',
        team_sector: '',
        medical_expiry: '',
        is_active: true
      })
    } catch (error) {
      console.error('Error adding athlete:', error)
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
            className="relative w-full max-w-2xl glass-card p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-foreground italic uppercase leading-none">Nuovo <span className="text-primary NOT-italic">Atleta</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">Registrazione completa anagrafica e medica</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 pill hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Sezione Anagrafica */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 pl-2">Informazioni Personali</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 group">
                    <label htmlFor="athlete-first-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Nome</label>
                    <Input
                      id="athlete-first-name"
                      required
                      placeholder="Nome"
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-6"
                    />
                  </div>
                  <div className="space-y-2 group">
                    <label htmlFor="athlete-last-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Cognome</label>
                    <Input
                      id="athlete-last-name"
                      required
                      placeholder="Cognome"
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-6"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="athlete-birth-date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Data di Nascita</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                      <Input
                        id="athlete-birth-date"
                        type="date"
                        required
                        value={formData.birth_date}
                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                        className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="athlete-sector" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Settore / Squadra</label>
                    <div className="relative">
                      <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                      <Input
                        id="athlete-sector"
                        placeholder="Es. Primi Calci 2017"
                        value={formData.team_sector}
                        onChange={e => setFormData({ ...formData, team_sector: e.target.value })}
                        className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione Contatti */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 pl-2">Contatti e Recapiti</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="athlete-phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Telefono Atleta</label>
                    <div className="relative">
                      <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                      <Input
                        id="athlete-phone"
                        placeholder="+39 ..."
                        value={formData.phone_player}
                        onChange={e => setFormData({ ...formData, phone_player: e.target.value })}
                        className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="athlete-parent-phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Telefono Genitore</label>
                    <div className="relative">
                      <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                      <Input
                        id="athlete-parent-phone"
                        placeholder="Emergenza"
                        value={formData.phone_parent}
                        onChange={e => setFormData({ ...formData, phone_parent: e.target.value })}
                        className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold tabular-nums"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="athlete-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Email di riferimento</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <Input
                      id="athlete-email"
                      type="email"
                      placeholder="atleta@esempio.it"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold italic"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione Medica */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 pl-2">Salute e Idoneità</p>
                <div className="space-y-2">
                  <label htmlFor="athlete-medical" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Scadenza Visita Medica</label>
                  <div className="relative">
                    <HeartPulse className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <Input
                      id="athlete-medical"
                      type="date"
                      value={formData.medical_expiry}
                      onChange={e => setFormData({ ...formData, medical_expiry: e.target.value })}
                      className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14"
                    />
                  </div>
                </div>
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
                  Finalizza Registrazione
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

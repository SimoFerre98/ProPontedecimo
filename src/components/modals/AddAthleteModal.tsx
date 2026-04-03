import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Calendar, Smartphone, Users, Save, Loader2, Mail, HeartPulse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { athleteService, type Player } from '@/services/athleteService'
import { useQueryClient } from '@tanstack/react-query'

interface AddAthleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  player?: Player | null
  availableSectors?: string[]
}

export default function AddAthleteModal({ isOpen, onClose, onSuccess, player, availableSectors = [] }: Readonly<AddAthleteModalProps>) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const [isCreatingNewSector, setIsCreatingNewSector] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    phone_player: '',
    parent1_phone: '',
    email: '',
    team_sector: '',
    medical_expiry: '',
    is_active: true
  })

  const isFormValid = formData.first_name.trim() !== '' && formData.last_name.trim() !== '' && formData.team_sector.trim() !== ''

  // Popola o resetta i dati quando il modale si apre/chiude o il giocatore cambia
  useEffect(() => {
    if (isOpen) {
      if (player) {
        setFormData({
          first_name: player.first_name || '',
          last_name: player.last_name || '',
          birth_date: player.birth_date || '',
          phone_player: player.phone_player || '',
          parent1_phone: player.parent1_phone || '',
          email: player.email || '',
          team_sector: player.team_sector || '',
          medical_expiry: player.medical_expiry || '',
          is_active: player.is_active ?? true
        })
        setIsCreatingNewSector(false)
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          birth_date: '',
          phone_player: '',
          parent1_phone: '',
          email: '',
          team_sector: availableSectors[0] || '',
          medical_expiry: '',
          is_active: true
        })
        setIsCreatingNewSector(availableSectors.length === 0)
      }
    }
  }, [isOpen, player, availableSectors])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        birth_date: formData.birth_date || null,
        phone_player: formData.phone_player || null,
        parent1_phone: formData.parent1_phone || null,
        email: formData.email || null,
        team_sector: formData.team_sector || null,
        medical_expiry: formData.medical_expiry || null,
      }
      
      if (player?.id) {
        await athleteService.updatePlayer(player.id, payload)
      } else {
        await athleteService.createPlayer(payload)
      }
      
      queryClient.invalidateQueries({ queryKey: ['players'] })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving athlete:', error)
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
                  <h2 className="text-3xl font-black text-foreground italic uppercase leading-none">{player ? 'Dettagli' : 'Nuovo'} <span className="text-primary NOT-italic">Atleta</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">{player ? 'Modifica o visualizza dati atleta' : 'Registrazione completa anagrafica e medica'}</p>
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
                    <label htmlFor="athlete-first-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Nome <span className="text-red-500">*</span></label>
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
                    <label htmlFor="athlete-last-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Cognome <span className="text-red-500">*</span></label>
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
                  <div className="space-y-2 group">
                    <label htmlFor="athlete-sector" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 cursor-pointer">Settore / Leva <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10" />
                      {!isCreatingNewSector ? (
                        <select
                          id="athlete-sector"
                          value={formData.team_sector}
                          onChange={e => {
                            if (e.target.value === '__new__') {
                              setIsCreatingNewSector(true)
                              setFormData({ ...formData, team_sector: '' })
                            } else {
                              setFormData({ ...formData, team_sector: e.target.value })
                            }
                          }}
                          className="w-full h-14 rounded-full glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold bg-white/5 appearance-none cursor-pointer"
                        >
                          {availableSectors.map(s => (
                            <option key={s} value={s} className="text-black">{s}</option>
                          ))}
                          <option value="__new__" className="text-black font-bold italic">+ Aggiungi nuova leva...</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            id="athlete-sector"
                            placeholder="Es. Primi Calci 2017"
                            autoFocus
                            value={formData.team_sector}
                            onChange={e => setFormData({ ...formData, team_sector: e.target.value })}
                            className="h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base pl-14 font-bold"
                          />
                          {availableSectors.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingNewSector(false)
                                setFormData({ ...formData, team_sector: availableSectors[0] })
                              }}
                              className="h-14 px-4 pill bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] uppercase font-bold tracking-widest text-muted-foreground whitespace-nowrap transition-all"
                            >
                              Annulla
                            </button>
                          )}
                        </div>
                      )}
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
                        value={formData.parent1_phone}
                        onChange={e => setFormData({ ...formData, parent1_phone: e.target.value })}
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

              <div className="pt-6 relative">
                {!isFormValid && (
                  <p className="absolute -top-1 left-0 right-0 text-center text-[10px] font-black uppercase tracking-widest text-red-500 glow-red">
                    * Compila i campi obbligatori per proseguire
                  </p>
                )}
                <div className="flex items-center gap-4">
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
                    disabled={loading || !isFormValid}
                    className="flex-[2] h-14 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/40 gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {player ? 'Salva Modifiche' : 'Finalizza Registrazione'}
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

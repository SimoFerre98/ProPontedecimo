import React, { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { athleteService } from '@/services/athleteService'
import { User, Phone, Mail, Calendar, Shield, Loader2 } from 'lucide-react'

interface AddAthleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddAthleteModal({ isOpen, onClose, onSuccess }: AddAthleteModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    team_sector: '',
    birth_date: '',
    phone_parent: '',
    phone_player: '',
    email: '',
    medical_expiry: null as string | null,
    is_active: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await athleteService.createPlayer(formData)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating athlete:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Atleta">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="first_name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                id="first_name"
                required
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="pl-9 glass-card border-white/5 focus:border-primary/50"
                placeholder="Mario"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="last_name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cognome</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                id="last_name"
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="pl-9 glass-card border-white/5 focus:border-primary/50"
                placeholder="Rossi"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="team_sector" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Settore / Squadra</label>
          <div className="relative group">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="team_sector"
              required
              value={formData.team_sector}
              onChange={e => setFormData({ ...formData, team_sector: e.target.value })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
              placeholder="es. Under 15, Prima Squadra..."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="birth_date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data di Nascita</label>
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="phone_player" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tel. Atleta</label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                id="phone_player"
                value={formData.phone_player}
                onChange={e => setFormData({ ...formData, phone_player: e.target.value })}
                className="pl-9 glass-card border-white/5 focus:border-primary/50"
                placeholder="010..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone_parent" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tel. Genitore</label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                id="phone_parent"
                value={formData.phone_parent}
                onChange={e => setFormData({ ...formData, phone_parent: e.target.value })}
                className="pl-9 glass-card border-white/5 focus:border-primary/50"
                placeholder="340..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
              placeholder="atleta@esempio.it"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva Atleta"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

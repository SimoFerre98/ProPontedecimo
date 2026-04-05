import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, UserPlus, Calendar, Smartphone, Users, Save, Loader2,
  Mail, HeartPulse, MapPin, FileText, User, Home, CreditCard, ClipboardList, ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { athleteService, type Player } from '@/services/athleteService'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface AddAthleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  player?: Player | null
  availableSectors?: string[]
}

type FormSection = 'anagrafica' | 'residenza' | 'contatti' | 'genitori' | 'sport'

const SECTIONS: { id: FormSection; label: string; icon: React.ElementType }[] = [
  { id: 'anagrafica', label: 'Anagrafica', icon: User },
  { id: 'residenza', label: 'Residenza', icon: MapPin },
  { id: 'contatti', label: 'Contatti', icon: Smartphone },
  { id: 'genitori', label: 'Genitori', icon: Users },
  { id: 'sport', label: 'Sport & Note', icon: ClipboardList },
]

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  birth_date: '',
  birth_place: '',
  citizenship: '',
  tax_code: '',
  address_street: '',
  address_locality: '',
  address_city: '',
  address_zip: '',
  phone_home: '',
  phone_player: '',
  email: '',
  parent1_name: '',
  parent1_phone: '',
  parent1_tax_code: '',
  parent2_name: '',
  parent2_phone: '',
  parent2_tax_code: '',
  figc_registration: '',
  medical_expiry: '',
  notes: '',
  privacy_accepted: false,
  team_sector: '',
  is_active: true,
  is_registered: false,
}

function FieldLabel({ label, required }: Readonly<{ label: string; required?: boolean }>) {
  return (
    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </span>
  )
}

function Field({ icon: Icon, children }: Readonly<{ icon?: React.ElementType; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      {children}
      {Icon && (
        <div className="relative">
          <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 pointer-events-none z-10" />
        </div>
      )}
    </div>
  )
}

export default function AddAthleteModal({ isOpen, onClose, onSuccess, player, availableSectors = [] }: Readonly<AddAthleteModalProps>) {
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<FormSection>('anagrafica')
  const [isCreatingNewSector, setIsCreatingNewSector] = useState(false)
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...EMPTY_FORM })

  const isFormValid = formData.first_name.trim() !== '' && formData.last_name.trim() !== '' && formData.team_sector.trim() !== ''

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (isOpen) {
      setActiveSection('anagrafica')
      if (player) {
        setFormData({
          first_name: player.first_name || '',
          last_name: player.last_name || '',
          birth_date: player.birth_date || '',
          birth_place: player.birth_place || '',
          citizenship: player.citizenship || '',
          tax_code: player.tax_code || '',
          address_street: player.address_street || '',
          address_locality: player.address_locality || '',
          address_city: player.address_city || '',
          address_zip: player.address_zip || '',
          phone_home: player.phone_home || '',
          phone_player: player.phone_player || '',
          email: player.email || '',
          parent1_name: player.parent1_name || '',
          parent1_phone: player.parent1_phone || '',
          parent1_tax_code: player.parent1_tax_code || '',
          parent2_name: player.parent2_name || '',
          parent2_phone: player.parent2_phone || '',
          parent2_tax_code: player.parent2_tax_code || '',
          figc_registration: player.figc_registration || '',
          medical_expiry: player.medical_expiry || '',
          notes: player.notes || '',
          privacy_accepted: player.privacy_accepted ?? false,
          team_sector: player.team_sector || '',
          is_active: player.is_active ?? true,
          is_registered: player.is_registered ?? false,
        })
        setIsCreatingNewSector(false)
      } else {
        setFormData({ ...EMPTY_FORM, team_sector: availableSectors[0] || '' })
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
        medical_expiry: formData.medical_expiry || null,
        phone_home: formData.phone_home || null,
        phone_player: formData.phone_player || null,
        email: formData.email || null,
        team_sector: formData.team_sector || null,
        birth_place: formData.birth_place || null,
        citizenship: formData.citizenship || null,
        tax_code: formData.tax_code || null,
        address_street: formData.address_street || null,
        address_locality: formData.address_locality || null,
        address_city: formData.address_city || null,
        address_zip: formData.address_zip || null,
        parent1_name: formData.parent1_name || null,
        parent1_phone: formData.parent1_phone || null,
        parent1_tax_code: formData.parent1_tax_code || null,
        parent2_name: formData.parent2_name || null,
        parent2_phone: formData.parent2_phone || null,
        parent2_tax_code: formData.parent2_tax_code || null,
        figc_registration: formData.figc_registration || null,
        notes: formData.notes || null,
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

  const inputClass = "h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-14"
  const inputClassNoIcon = "h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-base font-bold pl-6"

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
            className="relative w-[95vw] max-w-4xl glass-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[96vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0">
                  <UserPlus className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase leading-none">
                    {player ? 'Dettagli' : 'Nuovo'} <span className="text-primary not-italic">Atleta</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                    {player ? 'Modifica o visualizza dati atleta' : 'Registrazione completa anagrafica'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 pill hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="px-8 pb-2 shrink-0">
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 justify-center",
                      activeSection === s.id
                        ? "bg-primary text-white shadow-lg shadow-primary/30 scale-[1.03]"
                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Body - scrollable */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-4">
                {/* ── SEZIONE ANAGRAFICA ── */}
                {activeSection === 'anagrafica' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Nome" required />
                        <div className="relative">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input id="athlete-first-name" required placeholder="Nome"
                            value={formData.first_name} onChange={e => set('first_name', e.target.value)}
                            className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Cognome" required />
                        <div className="relative">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input id="athlete-last-name" required placeholder="Cognome"
                            value={formData.last_name} onChange={e => set('last_name', e.target.value)}
                            className={inputClass} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Data di Nascita" required />
                        <div className="relative">
                          <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input id="athlete-birth-date" type="date" required
                            value={formData.birth_date} onChange={e => set('birth_date', e.target.value)}
                            className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Luogo di Nascita" />
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="Genova" value={formData.birth_place} onChange={e => set('birth_place', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Codice Fiscale" />
                        <div className="relative">
                          <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="RSSMRA80A01D969X" value={formData.tax_code}
                            onChange={e => set('tax_code', e.target.value.toUpperCase())} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Cittadinanza" />
                        <div className="relative">
                          <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="Italiana" value={formData.citizenship} onChange={e => set('citizenship', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel label="Settore / Leva" required />
                      <div className="relative">
                        <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                        {!isCreatingNewSector ? (
                          <select
                            id="athlete-sector"
                            value={formData.team_sector}
                            onChange={e => {
                              if (e.target.value === '__new__') {
                                setIsCreatingNewSector(true)
                                set('team_sector', '')
                              } else {
                                set('team_sector', e.target.value)
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
                            <Input placeholder="Es. Primi Calci 2017" autoFocus
                              value={formData.team_sector} onChange={e => set('team_sector', e.target.value)}
                              className={inputClass} />
                            {availableSectors.length > 0 && (
                              <button type="button" onClick={() => { setIsCreatingNewSector(false); set('team_sector', availableSectors[0]) }}
                                className="h-14 px-4 pill bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] uppercase font-bold tracking-widest text-muted-foreground whitespace-nowrap transition-all">
                                Annulla
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SEZIONE RESIDENZA ── */}
                {activeSection === 'residenza' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FieldLabel label="Indirizzo" />
                      <div className="relative">
                        <Home className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                        <Input placeholder="Via Roma 1" value={formData.address_street} onChange={e => set('address_street', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Città" />
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="Genova" value={formData.address_city} onChange={e => set('address_city', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="CAP" />
                        <Input placeholder="16100" value={formData.address_zip} onChange={e => set('address_zip', e.target.value)} className={inputClassNoIcon} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel label="Località / Frazione" />
                      <Input placeholder="es. Pontedecimo" value={formData.address_locality} onChange={e => set('address_locality', e.target.value)} className={inputClassNoIcon} />
                    </div>
                  </div>
                )}

                {/* ── SEZIONE CONTATTI ── */}
                {activeSection === 'contatti' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Telefono Atleta" />
                        <div className="relative">
                          <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input type="tel" placeholder="+39 333 ..." value={formData.phone_player} onChange={e => set('phone_player', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Telefono di Casa" />
                        <div className="relative">
                          <Home className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input type="tel" placeholder="+39 010 ..." value={formData.phone_home} onChange={e => set('phone_home', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel label="Email di riferimento" />
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                        <Input type="email" placeholder="atleta@esempio.it" value={formData.email} onChange={e => set('email', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SEZIONE GENITORI ── */}
                {activeSection === 'genitori' && (
                  <div className="space-y-6">
                    {/* Genitore 1 */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 pl-2 flex items-center gap-2">
                        <span>👨 Genitore 1 (Papà)</span>
                      </p>
                      <div className="space-y-4 p-4 glass-card rounded-3xl border border-black/5 dark:border-white/10">
                        <div className="space-y-2">
                          <FieldLabel label="Nominativo" />
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                            <Input placeholder="Mario Rossi" value={formData.parent1_name} onChange={e => set('parent1_name', e.target.value)} className={inputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FieldLabel label="Telefono" />
                            <div className="relative">
                              <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input type="tel" placeholder="+39 333 ..." value={formData.parent1_phone} onChange={e => set('parent1_phone', e.target.value)} className={inputClass} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <FieldLabel label="Codice Fiscale" />
                            <div className="relative">
                              <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input placeholder="RSSMRA..." value={formData.parent1_tax_code}
                                onChange={e => set('parent1_tax_code', e.target.value.toUpperCase())} className={inputClass} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Genitore 2 */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 pl-2">
                        👩 Genitore 2 (Mamma)
                      </p>
                      <div className="space-y-4 p-4 glass-card rounded-3xl border border-black/5 dark:border-white/10">
                        <div className="space-y-2">
                          <FieldLabel label="Nominativo" />
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                            <Input placeholder="Maria Rossi" value={formData.parent2_name} onChange={e => set('parent2_name', e.target.value)} className={inputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FieldLabel label="Telefono" />
                            <div className="relative">
                              <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input type="tel" placeholder="+39 345 ..." value={formData.parent2_phone} onChange={e => set('parent2_phone', e.target.value)} className={inputClass} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <FieldLabel label="Codice Fiscale" />
                            <div className="relative">
                              <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input placeholder="RSSMRA..." value={formData.parent2_tax_code}
                                onChange={e => set('parent2_tax_code', e.target.value.toUpperCase())} className={inputClass} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SEZIONE SPORT & NOTE ── */}
                {activeSection === 'sport' && (
                  <div className="space-y-4">
                    {/* Tesserament Card — highlighted */}
                    <div
                      className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                        formData.is_registered
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-amber-500/30 bg-amber-500/5'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => set('is_registered', !formData.is_registered)}
                      onKeyDown={(e) => e.key === 'Enter' && set('is_registered', !formData.is_registered)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 pill flex items-center justify-center border transition-all ${
                          formData.is_registered
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}>
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-wider text-foreground">
                            {formData.is_registered ? 'Tesserato FIGC' : 'Non Tesserato'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formData.is_registered
                              ? 'Atleta con tessera federale valida'
                              : 'Tessera federale non ancora confermata'}
                          </p>
                        </div>
                      </div>
                      <div className={`relative w-14 h-7 rounded-full transition-all ${
                        formData.is_registered ? 'bg-emerald-500' : 'bg-muted/60 border border-border'
                      }`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                          formData.is_registered ? 'left-8' : 'left-1'
                        }`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Scadenza Visita Medica" />
                        <div className="relative">
                          <HeartPulse className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input id="athlete-medical" type="date"
                            value={formData.medical_expiry} onChange={e => set('medical_expiry', e.target.value)}
                            className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Matricola FIGC" />
                        <div className="relative">
                          <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="es. 12345678" value={formData.figc_registration} onChange={e => set('figc_registration', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel label="Note" />
                      <textarea
                        rows={4}
                        placeholder="Note aggiuntive..."
                        value={formData.notes}
                        onChange={e => set('notes', e.target.value)}
                        className="w-full rounded-3xl glass-card border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:outline-none px-6 py-4 text-base font-medium placeholder:text-muted-foreground/40 bg-transparent text-foreground resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 glass-card rounded-2xl border border-black/5 dark:border-white/10">
                      <input
                        id="privacy-check"
                        type="checkbox"
                        checked={formData.privacy_accepted}
                        onChange={e => set('privacy_accepted', e.target.checked)}
                        className="w-5 h-5 rounded accent-primary cursor-pointer"
                      />
                      <label htmlFor="privacy-check" className="text-sm font-semibold cursor-pointer text-foreground">
                        Consenso privacy e trattamento dati accettato
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 pt-4 shrink-0 border-t border-black/5 dark:border-white/10">
                {!isFormValid && (
                  <p className="text-center text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">
                    * Completa Nome, Cognome, Data di Nascita e Leva per proseguire
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <Button type="button" variant="ghost" onClick={onClose}
                    className="flex-1 h-14 pill font-black uppercase tracking-widest text-[10px] hover:bg-black/5 dark:hover:bg-white/5">
                    Annulla
                  </Button>
                  <Button type="submit" disabled={loading || !isFormValid}
                    className="flex-[2] h-14 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/40 gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">
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

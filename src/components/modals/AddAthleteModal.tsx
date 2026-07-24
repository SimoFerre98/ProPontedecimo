import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, UserPlus, Calendar, Smartphone, Users, Save,
  Mail, HeartPulse, MapPin, FileText, User, Home, CreditCard, ClipboardList, ShieldCheck
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { athleteService, type Player } from '@/services/athleteService'
import { useFormModal } from '@/hooks/useFormModal'
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



export default function AddAthleteModal({ isOpen, onClose, onSuccess, player, availableSectors = [] }: Readonly<AddAthleteModalProps>) {
  const [activeSection, setActiveSection] = useState<FormSection>('anagrafica')
  const [isCreatingNewSector, setIsCreatingNewSector] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Calcola età per determinare se è minorenne.
  // Il campo è una data pura (YYYY-MM-DD): la parsiamo a mano invece di usare `new Date(...)`,
  // che la interpreterebbe come UTC e potrebbe disallinearsi di un giorno rispetto ai getter
  // locali su fusi orari con offset negativo rispetto a UTC.
  const isMinor = (() => {
    if (!formData.birth_date) return false
    const [birthYear, birthMonth, birthDay] = formData.birth_date.split('-').map(Number)
    if (!birthYear || !birthMonth || !birthDay) return false
    const today = new Date()
    let age = today.getFullYear() - birthYear
    const monthDiff = (today.getMonth() + 1) - birthMonth
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--
    }
    return age < 18
  })()

  // Almeno un telefono obbligatorio
  const hasPhone = formData.phone_player.trim() !== '' || formData.phone_home.trim() !== ''

  // Se minorenne: almeno un genitore con nome e telefono
  const p1Name = formData.parent1_name.trim()
  const p1Phone = formData.parent1_phone.trim()
  const p2Name = formData.parent2_name.trim()
  const p2Phone = formData.parent2_phone.trim()
  const p1Complete = p1Name !== '' && p1Phone !== ''
  const p2Complete = p2Name !== '' && p2Phone !== ''
  const hasParentData = p1Complete || p2Complete

  // Robust, reactive validation function returning errors in Italian
  const errors = (() => {
    const errs: Record<string, string> = {}

    if (!formData.first_name.trim()) {
      errs.first_name = "Il nome è obbligatorio"
    }
    if (!formData.last_name.trim()) {
      errs.last_name = "Il cognome è obbligatorio"
    }
    if (!formData.birth_date.trim()) {
      errs.birth_date = "La data di nascita è obbligatoria"
    }
    if (!formData.birth_place.trim()) {
      errs.birth_place = "Il luogo di nascita è obbligatorio"
    }
    if (!formData.citizenship.trim()) {
      errs.citizenship = "La cittadinanza è obbligatoria"
    }
    if (!formData.team_sector.trim()) {
      errs.team_sector = "Il settore/leva è obbligatorio"
    }

    // Codice Fiscale
    const taxCodeTrimmed = formData.tax_code.trim()
    if (!taxCodeTrimmed) {
      errs.tax_code = "Il codice fiscale è obbligatorio"
    } else {
      const cfRegex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-MZ][0-9LMNPQRSTUV]{3}[A-Z]$/i
      if (!cfRegex.test(taxCodeTrimmed)) {
        errs.tax_code = "Il codice fiscale inserito non è valido (es. RSSMRA80A01D969X)"
      }
    }

    // Residenza
    if (!formData.address_street.trim()) {
      errs.address_street = "L'indirizzo è obbligatorio"
    }
    if (!formData.address_city.trim()) {
      errs.address_city = "La città è obbligatoria"
    }
    if (!formData.address_zip.trim()) {
      errs.address_zip = "Il CAP è obbligatorio"
    }

    // Email
    const emailTrimmed = formData.email.trim()
    if (!emailTrimmed) {
      errs.email = "L'email è obbligatoria"
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailTrimmed)) {
        errs.email = "L'indirizzo email inserito non è valido"
      }
    }

    // Telefoni (Almeno uno obbligatorio)
    if (!hasPhone) {
      const phoneError = "Inserisci almeno un numero di telefono (cellulare o fisso)"
      errs.phone_player = phoneError
      errs.phone_home = phoneError
    }

    // Privacy
    if (!formData.privacy_accepted) {
      errs.privacy_accepted = "Il consenso privacy è obbligatorio"
    }

    // Genitori per minorenni
    if (isMinor && !hasParentData) {
      if (p1Name === '' && p1Phone === '' && p2Name === '' && p2Phone === '') {
        errs.parent1_name = "Nominativo obbligatorio per atleti minorenni"
        errs.parent1_phone = "Telefono obbligatorio per atleti minorenni"
      } else {
        if (p1Name !== '' || p1Phone !== '') {
          if (p1Name === '') errs.parent1_name = "Il nome del genitore è obbligatorio"
          if (p1Phone === '') errs.parent1_phone = "Il telefono del genitore è obbligatorio"
        }
        if (p2Name !== '' || p2Phone !== '') {
          if (p2Name === '') errs.parent2_name = "Il nome del genitore è obbligatorio"
          if (p2Phone === '') errs.parent2_phone = "Il telefono del genitore è obbligatorio"
        }
      }
    }

    return errs
  })()

  const isFormValid = Object.keys(errors).length === 0

  // Calculate whether the fields inside each section have errors
  const hasSectionErrors = (section: FormSection): boolean => {
    switch (section) {
      case 'anagrafica':
        return !!(errors.first_name || errors.last_name || errors.birth_date || errors.birth_place || errors.citizenship || errors.tax_code || errors.team_sector)
      case 'residenza':
        return !!(errors.address_street || errors.address_city || errors.address_zip)
      case 'contatti':
        return !!(errors.phone_player || errors.phone_home || errors.email)
      case 'genitori':
        return !!(errors.parent1_name || errors.parent1_phone || errors.parent2_name || errors.parent2_phone)
      case 'sport':
        return !!(errors.privacy_accepted)
      default:
        return false
    }
  }

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  const handleBlur = (key: keyof typeof EMPTY_FORM) => {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

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
        
        // Initialize all fields to touched = true for editing
        const touchedAll = Object.keys(EMPTY_FORM).reduce((acc, key) => {
          acc[key] = true
          return acc
        }, {} as Record<string, boolean>)
        setTouched(touchedAll)
      } else {
        setFormData({ ...EMPTY_FORM, team_sector: availableSectors[0] || '' })
        setIsCreatingNewSector(availableSectors.length === 0)
        setTouched({})
      }
    }
  }, [isOpen, player, availableSectors])

  const handleSubmitFn = async () => {
    const payload = {
      ...formData,
      birth_date: formData.birth_date || null,
      medical_expiry: formData.medical_expiry || null,
      phone_home: formData.phone_home || null,
      phone_player: formData.phone_player || null,
      email: formData.email.trim() || null,
      team_sector: formData.team_sector || null,
      birth_place: formData.birth_place || null,
      citizenship: formData.citizenship || null,
      tax_code: formData.tax_code.trim() || null,
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
  }

  const { loading, submit: handleSubmit } = useFormModal({
    onSubmit: handleSubmitFn,
    invalidateKeys: [['players']],
    onSuccess,
    onClose,
  })

  const inputClass = "h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-brand-accent text-base font-bold pl-14"
  const inputClassNoIcon = "h-14 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-brand-accent text-base font-bold pl-6"

  const getInputClass = (key: keyof typeof EMPTY_FORM, hasIcon = true) => {
    const baseClass = hasIcon ? inputClass : inputClassNoIcon
    const hasError = errors[key] && touched[key]
    return cn(
      baseClass,
      hasError && "border-red-500 dark:border-red-500/80 focus-visible:ring-red-500 focus-visible:border-red-500"
    )
  }

  const renderFieldError = (key: keyof typeof EMPTY_FORM) => {
    if (errors[key] && touched[key]) {
      return (
        <span className="text-xs text-red-500 font-bold pl-3 block mt-1 animate-fadeIn">
          {errors[key]}
        </span>
      )
    }
    return null
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
            className="relative w-[95vw] max-w-4xl glass-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[96vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 pill bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20 shadow-inner shrink-0">
                  <UserPlus className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase leading-none">
                    {player ? 'Dettagli' : 'Nuovo'} <span className="text-brand-accent not-italic">Atleta</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">
                    {player ? 'Modifica o visualizza dati atleta' : 'Registrazione completa anagrafica'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 pill border border-[var(--border-soft)] flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
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
                        ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-[1.03]"
                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                    {hasSectionErrors(s.id) && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    )}
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
                          <Input id="athlete-first-name" placeholder="Nome"
                            value={formData.first_name}
                            onChange={e => set('first_name', e.target.value)}
                            onBlur={() => handleBlur('first_name')}
                            className={getInputClass('first_name')} />
                        </div>
                        {renderFieldError('first_name')}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Cognome" required />
                        <div className="relative">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input id="athlete-last-name" placeholder="Cognome"
                            value={formData.last_name}
                            onChange={e => set('last_name', e.target.value)}
                            onBlur={() => handleBlur('last_name')}
                            className={getInputClass('last_name')} />
                        </div>
                        {renderFieldError('last_name')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Data di Nascita" required />
                        <div className="relative">
                          <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input id="athlete-birth-date" type="date"
                            value={formData.birth_date}
                            onChange={e => set('birth_date', e.target.value)}
                            onBlur={() => handleBlur('birth_date')}
                            className={getInputClass('birth_date')} />
                        </div>
                        {renderFieldError('birth_date')}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Luogo di Nascita" required />
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="Genova"
                            value={formData.birth_place}
                            onChange={e => set('birth_place', e.target.value)}
                            onBlur={() => handleBlur('birth_place')}
                            className={getInputClass('birth_place')} />
                        </div>
                        {renderFieldError('birth_place')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Codice Fiscale" required />
                        <div className="relative">
                          <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="RSSMRA80A01D969X"
                            value={formData.tax_code}
                            onChange={e => set('tax_code', e.target.value.toUpperCase())}
                            onBlur={() => handleBlur('tax_code')}
                            className={getInputClass('tax_code')} />
                        </div>
                        {renderFieldError('tax_code')}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Cittadinanza" required />
                        <div className="relative">
                          <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="Italiana"
                            value={formData.citizenship}
                            onChange={e => set('citizenship', e.target.value)}
                            onBlur={() => handleBlur('citizenship')}
                            className={getInputClass('citizenship')} />
                        </div>
                        {renderFieldError('citizenship')}
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
                            onBlur={() => handleBlur('team_sector')}
                            className={cn(
                              "w-full h-14 rounded-full glass-card border-black/5 dark:border-white/10 focus-visible:ring-brand-accent text-base pl-14 font-bold bg-[var(--surface-05)] appearance-none cursor-pointer",
                              errors.team_sector && touched.team_sector && "border-red-500 dark:border-red-500/80 focus-visible:ring-red-500 focus-visible:border-red-500"
                            )}
                          >
                            {availableSectors.map(s => (
                              <option key={s} value={s} className="text-black">{s}</option>
                            ))}
                            <option value="__new__" className="text-black font-bold italic">+ Aggiungi nuova leva...</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input placeholder="Es. Primi Calci 2017" autoFocus
                              value={formData.team_sector}
                              onChange={e => set('team_sector', e.target.value)}
                              onBlur={() => handleBlur('team_sector')}
                              className={getInputClass('team_sector')} />
                            {availableSectors.length > 0 && (
                              <button type="button" onClick={() => { setIsCreatingNewSector(false); set('team_sector', availableSectors[0]) }}
                                className="h-14 px-4 pill bg-black/5 dark:bg-white/5 hover:bg-[var(--surface-05)] text-[10px] uppercase font-bold tracking-widest text-muted-foreground whitespace-nowrap transition-all">
                                Annulla
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {renderFieldError('team_sector')}
                    </div>
                  </div>
                )}

                {/* ── SEZIONE RESIDENZA ── */}
                {activeSection === 'residenza' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FieldLabel label="Indirizzo" required />
                      <div className="relative">
                        <Home className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                        <Input placeholder="Via Roma 1"
                          value={formData.address_street}
                          onChange={e => set('address_street', e.target.value)}
                          onBlur={() => handleBlur('address_street')}
                          className={getInputClass('address_street')} />
                      </div>
                      {renderFieldError('address_street')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Città" required />
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="Genova"
                            value={formData.address_city}
                            onChange={e => set('address_city', e.target.value)}
                            onBlur={() => handleBlur('address_city')}
                            className={getInputClass('address_city')} />
                        </div>
                        {renderFieldError('address_city')}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="CAP" required />
                        <Input placeholder="16100"
                          value={formData.address_zip}
                          onChange={e => set('address_zip', e.target.value)}
                          onBlur={() => handleBlur('address_zip')}
                          className={getInputClass('address_zip', false)} />
                        {renderFieldError('address_zip')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel label="Località / Frazione" />
                      <Input placeholder="es. Pontedecimo"
                        value={formData.address_locality}
                        onChange={e => set('address_locality', e.target.value)}
                        onBlur={() => handleBlur('address_locality')}
                        className={getInputClass('address_locality', false)} />
                    </div>
                  </div>
                )}

                {/* ── SEZIONE CONTATTI ── */}
                {activeSection === 'contatti' && (
                  <div className="space-y-4">
                    {/* Avviso telefono obbligatorio */}
                    <div className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all",
                      !hasPhone
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    )}>
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>
                        {!hasPhone
                          ? '⚠ Inserisci almeno un numero di telefono (cellulare o fisso)'
                          : '✓ Contatto telefonico presente'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel label="Cellulare Atleta" required />
                        <div className="relative">
                          <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input
                            type="tel"
                            placeholder="+39 333 ..."
                            value={formData.phone_player}
                            onChange={e => set('phone_player', e.target.value)}
                            onBlur={() => handleBlur('phone_player')}
                            className={getInputClass('phone_player')}
                          />
                        </div>
                        {renderFieldError('phone_player')}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Telefono Fisso" required />
                        <div className="relative">
                          <Home className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input
                            type="tel"
                            placeholder="+39 010 ..."
                            value={formData.phone_home}
                            onChange={e => set('phone_home', e.target.value)}
                            onBlur={() => handleBlur('phone_home')}
                            className={getInputClass('phone_home')}
                          />
                        </div>
                        {renderFieldError('phone_home')}
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-2">
                      * È sufficiente inserire almeno uno dei due numeri
                    </p>
                    <div className="space-y-2">
                      <FieldLabel label="Email di riferimento" required />
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                        <Input type="email" placeholder="atleta@esempio.it"
                          value={formData.email}
                          onChange={e => set('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          className={getInputClass('email')} />
                      </div>
                      {renderFieldError('email')}
                    </div>
                  </div>
                )}

                {/* ── SEZIONE GENITORI ── */}
                {activeSection === 'genitori' && (
                  <div className="space-y-6">
                    {/* Banner stato minorenne / maggiorenne */}
                    {formData.birth_date ? (
                      <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all",
                        isMinor
                          ? (!hasParentData
                              ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400")
                          : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                      )}>
                        <Users className="w-4 h-4 shrink-0" />
                        <span>
                          {isMinor
                            ? (!hasParentData
                                ? '⚠ Atleta minorenne — inserisci nome e telefono di almeno un genitore'
                                : '✓ Dati genitore presenti — requisito soddisfatto')
                            : '✓ Atleta maggiorenne — i dati dei genitori sono facoltativi'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-muted/30 border-black/5 dark:border-white/10 text-xs font-bold text-muted-foreground">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Inserisci la data di nascita nell'anagrafica per determinare l'obbligo dei dati genitoriali</span>
                      </div>
                    )}

                    {/* Genitore 1 */}
                    <div className="space-y-3">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] pl-2 flex items-center gap-2",
                        isMinor && !hasParentData ? "text-red-500/70" : "text-brand-accent/60"
                      )}>
                        <span>👨 Genitore 1 (Papà)</span>
                        {isMinor && <span className="text-red-500">*</span>}
                      </p>
                      <div className={cn(
                        "space-y-4 p-4 glass-card rounded-3xl border transition-all",
                        isMinor && !hasParentData
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-black/5 dark:border-white/10"
                      )}>
                        <div className="space-y-2">
                          <FieldLabel label="Nominativo" required={isMinor} />
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                            <Input placeholder="Mario Rossi"
                              value={formData.parent1_name}
                              onChange={e => set('parent1_name', e.target.value)}
                              onBlur={() => handleBlur('parent1_name')}
                              className={getInputClass('parent1_name')} />
                          </div>
                          {renderFieldError('parent1_name')}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FieldLabel label="Telefono" required={isMinor} />
                            <div className="relative">
                              <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input type="tel" placeholder="+39 333 ..."
                                value={formData.parent1_phone}
                                onChange={e => set('parent1_phone', e.target.value)}
                                onBlur={() => handleBlur('parent1_phone')}
                                className={getInputClass('parent1_phone')} />
                            </div>
                            {renderFieldError('parent1_phone')}
                          </div>
                          <div className="space-y-2">
                            <FieldLabel label="Codice Fiscale" />
                            <div className="relative">
                              <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input placeholder="RSSMRA..."
                                value={formData.parent1_tax_code}
                                onChange={e => set('parent1_tax_code', e.target.value.toUpperCase())}
                                onBlur={() => handleBlur('parent1_tax_code')}
                                className={getInputClass('parent1_tax_code')} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Genitore 2 */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent/60 pl-2">
                        👩 Genitore 2 (Mamma)
                        {isMinor && <span className="text-muted-foreground font-normal ml-2 normal-case tracking-normal">(opzionale se Genitore 1 è compilato)</span>}
                      </p>
                      <div className="space-y-4 p-4 glass-card rounded-3xl border border-black/5 dark:border-white/10">
                        <div className="space-y-2">
                          <FieldLabel label="Nominativo" />
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                            <Input placeholder="Maria Rossi"
                              value={formData.parent2_name}
                              onChange={e => set('parent2_name', e.target.value)}
                              onBlur={() => handleBlur('parent2_name')}
                              className={getInputClass('parent2_name')} />
                          </div>
                          {renderFieldError('parent2_name')}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FieldLabel label="Telefono" />
                            <div className="relative">
                              <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input type="tel" placeholder="+39 345 ..."
                                value={formData.parent2_phone}
                                onChange={e => set('parent2_phone', e.target.value)}
                                onBlur={() => handleBlur('parent2_phone')}
                                className={getInputClass('parent2_phone')} />
                            </div>
                            {renderFieldError('parent2_phone')}
                          </div>
                          <div className="space-y-2">
                            <FieldLabel label="Codice Fiscale" />
                            <div className="relative">
                              <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                              <Input placeholder="RSSMRA..."
                                value={formData.parent2_tax_code}
                                onChange={e => set('parent2_tax_code', e.target.value.toUpperCase())}
                                onBlur={() => handleBlur('parent2_tax_code')}
                                className={getInputClass('parent2_tax_code')} />
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
                            value={formData.medical_expiry}
                            onChange={e => set('medical_expiry', e.target.value)}
                            onBlur={() => handleBlur('medical_expiry')}
                            className={getInputClass('medical_expiry')} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel label="Matricola FIGC" />
                        <div className="relative">
                          <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 z-10 pointer-events-none" />
                          <Input placeholder="es. 12345678"
                            value={formData.figc_registration}
                            onChange={e => set('figc_registration', e.target.value)}
                            onBlur={() => handleBlur('figc_registration')}
                            className={getInputClass('figc_registration')} />
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
                        onBlur={() => handleBlur('notes')}
                        className="w-full rounded-3xl glass-card border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-brand-accent/20 focus:outline-none px-6 py-4 text-base font-medium placeholder:text-muted-foreground/40 bg-transparent text-foreground resize-none"
                      />
                    </div>
                    <div className={cn(
                      "flex items-center gap-3 px-4 py-3 glass-card rounded-2xl border transition-all",
                      !formData.privacy_accepted && touched.privacy_accepted
                        ? "border-red-500 bg-red-500/5"
                        : (!formData.privacy_accepted ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5")
                    )}>
                      <input
                        id="privacy-check"
                        type="checkbox"
                        checked={formData.privacy_accepted}
                        onChange={e => set('privacy_accepted', e.target.checked)}
                        onBlur={() => handleBlur('privacy_accepted')}
                        className="w-5 h-5 rounded accent-primary cursor-pointer"
                      />
                      <label htmlFor="privacy-check" className="text-sm font-semibold cursor-pointer text-foreground flex-1">
                        Consenso privacy e trattamento dati accettato
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      {formData.privacy_accepted
                        ? <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">✓ Accettato</span>
                        : <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Obbligatorio</span>
                      }
                    </div>
                    {renderFieldError('privacy_accepted')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 pt-4 shrink-0 border-t border-black/5 dark:border-white/10">
                {!isFormValid && (
                  <div className="mb-3 space-y-1">
                    {hasSectionErrors('anagrafica') && (
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-red-500">
                        ✗ Anagrafica incompleta o non valida — controlla i campi obbligatori
                      </p>
                    )}
                    {hasSectionErrors('residenza') && (
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-red-500">
                        ✗ Residenza incompleta — inserisci indirizzo, città e CAP
                      </p>
                    )}
                    {hasSectionErrors('contatti') && (
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-amber-500">
                        ✗ Contatti incompleti — inserisci email e almeno un numero di telefono
                      </p>
                    )}
                    {isMinor && hasSectionErrors('genitori') && (
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-red-500">
                        ✗ Atleta minorenne — inserisci nominativo e telefono di almeno un genitore
                      </p>
                    )}
                    {hasSectionErrors('sport') && (
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-red-500">
                        ✗ Consenso privacy obbligatorio (sezione Sport &amp; Note)
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button type="button" variant="ghost" onClick={onClose}
                    className="flex-1 h-14 pill font-black uppercase tracking-widest text-[10px] hover:bg-black/5 dark:hover:bg-white/5">
                    Annulla
                  </Button>
                  <Button type="submit" disabled={loading || !isFormValid}
                    className="flex-[2] h-14 pill bg-brand-accent hover:bg-brand-accent/90 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand-accent/40 gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">
                    {loading ? <LoadingSpinner size="sm" tone="white" /> : <Save className="w-5 h-5" />}
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

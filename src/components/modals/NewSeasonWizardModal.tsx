import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/useAppStore'
import { seasonService } from '@/services/seasonService'
import { athleteService, type Player } from '@/services/athleteService'
import { suggestLeva } from '@/lib/leva'
import { cn } from '@/lib/utils'

interface NewSeasonWizardModalProps {
  isOpen: boolean
  onClose: () => void
}

// Placeholder di sola UI per il raggruppamento di atleti senza leva assegnata: non deve mai
// essere scritto come valore reale nel database (vedi resolveDestinationSector).
const NO_SECTOR_PLACEHOLDER = 'Senza Leva'

export default function NewSeasonWizardModal({ isOpen, onClose }: Readonly<NewSeasonWizardModalProps>) {
  const queryClient = useQueryClient()
  const { seasons, setSelectedSeasonId } = useAppStore()

  // --- STATO DEL WIZARD ---
  const [step, setStep] = useState(1)
  const [maxStep, setMaxStep] = useState(1)

  // Step 1: Dati stagione
  const [seasonName, setSeasonName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Step 2: Atleti selezionati
  // Mappa player_id -> boolean
  const [selectedAthletes, setSelectedAthletes] = useState<Record<string, boolean>>({})

  // Step 3: Destinazione leve
  // Override manuali dell'utente (original_sector -> label scelta). I suggerimenti automatici
  // sono derivati (vedi suggestedDestinations/suggestedDestinationsNoDob più sotto) e non
  // vengono mai sovrascritti da qui: navigare avanti/indietro tra gli step non cancella le
  // scelte manuali dell'utente.
  const [overrideDestinations, setOverrideDestinations] = useState<Record<string, string>>({})
  const [overrideDestinationsNoDob, setOverrideDestinationsNoDob] = useState<Record<string, string>>({})

  // Nuove leve create dall'utente
  const [customLeve, setCustomLeve] = useState<string[]>([])
  // Stato per l'input di una nuova leva: { originalSector: string; isNoDob: boolean } | null
  const [addingNewLevaFor, setAddingNewLevaFor] = useState<{ sector: string; isNoDob: boolean } | null>(null)
  const [newLevaInput, setNewLevaInput] = useState('')

  // Success screen
  const [showSuccess, setShowSuccess] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{ importedCount: number; newLeveCount: number } | null>(null)

  // Calcolo valori di default basati sulla stagione corrente
  const activeSeason = useMemo(() => seasons.find(s => s.is_active), [seasons])

  useEffect(() => {
    if (!isOpen) return
    // Reset dello stato alla riapertura
    setStep(1)
    setMaxStep(1)
    setShowSuccess(false)
    setSuccessInfo(null)
    setCustomLeve([])
    setAddingNewLevaFor(null)
    setNewLevaInput('')
    setOverrideDestinations({})
    setOverrideDestinationsNoDob({})

    if (activeSeason) {
      const parts = activeSeason.name.split('/')
      if (parts.length === 2) {
        const y1 = parseInt(parts[0], 10)
        const y2 = parseInt(parts[1], 10)
        if (!isNaN(y1) && !isNaN(y2)) {
          setSeasonName(`${y1 + 1}/${y2 + 1}`)
          setStartDate(`${y1 + 1}-07-01`)
          setEndDate(`${y2 + 1}-06-30`)
          return
        }
      }
    }
    // Fallback generico
    const currentYear = new Date().getFullYear()
    setSeasonName(`${currentYear}/${currentYear + 1}`)
    setStartDate(`${currentYear}-07-01`)
    setEndDate(`${currentYear + 1}-06-30`)
  }, [isOpen, activeSeason])

  // --- QUERY DATI ---
  // La stagione sorgente del wizard è sempre quella ATTIVA, indipendentemente da quale
  // stagione l'utente stia consultando nell'header (che potrebbe essere una storica).
  const sourceSeasonId = activeSeason?.id ?? null

  // Carica atleti della stagione sorgente (solo atleti in rosa: is_active = true)
  const { data: athletesData, isLoading: isLoadingAthletes } = useQuery({
    queryKey: ['players', 'wizard', sourceSeasonId],
    queryFn: () => athleteService.getPlayers(undefined, undefined, 0, 1000, { isActive: 'active' }, sourceSeasonId),
    enabled: isOpen && !!sourceSeasonId
  })

  const athletes = useMemo(() => athletesData?.data ?? [], [athletesData])

  // Carica le leve esistenti per popolare la tendina del selettore leve destinazione
  const { data: existingSectors = [] } = useQuery({
    queryKey: ['sectors', 'wizard', sourceSeasonId],
    queryFn: () => athleteService.getUniqueSectors(sourceSeasonId ?? undefined),
    enabled: isOpen && !!sourceSeasonId
  })

  // Inizializza la selezione atleti (tutti abilitati di default)
  useEffect(() => {
    if (athletes.length > 0) {
      const initial: Record<string, boolean> = {}
      athletes.forEach(a => {
        initial[a.id] = true
      })
      setSelectedAthletes(initial)
    }
  }, [athletes])

  // --- RAGGRUPPAMENTO ATLETI ---
  const groupedAthletes = useMemo(() => {
    const groups: Record<string, Player[]> = {}
    athletes.forEach(a => {
      const sector = a.team_sector || NO_SECTOR_PLACEHOLDER
      if (!groups[sector]) groups[sector] = []
      groups[sector].push(a)
    })
    return groups
  }, [athletes])

  // Statistiche e aggregati
  const sectorsList = useMemo(() => Object.keys(groupedAthletes).sort(), [groupedAthletes])

  const selectedCountBySector = useMemo(() => {
    const counts: Record<string, number> = {}
    sectorsList.forEach(sector => {
      counts[sector] = groupedAthletes[sector].filter(a => selectedAthletes[a.id]).length
    })
    return counts
  }, [sectorsList, groupedAthletes, selectedAthletes])

  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedCountBySector).reduce((sum, c) => sum + c, 0)
  }, [selectedCountBySector])

  const totalAthletesCount = athletes.length

  // --- SUGGERIMENTI SCATTO LEVA (derivati, non imperativi) ---
  // Calcolati come valori puri per ogni sezione con atleti selezionati, indipendentemente
  // da quale step sia attivo: così sono sempre completi (anche se l'utente salta direttamente
  // allo step 4 dallo stepper) e non richiedono un effect che rischi di sovrascrivere gli
  // override manuali dell'utente quando si torna indietro e poi avanti.
  const seasonStartYear = useMemo(
    () => (startDate ? new Date(startDate).getFullYear() : new Date().getFullYear()),
    [startDate]
  )

  const suggestedDestinations = useMemo(() => {
    const result: Record<string, { label: string; isNew: boolean }> = {}
    sectorsList.forEach(sector => {
      const withDob = groupedAthletes[sector].filter(a => selectedAthletes[a.id] && a.birth_date)
      if (withDob.length === 0) return

      // Trova l'anno di nascita più comune nel gruppo
      const years = withDob.map(a => new Date(a.birth_date!).getFullYear())
      const freqMap: Record<number, number> = {}
      let mostCommonYear = years[0]
      let maxFreq = 0
      years.forEach(y => {
        freqMap[y] = (freqMap[y] ?? 0) + 1
        if (freqMap[y] > maxFreq) {
          maxFreq = freqMap[y]
          mostCommonYear = y
        }
      })

      const suggestion = suggestLeva(mostCommonYear, seasonStartYear)
      result[sector] = { label: suggestion, isNew: !existingSectors.includes(suggestion) }
    })
    return result
  }, [sectorsList, groupedAthletes, selectedAthletes, seasonStartYear, existingSectors])

  const suggestedDestinationsNoDob = useMemo(() => {
    const result: Record<string, { label: string; isNew: boolean }> = {}
    sectorsList.forEach(sector => {
      const noDob = groupedAthletes[sector].filter(a => selectedAthletes[a.id] && !a.birth_date)
      if (noDob.length === 0) return
      // Fallback: leva di provenienza
      result[sector] = { label: sector, isNew: !existingSectors.includes(sector) }
    })
    return result
  }, [sectorsList, groupedAthletes, selectedAthletes, existingSectors])

  // Destinazioni effettive: override manuale se presente, altrimenti suggerimento automatico
  const destinations = useMemo(() => {
    const merged: Record<string, { label: string; isNew: boolean }> = { ...suggestedDestinations }
    Object.entries(overrideDestinations).forEach(([sector, label]) => {
      merged[sector] = { label, isNew: !existingSectors.includes(label) }
    })
    return merged
  }, [suggestedDestinations, overrideDestinations, existingSectors])

  const destinationsNoDob = useMemo(() => {
    const merged: Record<string, { label: string; isNew: boolean }> = { ...suggestedDestinationsNoDob }
    Object.entries(overrideDestinationsNoDob).forEach(([sector, label]) => {
      merged[sector] = { label, isNew: !existingSectors.includes(label) }
    })
    return merged
  }, [suggestedDestinationsNoDob, overrideDestinationsNoDob, existingSectors])

  // --- VALIDATORI ---
  const isNameDuplicate = useMemo(() => {
    return seasons.some(s => s.name.trim().toLowerCase() === seasonName.trim().toLowerCase())
  }, [seasons, seasonName])

  const step1Valid = useMemo(() => {
    return (
      seasonName.trim().length > 0 &&
      !isNameDuplicate &&
      startDate.length > 0 &&
      endDate.length > 0 &&
      new Date(startDate) < new Date(endDate)
    )
  }, [seasonName, isNameDuplicate, startDate, endDate])

  const step2Valid = useMemo(() => {
    return totalSelectedCount > 0
  }, [totalSelectedCount])

  const handleNext = () => {
    if (step === 1 && !step1Valid) return
    if (step === 2 && !step2Valid) return

    const next = step + 1
    setStep(next)
    setMaxStep(prev => Math.max(prev, next))
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  // --- LOGICA DI COSTRUZIONE OPZIONI SELECT LEVA ---
  const allDestOptions = useMemo(() => {
    const list = new Set<string>()
    // Aggiungi leve esistenti
    existingSectors.forEach(s => list.add(s))
    // Aggiungi leve generate/suggerite temporaneamente
    Object.values(destinations).forEach(d => list.add(d.label))
    Object.values(destinationsNoDob).forEach(d => list.add(d.label))
    // Aggiungi leve custom create dall'utente
    customLeve.forEach(l => list.add(l))

    return Array.from(list).sort()
  }, [existingSectors, destinations, destinationsNoDob, customLeve])

  const handleSelectChange = (sector: string, isNoDob: boolean, val: string) => {
    if (val === '__new__') {
      setAddingNewLevaFor({ sector, isNoDob })
      setNewLevaInput('')
      return
    }

    if (isNoDob) {
      setOverrideDestinationsNoDob(prev => ({ ...prev, [sector]: val }))
    } else {
      setOverrideDestinations(prev => ({ ...prev, [sector]: val }))
    }
  }

  const handleConfirmNewLeva = () => {
    const val = newLevaInput.trim()
    if (!val || !addingNewLevaFor) {
      setAddingNewLevaFor(null)
      return
    }

    if (!customLeve.includes(val) && !existingSectors.includes(val)) {
      setCustomLeve(prev => [...prev, val])
    }

    if (addingNewLevaFor.isNoDob) {
      setOverrideDestinationsNoDob(prev => ({ ...prev, [addingNewLevaFor.sector]: val }))
    } else {
      setOverrideDestinations(prev => ({ ...prev, [addingNewLevaFor.sector]: val }))
    }

    setAddingNewLevaFor(null)
    setNewLevaInput('')
  }

  // --- RIEPILOGO FINALE (STEP 4) ---
  const finalSummary = useMemo(() => {
    const summary: Record<string, { count: number; isNew: boolean; verifyCount: number }> = {}

    sectorsList.forEach(sector => {
      const sectorAthletes = groupedAthletes[sector].filter(a => selectedAthletes[a.id])
      if (sectorAthletes.length === 0) return

      const withDobCount = sectorAthletes.filter(a => a.birth_date).length
      const noDobCount = sectorAthletes.filter(a => !a.birth_date).length

      if (withDobCount > 0) {
        const d = destinations[sector]
        if (d) {
          if (!summary[d.label]) {
            summary[d.label] = { count: 0, isNew: d.isNew, verifyCount: 0 }
          }
          summary[d.label].count += withDobCount
        }
      }

      if (noDobCount > 0) {
        const dNoDob = destinationsNoDob[sector]
        if (dNoDob) {
          if (!summary[dNoDob.label]) {
            summary[dNoDob.label] = { count: 0, isNew: dNoDob.isNew, verifyCount: 0 }
          }
          summary[dNoDob.label].count += noDobCount
          summary[dNoDob.label].verifyCount += noDobCount
        }
      }
    })

    return summary
  }, [sectorsList, groupedAthletes, selectedAthletes, destinations, destinationsNoDob])

  // Il placeholder 'Senza Leva' esiste solo per raggruppare la UI: se la destinazione finale
  // coincide con esso e non è stata creata esplicitamente dall'utente come leva custom, va
  // scritta come NULL nel database, non come stringa letterale (altrimenti diventa una leva reale).
  const resolveDestinationSector = (label: string): string | null =>
    label === NO_SECTOR_PLACEHOLDER && !customLeve.includes(label) ? null : label

  // --- MUTATION DI SALVATAGGIO ---
  const createSeasonMutation = useMutation({
    mutationFn: async () => {
      // Prepariamo la lista degli atleti da inviare
      const payload: { player_id: string; team_sector: string | null }[] = []

      athletes.forEach(a => {
        if (!selectedAthletes[a.id]) return
        const originalSector = a.team_sector || NO_SECTOR_PLACEHOLDER

        if (a.birth_date) {
          const destLeva = destinations[originalSector]?.label ?? originalSector
          payload.push({ player_id: a.id, team_sector: resolveDestinationSector(destLeva) })
        } else {
          const destLeva = destinationsNoDob[originalSector]?.label ?? originalSector
          payload.push({ player_id: a.id, team_sector: resolveDestinationSector(destLeva) })
        }
      })

      return seasonService.createSeasonFromWizard(seasonName.trim(), startDate, endDate, payload)
    },
    onSuccess: (data) => {
      // Invalidazione cache stagioni e atleti
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['sectors'] })

      // Aggiorna la stagione selezionata
      setSelectedSeasonId(data.season_id)

      // Conta quante nuove leve sono state create in totale
      const newLeveCount = Object.values(finalSummary).filter(v => v.isNew).length

      setSuccessInfo({
        importedCount: data.imported_count,
        newLeveCount
      })
      setShowSuccess(true)
    },
    onError: (error) => {
      console.error('Errore nella creazione della nuova stagione:', error)
    }
  })

  // Gestione tasto ESC (stessa guardia del click sul backdrop: non chiude durante una
  // scrittura in corso o sulla schermata di successo)
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !addingNewLevaFor && !createSeasonMutation.isPending && !showSuccess) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, addingNewLevaFor, createSeasonMutation.isPending, showSuccess])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop sfocato */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!createSeasonMutation.isPending && !showSuccess) onClose()
          }}
          className="absolute inset-0 bg-background/60 backdrop-blur-xl"
        />

        {/* Corpo Modale */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          role="dialog"
          aria-modal="true"
          className="relative w-[95vw] max-w-3xl h-[85vh] md:h-[80vh] glass-card overflow-hidden flex flex-col border border-[var(--border-strong)] shadow-2xl rounded-[2.5rem]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--border-soft)] flex items-center justify-between gap-4 bg-[var(--surface-05)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30 shrink-0">
                <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black italic tracking-tighter uppercase text-foreground">
                  Nuova <span className="text-brand-accent not-italic">Stagione</span>
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                  Wizard guidato passaggio stagione
                </p>
              </div>
            </div>
            {!createSeasonMutation.isPending && !showSuccess && (
              <button
                onClick={onClose}
                aria-label="Chiudi"
                className="w-8 h-8 pill border border-[var(--border-soft)] flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              </button>
            )}
          </div>

          {/* Stepper (visibile solo se non in schermata successo) */}
          {!showSuccess && (
            <nav className="stepper flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--surface-05)] shrink-0 overflow-x-auto gap-4 scrollbar-none">
              {[
                { s: 1, label: 'Dati Stagione', desc: 'Nome e date' },
                { s: 2, label: 'Atleti', desc: 'Chi importare' },
                { s: 3, label: 'Destinazioni', desc: 'Scatto di leva' },
                { s: 4, label: 'Conferma', desc: 'Riepilogo' }
              ].map((stepItem, i) => (
                <div key={stepItem.s} className="flex items-center gap-3 grow shrink-0 last:grow-0">
                  <button
                    type="button"
                    disabled={stepItem.s > maxStep}
                    onClick={() => setStep(stepItem.s)}
                    className={cn(
                      'flex items-center gap-2 text-left transition-all outline-none',
                      step === stepItem.s
                        ? 'text-foreground font-black'
                        : stepItem.s <= maxStep
                        ? 'text-foreground/60 hover:text-brand-accent cursor-pointer'
                        : 'text-muted-foreground/45 cursor-default'
                    )}
                  >
                    <span
                      className={cn(
                        'w-7 h-7 rounded-full border text-[11px] font-black flex items-center justify-center transition-all',
                        step === stepItem.s
                          ? 'bg-brand-accent text-white border-brand-accent shadow-[0_0_12px_oklch(0.33_0.13_15_/_.45)]'
                          : stepItem.s < step
                          ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                          : 'border-[var(--border-soft)] bg-[var(--surface-05)]'
                      )}
                    >
                      {stepItem.s < step ? <Check className="w-3.5 h-3.5" /> : `0${stepItem.s}`}
                    </span>
                    <div className="hidden md:flex flex-col text-[11px] leading-tight">
                      <span className="font-bold">{stepItem.label}</span>
                      <span className="text-[9px] text-muted-foreground tracking-wide font-normal">
                        {stepItem.desc}
                      </span>
                    </div>
                  </button>
                  {i < 3 && (
                    <div
                      className={cn(
                        'h-[1px] grow min-w-[20px] bg-[var(--border-soft)] hidden sm:block',
                        stepItem.s < step && 'bg-brand-accent/45'
                      )}
                    />
                  )}
                </div>
              ))}
            </nav>
          )}

          {/* Contenuto principale scrollabile */}
          <div className="grow overflow-y-auto p-6 md:p-8 no-scrollbar flex flex-col">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                // --- SCHERMATA SUCCESSO ---
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center gap-5 my-auto"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground">
                      Stagione <span className="text-emerald-500 not-italic">{seasonName}</span> Creata!
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      {successInfo?.importedCount} atleti importati con successo in {Object.keys(finalSummary).length} leve. La stagione precedente è stata storicizzata correttamente ed è ora consultabile nel selettore in sola lettura.
                    </p>
                  </div>
                  <span className="inline-flex h-8 px-4 items-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold uppercase tracking-widest text-[9px]">
                    la nuova stagione è ora attiva
                  </span>

                  <button
                    onClick={onClose}
                    className="mt-6 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform text-xs shadow-lg"
                  >
                    Accedi alla nuova stagione
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={`step-${step}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  {/* --- STEP 1: DATI STAGIONE --- */}
                  {step === 1 && (
                    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
                      <div className="text-center md:text-left">
                        <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                          Dati <span className="text-brand-accent">Stagione Sportiva</span>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Definisci il nome e il periodo di validità della nuova stagione.
                        </p>
                      </div>

                      <div className="flex flex-col gap-4 bg-[var(--surface-05)] p-6 rounded-3xl border border-[var(--border-soft)]">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="seasonName" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Nome Stagione
                          </label>
                          <input
                            id="seasonName"
                            type="text"
                            value={seasonName}
                            onChange={(e) => setSeasonName(e.target.value)}
                            placeholder="es. 2026/2027"
                            className={cn(
                              'h-11 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-05)] text-sm font-semibold outline-none transition-all focus:border-brand-accent',
                              isNameDuplicate && 'border-rose-500 focus:border-rose-500'
                            )}
                          />
                          {isNameDuplicate && (
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">
                              Questa stagione esiste già nel database
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="startDate" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Data Inizio
                            </label>
                            <input
                              id="startDate"
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="h-11 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-05)] text-sm font-semibold outline-none transition-all focus:border-brand-accent"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="endDate" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Data Fine
                            </label>
                            <input
                              id="endDate"
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="h-11 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-05)] text-sm font-semibold outline-none transition-all focus:border-brand-accent"
                            />
                          </div>
                        </div>

                        {startDate && endDate && new Date(startDate) >= new Date(endDate) && (
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide mt-1">
                            La data di inizio deve essere antecedente alla data di fine
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 bg-brand-accent/10 border border-brand-accent/20 p-4 rounded-2xl text-[11px] text-foreground/80 leading-relaxed">
                        <HelpCircle className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-brand-accent uppercase tracking-wider mb-0.5 text-[9px]">Atomicità garantita</p>
                          Il wizard accumula lo stato nel browser. La transazione sul database partirà solo dopo la tua conferma finale nello Step 4. Se abbandoni ora, non verrà creata alcuna riga o dato parziale.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- STEP 2: SELEZIONE ATLETI --- */}
                  {step === 2 && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                            Quali <span className="text-brand-accent">Atleti</span> Importare
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Seleziona i giocatori da importare nella nuova stagione. Disattiva chi non prosegue.
                          </p>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-muted/60 border border-[var(--border-soft)] text-[10px] font-bold uppercase tracking-wider text-muted-foreground self-start md:self-auto">
                          Selezionati: <span className="text-brand-accent font-black">{totalSelectedCount} / {totalAthletesCount}</span>
                        </div>
                      </div>

                      {isLoadingAthletes ? (
                        <div className="py-12 flex justify-center text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                          Caricamento atleti...
                        </div>
                      ) : athletes.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground font-semibold uppercase tracking-wider border border-dashed border-[var(--border-strong)] rounded-2xl">
                          Nessun atleta registrato nella stagione sorgente.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6">
                          {sectorsList.map(sector => {
                            const groupPlayers = groupedAthletes[sector]
                            const selectedInGroup = groupPlayers.filter(p => selectedAthletes[p.id])
                            const isAllSelected = selectedInGroup.length === groupPlayers.length
                            const isSomeSelected = selectedInGroup.length > 0 && !isAllSelected

                            const handleToggleGroup = () => {
                              setSelectedAthletes(prev => {
                                const next = { ...prev }
                                const targetVal = !isAllSelected
                                groupPlayers.forEach(p => {
                                  next[p.id] = targetVal
                                })
                                return next
                              })
                            }

                            return (
                              <div key={sector} className="bg-[var(--surface-05)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm">
                                {/* Header gruppo leva */}
                                <div className="px-5 py-3.5 bg-[var(--surface-05)] border-b border-[var(--border-soft)] flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isAllSelected}
                                      ref={el => {
                                        if (el) el.indeterminate = isSomeSelected
                                      }}
                                      onChange={handleToggleGroup}
                                      className="w-4 h-4 rounded border-[var(--border-strong)] accent-primary cursor-pointer"
                                    />
                                    <h4 className="text-sm font-black italic uppercase text-foreground">{sector}</h4>
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {selectedInGroup.length} / {groupPlayers.length} atleti
                                  </span>
                                </div>

                                {/* Lista atleti nel gruppo */}
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {groupPlayers.map(player => {
                                    const isChecked = !!selectedAthletes[player.id]
                                    const birthYear = player.birth_date ? new Date(player.birth_date).getFullYear() : null

                                    const handleTogglePlayer = () => {
                                      setSelectedAthletes(prev => ({
                                        ...prev,
                                        [player.id]: !isChecked
                                      }))
                                    }

                                    return (
                                      <button
                                        key={player.id}
                                        type="button"
                                        onClick={handleTogglePlayer}
                                        className={cn(
                                          'flex items-center justify-between p-3 rounded-2xl border text-left transition-all',
                                          isChecked
                                            ? 'bg-brand-accent/10 border-brand-accent/45 text-foreground'
                                            : 'bg-[var(--surface-05)] border-[var(--border-soft)] hover:border-[var(--border-strong)] text-foreground/50'
                                        )}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div
                                            className={cn(
                                              'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                              isChecked ? 'bg-brand-accent border-brand-accent text-white' : 'border-[var(--border-strong)] bg-[var(--surface-05)]'
                                            )}
                                          >
                                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                          </div>
                                          <span className="text-xs font-bold truncate">
                                            {player.last_name} {player.first_name}
                                          </span>
                                        </div>
                                        {birthYear ? (
                                          <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0 ml-2">
                                            {birthYear}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0 ml-2" title="Senza data di nascita">
                                            no dob
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- STEP 3: DESTINAZIONE LEVE --- */}
                  {step === 3 && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                          Scatto di <span className="text-brand-accent">Leva</span>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verifica la leva di destinazione calcolata in base all'anno di nascita (FIGC). Puoi fare override o creare nuove leve.
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        {/* 1. Atleti con data di nascita */}
                        {sectorsList.map(sector => {
                          const hasAthletesWithDob = groupedAthletes[sector].some(a => selectedAthletes[a.id] && a.birth_date)
                          if (!hasAthletesWithDob) return null

                          const countSelectedWithDob = groupedAthletes[sector].filter(a => selectedAthletes[a.id] && a.birth_date).length
                          const destInfo = destinations[sector] ?? { label: sector, isNew: false }

                          return (
                            <div
                              key={`${sector}-dob`}
                              className="p-5 bg-[var(--surface-05)] border border-[var(--border-soft)] rounded-[2rem] grid grid-cols-1 md:grid-cols-[1fr_auto_1.2fr] gap-4 items-center"
                            >
                              {/* Provenienza */}
                              <div className="flex flex-col gap-1 min-w-0">
                                <h4 className="text-sm font-black italic uppercase text-foreground">{sector}</h4>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  {countSelectedWithDob} atlet{countSelectedWithDob === 1 ? 'o' : 'i'} selezionat{countSelectedWithDob === 1 ? 'o' : 'i'}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 leading-normal mt-0.5">
                                  Suggerito scatto leva per nati nel gruppo in base alla stagione {seasonStartYear}
                                </span>
                              </div>

                              {/* Freccia */}
                              <div className="hidden md:flex justify-center text-muted-foreground/45">
                                <ArrowRight className="w-5 h-5" />
                              </div>

                              {/* Destinazione */}
                              <div className="flex flex-col gap-2">
                                {addingNewLevaFor?.sector === sector && !addingNewLevaFor.isNoDob ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={newLevaInput}
                                      onChange={(e) => setNewLevaInput(e.target.value)}
                                      placeholder="Nome nuova leva... es. Pulcini 2017"
                                      className="grow h-10 px-3 rounded-full border border-brand-accent/45 bg-[var(--surface-05)] text-xs font-bold outline-none"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirmNewLeva()
                                        if (e.key === 'Escape') setAddingNewLevaFor(null)
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setAddingNewLevaFor(null)}
                                      className="w-8 h-8 rounded-full border border-[var(--border-soft)] flex items-center justify-center text-muted-foreground hover:bg-[var(--surface-05)] transition-all shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="relative">
                                      <select
                                        value={destInfo.label}
                                        onChange={(e) => handleSelectChange(sector, false, e.target.value)}
                                        className="w-full h-10 rounded-full border border-[var(--border-strong)] bg-[var(--surface-05)] px-4 text-xs font-black uppercase tracking-wider outline-none cursor-pointer appearance-none text-foreground"
                                      >
                                        <optgroup label="Leve esistenti" className="bg-[oklch(0.205_0_0)]">
                                          {existingSectors.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="Nuove leve suggerite / create" className="bg-[oklch(0.205_0_0)]">
                                          {allDestOptions.filter(o => !existingSectors.includes(o)).map(o => (
                                            <option key={o} value={o}>{o} ✦</option>
                                          ))}
                                        </optgroup>
                                        <option value="__new__" className="text-brand-accent font-bold bg-[oklch(0.205_0_0)]">
                                          + Crea nuova leva...
                                        </option>
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2 px-1">
                                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                        Suggerita: {suggestedDestinations[sector]?.label ?? sector}
                                      </span>
                                      {destInfo.isNew && (
                                        <span className="inline-flex h-4 px-2 items-center rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold uppercase tracking-wider text-[8px]">
                                          nuova leva
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* 2. Atleti senza data di nascita */}
                        {sectorsList.map(sector => {
                          const groupNoDob = groupedAthletes[sector].filter(a => selectedAthletes[a.id] && !a.birth_date)
                          if (groupNoDob.length === 0) return null

                          const destInfo = destinationsNoDob[sector] ?? { label: sector, isNew: false }

                          return (
                            <div
                              key={`${sector}-nodob`}
                              className="p-5 bg-amber-500/[0.03] border border-amber-500/20 rounded-[2rem] grid grid-cols-1 md:grid-cols-[1fr_auto_1.2fr] gap-4 items-center"
                            >
                              {/* Provenienza */}
                              <div className="flex flex-col gap-1 min-w-0">
                                <h4 className="text-sm font-black italic uppercase text-foreground">
                                  {groupNoDob.map(a => `${a.last_name} ${a.first_name}`).join(', ')}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Da {sector}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-amber-500 bg-amber-500/10 px-2 h-5 rounded-full border border-amber-500/20 uppercase tracking-wider shrink-0">
                                    <AlertTriangle className="w-3 h-3" /> Da verificare
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 leading-normal mt-1">
                                  Senza data di nascita: impossibile calcolare lo scatto. Default: leva di provenienza.
                                </span>
                              </div>

                              {/* Freccia */}
                              <div className="hidden md:flex justify-center text-muted-foreground/45">
                                <ArrowRight className="w-5 h-5" />
                              </div>

                              {/* Destinazione */}
                              <div className="flex flex-col gap-2">
                                {addingNewLevaFor?.sector === sector && addingNewLevaFor.isNoDob ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={newLevaInput}
                                      onChange={(e) => setNewLevaInput(e.target.value)}
                                      placeholder="Nome nuova leva..."
                                      className="grow h-10 px-3 rounded-full border border-brand-accent/45 bg-[var(--surface-05)] text-xs font-bold outline-none"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirmNewLeva()
                                        if (e.key === 'Escape') setAddingNewLevaFor(null)
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setAddingNewLevaFor(null)}
                                      className="w-8 h-8 rounded-full border border-[var(--border-soft)] flex items-center justify-center text-muted-foreground hover:bg-[var(--surface-05)] transition-all shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="relative">
                                      <select
                                        value={destInfo.label}
                                        onChange={(e) => handleSelectChange(sector, true, e.target.value)}
                                        className="w-full h-10 rounded-full border border-[var(--border-strong)] bg-[var(--surface-05)] px-4 text-xs font-black uppercase tracking-wider outline-none cursor-pointer appearance-none text-foreground"
                                      >
                                        <optgroup label="Leve esistenti" className="bg-[oklch(0.205_0_0)]">
                                          {existingSectors.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="Nuove leve suggerite / create" className="bg-[oklch(0.205_0_0)]">
                                          {allDestOptions.filter(o => !existingSectors.includes(o)).map(o => (
                                            <option key={o} value={o}>{o} ✦</option>
                                          ))}
                                        </optgroup>
                                        <option value="__new__" className="text-brand-accent font-bold bg-[oklch(0.205_0_0)]">
                                          + Crea nuova leva...
                                        </option>
                                      </select>
                                    </div>
                                    {destInfo.isNew && (
                                      <div className="px-1">
                                        <span className="inline-flex h-4 px-2 items-center rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold uppercase tracking-wider text-[8px]">
                                          nuova leva
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* --- STEP 4: CONFERMA --- */}
                  {step === 4 && (
                    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
                      <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                          Riepilogo <span className="text-brand-accent">Stagione {seasonName}</span>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verifica la composizione della nuova stagione prima di confermare.
                        </p>
                      </div>

                      <div className="bg-[var(--surface-05)] border border-[var(--border-soft)] rounded-3xl p-6 flex flex-col gap-4">
                        <div className="max-h-[30vh] overflow-y-auto no-scrollbar flex flex-col gap-3 pr-1">
                          {Object.entries(finalSummary)
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([levaName, v]) => (
                              <div key={levaName} className="flex items-center justify-between p-3.5 bg-[var(--surface-05)] rounded-2xl border border-[var(--border-soft)]">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20 shrink-0">
                                    <Users className="w-4 h-4 text-brand-accent" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold">{levaName}</span>
                                    {v.isNew && (
                                      <span className="inline-flex h-4 px-1.5 items-center rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold uppercase tracking-wider text-[8px]">
                                        nuova
                                      </span>
                                    )}
                                    {v.verifyCount > 0 && (
                                      <span className="inline-flex h-4 px-1.5 items-center rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold uppercase tracking-wider text-[8px]">
                                        {v.verifyCount} da verificare
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-muted-foreground">
                                  {v.count} atlet{v.count === 1 ? 'o' : 'i'}
                                </span>
                              </div>
                            ))}
                        </div>

                        <div className="h-[1px] bg-[var(--border-soft)]" />

                        <div className="flex items-center justify-between px-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Totale atleti importati
                          </span>
                          <span className="text-sm font-black text-brand-accent">
                            {totalSelectedCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-[11px] text-foreground/80 leading-relaxed">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-500 uppercase tracking-wider mb-0.5 text-[9px]">Storicizzazione Stagione Corrente</p>
                          La nuova stagione {seasonName} diventerà quella attiva per l'applicazione. La vecchia stagione resterà salvata nel database in sola lettura e sarà sempre consultabile dal menu a tendina nell'header.
                        </div>
                      </div>

                      {createSeasonMutation.isError && (
                        <div className="flex gap-3 bg-rose-500/15 border border-rose-500/40 p-4 rounded-2xl text-[11px] text-rose-500 leading-relaxed">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold uppercase tracking-wider mb-0.5 text-[9px]">Errore durante la creazione</p>
                            {createSeasonMutation.error instanceof Error
                              ? createSeasonMutation.error.message
                              : 'Si è verificato un errore imprevisto. Riprova.'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigazione */}
          {!showSuccess && (
            <div className="px-6 py-4 border-t border-[var(--border-soft)] flex items-center justify-between gap-4 bg-[var(--surface-05)] shrink-0">
              <button
                type="button"
                disabled={step === 1 || createSeasonMutation.isPending}
                onClick={handleBack}
                className={cn(
                  'px-4 h-9 rounded-full border border-[var(--border-strong)] text-xs font-bold flex items-center gap-1.5 transition-all outline-none',
                  step === 1 || createSeasonMutation.isPending
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[var(--surface-05)] active:scale-[0.97] cursor-pointer'
                )}
              >
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                  onClick={handleNext}
                  className={cn(
                    'px-4 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 transition-all outline-none',
                    (step === 1 && !step1Valid) || (step === 2 && !step2Valid)
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                  )}
                >
                  Avanti <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={createSeasonMutation.isPending}
                  onClick={() => createSeasonMutation.mutate()}
                  className={cn(
                    'px-5 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform outline-none cursor-pointer',
                    createSeasonMutation.isPending && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {createSeasonMutation.isPending ? (
                    'Creazione in corso...'
                  ) : (
                    <>
                      Crea Stagione <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Search, User, CheckCircle2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { useFormModal } from '@/hooks/useFormModal'
import { useAuth } from '@/hooks/useAuth'
import {
  searchPlayersForRequest,
  requestChildLink,
  type PlayerSearchResult,
} from '@/services/parentService'
import { cn } from '@/lib/utils'

interface RequestChildLinkModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RequestChildLinkModal({ isOpen, onClose }: Readonly<RequestChildLinkModalProps>) {
  const { user } = useAuth()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null)

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedPlayer(null)
      return
    }
  }, [isOpen])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchPlayersForRequest(query.trim())
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const { loading, submit: handleSubmit } = useFormModal({
    onSubmit: async () => {
      if (!selectedPlayer) throw new Error('Seleziona un atleta')
      if (!user) throw new Error('Utente non autenticato')
      await requestChildLink(selectedPlayer.id, user.id)
    },
    invalidateKeys: [['my-children']],
    onClose,
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-[95vw] max-w-lg glass-card p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase leading-none">
                    Collega un <span className="text-primary not-italic">Figlio</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                    Richiesta di associazione
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
              {/* Search field */}
              <div className="space-y-2">
                <label htmlFor="player-search" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Cerca l&apos;atleta per nome o cognome
                </label>
                <div className="relative group">
                  {searching
                    ? <LoadingSpinner size="sm" className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    : <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 pointer-events-none z-10 group-focus-within:text-primary transition-colors" />
                  }
                  <input
                    id="player-search"
                    type="text"
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value)
                      setSelectedPlayer(null)
                    }}
                    placeholder="Minimo 2 caratteri..."
                    autoComplete="off"
                    className="w-full h-14 pl-14 pr-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-primary focus:outline-none text-sm font-medium placeholder:text-muted-foreground/40 text-foreground transition-all"
                  />
                </div>

                {/* Results list */}
                <AnimatePresence>
                  {results.length > 0 && !selectedPlayer && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="glass-card rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden divide-y divide-black/5 dark:divide-white/5"
                    >
                      {results.map(player => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlayer(player)
                            setResults([])
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left"
                        >
                          <div className="w-8 h-8 pill bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {player.last_name} {player.first_name}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                              {player.team_sector ?? '—'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Selected player confirmation chip */}
              <AnimatePresence>
                {selectedPlayer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 glass-card rounded-2xl flex items-center gap-4 border border-primary/20 bg-primary/5"
                  >
                    <div className="w-10 h-10 pill bg-primary/20 flex items-center justify-center border border-primary/30">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground uppercase">
                        {selectedPlayer.last_name} {selectedPlayer.first_name}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {selectedPlayer.team_sector ?? '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayer(null)
                        setQuery('')
                      }}
                      className="w-8 h-8 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info note */}
              <p className="text-xs text-muted-foreground/60 text-center px-2 leading-relaxed">
                La richiesta dovrà essere confermata da un amministratore prima di essere attiva.
              </p>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-4">
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
                  disabled={loading || !selectedPlayer}
                  className={cn(
                    "flex-[2] h-14 pill font-black uppercase tracking-widest text-[10px] shadow-2xl gap-3 active:scale-95 transition-all disabled:opacity-50",
                    "bg-primary hover:bg-primary/90 text-white shadow-primary/40"
                  )}
                >
                  {loading ? <LoadingSpinner size="sm" tone="white" /> : <Users className="w-5 h-5" />}
                  Invia Richiesta
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

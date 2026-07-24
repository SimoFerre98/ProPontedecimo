import { useQuery } from '@tanstack/react-query'
import { callUpService } from '@/services/callUpService'
import { CalendarDays, Clock, CheckCircle2, User, UserX, ArrowRight, Flag } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NextCallUpCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['next-call-up'],
    queryFn: callUpService.getMyNextCallUp,
    refetchInterval: 300000, // 5 minuti
  })

  if (isLoading) {
    return (
      <div className="w-full h-48 rounded-[2rem] bg-black/5 dark:bg-white/5 animate-pulse flex items-center justify-center border border-white/5">
        <div className="flex flex-col items-center gap-3">
          <Clock className="w-8 h-8 text-muted-foreground/30 animate-spin" />
          <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Caricamento convocazione...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return null // Fallisce silenziosamente come da prassi per componenti dashboard secondari
  }

  // Stato 0: Profilo non collegato ad alcun atleta attivo nella stagione corrente
  if (data == null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="chc-not-card border-white/5"
      >
        <div className="empty-icon text-muted-foreground/40 flex items-center justify-center">
          <User className="w-10 h-10" />
        </div>
        <h4 className="text-foreground uppercase italic font-black">Profilo non collegato</h4>
        <p className="text-muted-foreground">
          Il tuo profilo utente non risulta collegato ad alcun atleta attivo nella stagione corrente. Contatta la segreteria per allineare l'associazione.
        </p>
      </motion.div>
    )
  }

  // Stato 1: Nessuna partita in programma per la leva
  if (data.opponent === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="chc-not-card border-white/5"
      >
        <div className="empty-icon text-muted-foreground/40 flex items-center justify-center">
          <CalendarDays className="w-10 h-10" />
        </div>
        <h4 className="text-foreground uppercase italic font-black">Nessuna partita</h4>
        <p className="text-muted-foreground">
          Non ci sono partite ufficiali in programma per la tua leva al momento.
        </p>
      </motion.div>
    )
  }

  // Formattazione data e orari in italiano
  const matchDate = new Date(data.start_date)
  const formattedDate = matchDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(/^\w/, (c) => c.toUpperCase())

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const formattedRitrovo = formatTime(data.meetup_time)
  const formattedInizio = formatTime(data.start_date)

  // Stato 2: Convocazione non ancora pubblicata (Bozza)
  if (!data.is_published) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="chc-not-card border-amber-500/20 dark:bg-amber-500/5 bg-amber-500/[0.02]"
      >
        <div className="empty-icon text-amber-500 flex items-center justify-center">
          <Clock className="w-10 h-10" />
        </div>
        <h4 className="text-amber-500 uppercase italic font-black">In attesa delle convocazioni</h4>
        <p className="text-muted-foreground">
          L'allenatore sta compilando la lista convocati per la partita di <strong>{formattedDate}</strong> contro il <strong>{data.opponent}</strong>. Riceverai una notifica appena sarà pubblicata.
        </p>
      </motion.div>
    )
  }

  // Stato 3: Convocazione pubblicata ma l'atleta NON è convocato
  if (!data.is_called_up) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="chc-not-card border-rose-500/20 dark:bg-rose-500/5 bg-rose-500/[0.02]"
      >
        <div className="empty-icon text-rose-500/60 flex items-center justify-center">
          <UserX className="w-10 h-10" />
        </div>
        <h4 className="text-rose-500 uppercase italic font-black">Non Convocato</h4>
        <p className="text-muted-foreground">
          Per la partita di <strong>{formattedDate}</strong> contro il <strong>{data.opponent}</strong> non sei stato inserito nella lista convocati. Buon allenamento con il gruppo!
        </p>
      </motion.div>
    )
  }

  // Stato 4: Convocazione pubblicata e l'atleta È CONVOCATO!
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="callup-hero-card"
    >
      <span className="chc-badge">
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Sei stato convocato
      </span>
      
      <div className="chc-title">
        <span>{data.event_type === 'home_match' ? 'Campionato · Casa' : 'Campionato · Trasferta'}</span>
        <b className="text-foreground">
          Pro Pontedecimo <span className="accent text-brand-accent dark:text-amber-500">vs</span> {data.opponent}
        </b>
      </div>

      <div className="chc-date text-sm font-bold text-foreground">
        <CalendarDays className="w-4 h-4 text-brand-accent dark:text-amber-500" />
        {formattedDate}
      </div>

      <div className="chc-timeline w-full">
        <div className="eh-time ritrovo">
          <span className="lbl flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Ritrovo
          </span>
          <b className="text-amber-500 font-mono">{formattedRitrovo}</b>
        </div>
        <ArrowRight className="eh-arrow w-5 h-5 opacity-40" />
        <div className="eh-time right">
          <span className="lbl flex items-center gap-1 justify-end text-muted-foreground">
            <Flag className="w-3.5 h-3.5 text-muted-foreground" />
            Inizio Gara
          </span>
          <b className="font-mono text-foreground">{formattedInizio}</b>
        </div>
      </div>

      <span className="live-pill text-emerald-500 text-xs mt-1">
        <span className="live-dot bg-emerald-500" />
        Lista aggiornata in tempo reale
      </span>
    </motion.div>
  )
}

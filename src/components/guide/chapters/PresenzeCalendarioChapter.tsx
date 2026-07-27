import { Check, X, HelpCircle, Dumbbell, Home, MapPin, Users, Calendar, Link2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalloutProps {
  n: number
  className?: string
}

function Callout({ n, className }: Readonly<CalloutProps>) {
  return (
    <span
      className={cn(
        'absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand-accent text-white text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-background',
        className
      )}
    >
      {n}
    </span>
  )
}

const EVENT_TYPES = [
  { label: 'Allenamento', icon: Dumbbell, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { label: 'Partita in Casa', icon: Home, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { label: 'Trasferta', icon: MapPin, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { label: 'Riunione', icon: Users, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { label: 'Evento Generico', icon: Calendar, color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
]

export default function PresenzeCalendarioChapter() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 5</span>
        <h2 className="text-2xl font-black mt-1">Presenze e Calendario Eventi</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          Qui trovi come registrare le presenze agli allenamenti e come leggere il calendario della società, incluse le partite con doppio orario e la sincronizzazione con il tuo calendario personale.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">1. Registrare le presenze</h3>
        <p className="text-sm text-muted-foreground">Nel registro presenze, per ogni giocatore trovi tre pulsanti: tocca quello giusto per segnarlo Presente, Assente o Giustificato.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/20">
            <span className="text-sm font-semibold">Mario Rossi</span>
            <div className="relative flex items-center gap-1.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Check className="w-4 h-4" /></span>
              <span className="w-8 h-8 rounded-lg border border-border text-muted-foreground flex items-center justify-center"><X className="w-4 h-4" /></span>
              <span className="w-8 h-8 rounded-lg border border-border text-muted-foreground flex items-center justify-center"><HelpCircle className="w-4 h-4" /></span>
              <Callout n={1} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-muted-foreground pt-1">
            <span><b className="text-emerald-500">12</b> presenti</span>
            <span><b className="text-rose-500">2</b> assenti</span>
            <span><b className="text-amber-500">1</b> giustificato</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">2. Le tipologie di evento e il doppio orario</h3>
        <p className="text-sm text-muted-foreground">Ogni evento del calendario ha un'icona e un colore in base al tipo. Le partite hanno due orari distinti: quello di ritrovo (quando i giocatori devono arrivare) e quello di inizio della partita.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(t => (
              <span key={t.label} className={cn('px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5', t.color)}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </span>
            ))}
          </div>
          <div className="relative grid grid-cols-2 gap-3 max-w-sm">
            <div className="p-3 rounded-xl border border-border bg-muted/20 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Ritrovo</p>
              <p className="text-sm font-black mt-1">16:15</p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/20 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Inizio Partita</p>
              <p className="text-sm font-black mt-1">17:00</p>
            </div>
            <Callout n={2} />
          </div>
          <p className="text-xs text-muted-foreground">L'orario di ritrovo è richiesto solo per le partite (in casa o in trasferta): per allenamenti e riunioni c'è un solo orario.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">3. Sincronizzare il calendario sul tuo telefono</h3>
        <p className="text-sm text-muted-foreground">Dalla sezione Profilo puoi copiare un link personale: aggiungendolo al tuo calendario Google o Apple, vedrai automaticamente tutti gli eventi della società, sempre aggiornati.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="relative flex items-center gap-3 p-3 rounded-2xl border border-border bg-muted/20">
            <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate flex-1">https://propontedecimo.app/api/ics/a1b2c3d4...</span>
            <span className="bg-brand-accent text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 flex-shrink-0"><Copy className="w-3 h-3" /> Copia</span>
            <Callout n={3} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Copia il link e incollalo nelle impostazioni "Aggiungi calendario tramite URL" della tua app di calendario preferita.</p>
        </div>
      </section>
    </div>
  )
}

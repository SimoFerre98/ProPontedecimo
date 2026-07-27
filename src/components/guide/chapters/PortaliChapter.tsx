import { Euro, CheckCircle2, Megaphone, Users, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuideChapterVariant } from '@/components/guide/chapters/PrimiPassiChapter'

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

function PortaleGenitoreSection() {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-bold">Portale Genitore</h3>
      <p className="text-sm text-muted-foreground">Nella tua area personale trovi una scheda per ogni figlio associato, con il riepilogo delle rate pagate e da pagare e la scadenza della visita medica.</p>

      <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
        <div className="relative flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/20">
          <div>
            <p className="text-sm font-bold">Mario Rossi</p>
            <p className="text-[10px] text-muted-foreground">Allievi · Stagione 2025/26</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black flex items-center gap-1"><Euro className="w-3.5 h-3.5 text-muted-foreground" /> 2/3 rate</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Visita Valida</span>
          </div>
          <Callout n={1} />
        </div>
      </div>
    </section>
  )
}

function PortaleGiocatoreSection() {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-bold">Portale Giocatore</h3>
      <p className="text-sm text-muted-foreground">Quando l'allenatore pubblica la convocazione per la prossima partita, la trovi qui: ti dice se sei stato convocato o no.</p>

      <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
        <div className="relative flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <Megaphone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">Sei stato convocato</p>
            <p className="text-xs text-muted-foreground mt-0.5">Partita in Casa · Sabato 15:00 · Ritrovo 14:15</p>
          </div>
          <Callout n={2} />
        </div>
      </div>
    </section>
  )
}

function PortaleAllenatoreSection() {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-bold">Portale Allenatore</h3>
      <p className="text-sm text-muted-foreground">Da "Convocazioni" scegli i giocatori della tua rosa e pubblichi la lista: solo dopo la pubblicazione i giocatori la vedono. Da "Squadra" consulti l'anagrafica degli atleti della tua leva.</p>

      <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4 text-muted-foreground" /> Convocati <b className="text-foreground">14</b> su <b className="text-foreground">18</b> della rosa</span>
          <div className="relative">
            <span className="bg-brand-accent text-white px-3 py-1.5 rounded-xl text-[10px] font-bold">Pubblica convocazione</span>
            <Callout n={3} />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="relative flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Squadra · Allievi (14 atleti attivi)</span>
          <Callout n={4} className="-top-1 -right-1 w-4 h-4 text-[8px]" />
        </div>
      </div>
    </section>
  )
}

interface PortaliChapterProps {
  variant?: GuideChapterVariant
}

export default function PortaliChapter({ variant = 'staff' }: Readonly<PortaliChapterProps>) {
  const isPortal = variant === 'portal'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 8</span>
        <h2 className="text-2xl font-black mt-1">Portali Genitore, Giocatore e Allenatore</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          {isPortal
            ? 'Le sezioni pensate per te: il bilancio dei tuoi figli e le convocazioni della squadra.'
            : "La sezione pensata per l'allenatore: gestione delle convocazioni e della propria squadra."}
        </p>
      </div>

      {isPortal ? (
        <>
          <PortaleGenitoreSection />
          <PortaleGiocatoreSection />
        </>
      ) : (
        <PortaleAllenatoreSection />
      )}
    </div>
  )
}

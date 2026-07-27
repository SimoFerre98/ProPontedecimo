import { Calendar, ChevronDown, Plus, Users, ArrowRight, Check, Sparkles } from 'lucide-react'
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

export default function StagioniSportiveChapter() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 3</span>
        <h2 className="text-2xl font-black mt-1">Stagioni Sportive</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          Ogni cosa nel gestionale — atleti, pagamenti, presenze — appartiene a una stagione sportiva. Qui trovi come cambiare la stagione che stai consultando e come crearne una nuova a fine anno.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">1. Il selettore stagione</h3>
        <p className="text-sm text-muted-foreground">In alto nell'header trovi una pillola con il nome della stagione corrente. Cliccandola si apre l'elenco di tutte le stagioni: quella "Attiva" è evidenziata con un badge.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="flex justify-center">
            <div className="relative">
              <span className="pill bg-muted/60 border border-border text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3 h-3" /> Stagione <b className="text-brand-accent">2025/26</b>
                <ChevronDown className="w-3 h-3" />
              </span>
              <Callout n={1} />
            </div>
          </div>
          <div className="mt-4 max-w-xs mx-auto flex flex-col gap-1.5 rounded-2xl border border-border p-2 bg-muted/20">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-accent text-white text-xs font-semibold">
              <span>2025/26</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 text-[9px] uppercase tracking-wider font-black">Attiva</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground">
              <span>2024/25</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-brand-accent">
              <Plus className="w-3.5 h-3.5" /> Nuova stagione
              <Callout n={2} className="-top-1 -right-1 w-4 h-4 text-[8px]" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">La voce "Nuova stagione" è visibile solo a Presidente e Direttore.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">2. Il wizard di nuova stagione</h3>
        <p className="text-sm text-muted-foreground">Creare una nuova stagione avvia una procedura guidata in 4 passaggi: non modifica nulla finché non arrivi all'ultimo step.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative p-4 rounded-2xl bg-muted/30 border border-border">
              <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent font-black text-xs flex items-center justify-center mb-2">1</div>
              <h4 className="text-sm font-bold">Dati stagione</h4>
              <p className="text-xs text-muted-foreground mt-1">Nome e date di inizio/fine, proposti automaticamente in base alla stagione attiva.</p>
              <Callout n={3} />
            </div>
            <div className="relative p-4 rounded-2xl bg-muted/30 border border-border">
              <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent font-black text-xs flex items-center justify-center mb-2">2</div>
              <h4 className="text-sm font-bold">Scelta atleti</h4>
              <p className="text-xs text-muted-foreground mt-1">Seleziona quali atleti attivi portare nella nuova stagione.</p>
              <Callout n={4} />
            </div>
            <div className="relative p-4 rounded-2xl bg-muted/30 border border-border">
              <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent font-black text-xs flex items-center justify-center mb-2">3</div>
              <h4 className="text-sm font-bold flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Scatto di leva</h4>
              <p className="text-xs text-muted-foreground mt-1">Il gestionale suggerisce la nuova leva per ogni atleta (es. Esordienti → Giovanissimi); puoi correggere o creare leve nuove.</p>
              <Callout n={5} />
            </div>
            <div className="relative p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 font-black text-xs flex items-center justify-center mb-2"><Check className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Fatto!</h4>
              <p className="text-xs text-muted-foreground mt-1">Riepilogo di quanti atleti sono stati importati e quante nuove leve sono state create.</p>
              <Callout n={6} className="bg-emerald-500" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold pt-1">
            Step 1 <ArrowRight className="w-3 h-3" /> Step 2 <ArrowRight className="w-3 h-3" /> Step 3 <ArrowRight className="w-3 h-3" /> Fatto
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">3. Cosa succede agli atleti e ai pagamenti</h3>
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <div className="flex gap-3 items-start p-3 rounded-xl bg-muted/30">
            <Users className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Gli atleti selezionati vengono <b className="text-foreground">copiati</b> nella nuova stagione con i loro dati anagrafici, la matricola FIGC e la scadenza della visita medica: non serve reinserirli da capo.</p>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Se un atleta ha rate non pagate nella stagione precedente, il debito lo segue nella nuova stagione come rata <b className="text-foreground">"Debito Pregresso"</b>, così nessun insoluto va perso al cambio di stagione (vedi il capitolo "Pagamenti e Quote").</p>
          </div>
        </div>
      </section>
    </div>
  )
}

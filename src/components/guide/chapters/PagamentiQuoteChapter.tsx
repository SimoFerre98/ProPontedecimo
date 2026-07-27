import { Calendar, AlertCircle, Minus, Plus, FileSpreadsheet, ArrowRight } from 'lucide-react'
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

export default function PagamentiQuoteChapter() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 4</span>
        <h2 className="text-2xl font-black mt-1">Pagamenti e Quote</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          In questa sezione imparerai come consultare le rate di un atleta, creare un piano di pagamento personalizzato e capire cosa significa quando una rata resta insoluta.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">1. Consultare le rate di un atleta</h3>
        <p className="text-sm text-muted-foreground">Apri il dettaglio pagamenti di un atleta per vedere l'elenco delle rate: ognuna mostra la data di scadenza, l'importo e lo stato.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-2">
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-3 rounded-2xl border border-border bg-muted/20">
            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-xs font-black">1</div>
            <span className="text-xs font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> 15 Set 2025</span>
            <span className="text-sm font-black">€ 100,00</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Saldato</span>
          </div>
          <div className="relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 border-l-4 border-l-rose-500">
            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black">2</div>
            <span className="text-xs font-bold flex items-center gap-1.5 text-rose-500"><Calendar className="w-3.5 h-3.5" /> 15 Nov 2025</span>
            <span className="text-sm font-black text-rose-500">€ 100,00</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Scaduta</span>
            <Callout n={1} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">2. Creare un piano di pagamento a rate</h3>
        <p className="text-sm text-muted-foreground">Dal dettaglio dell'atleta puoi creare o modificare un piano rate personalizzato: scegli quante rate, il gestionale divide l'importo in automatico, poi puoi correggere ogni importo o scadenza a mano.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Piano Rate</span>
            <div className="relative flex items-center gap-2 bg-muted/40 rounded-full px-2 py-1">
              <button className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
              <span className="text-xs font-black w-10 text-center">3 rate</span>
              <button className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              <Callout n={2} className="-top-1 -right-1 w-4 h-4 text-[8px]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: 1, date: '15/09/25' },
              { n: 2, date: '15/11/25' },
              { n: 3, date: '15/01/26' },
            ].map(rata => (
              <div key={rata.n} className="p-2 rounded-xl border border-border bg-muted/20 text-center">
                <p className="text-[8px] font-black uppercase tracking-wider text-brand-accent/70">Rata {rata.n}</p>
                <p className="text-xs font-bold mt-1">€ 100,00</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{rata.date}</p>
              </div>
            ))}
          </div>
          <div className="relative flex justify-center pt-1">
            <span className="bg-brand-accent text-white px-4 py-2 rounded-xl text-xs font-bold">Crea Piano Rate</span>
            <Callout n={3} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Attenzione: creare un nuovo piano sostituisce le rate non ancora pagate. Le rate già saldate non vengono mai toccate.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">3. Il debito pregresso</h3>
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-amber-500">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Debito Pregresso</p>
              <p className="text-xs text-muted-foreground mt-0.5">Se un atleta aveva rate non pagate nella stagione precedente, quando entra nella nuova stagione il gestionale crea automaticamente questa rata speciale: è il modo in cui l'insoluto "segue" l'atleta, senza andare perso.</p>
            </div>
            <Callout n={4} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">4. Esportare i pagamenti in Excel</h3>
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">In alto nella pagina Pagamenti trovi il pulsante per esportare l'elenco completo in un file Excel.</p>
          <div className="relative flex-shrink-0">
            <span className="bg-brand-accent text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Esporta Excel
            </span>
            <Callout n={5} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          Per il dettaglio su cosa contiene l'esportazione, vedi il capitolo <ArrowRight className="w-3 h-3" /> <b className="text-foreground">"Reportistica ed Esportazioni"</b>.
        </p>
      </section>
    </div>
  )
}

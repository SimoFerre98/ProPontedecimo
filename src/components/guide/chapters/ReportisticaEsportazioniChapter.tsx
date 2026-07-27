import { FileSpreadsheet, TrendingUp } from 'lucide-react'
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

export default function ReportisticaEsportazioniChapter() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 7</span>
        <h2 className="text-2xl font-black mt-1">Reportistica ed Esportazioni</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          Qui trovi come scaricare i dati della società in un file Excel e come leggere il grafico dell'andamento finanziario.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">1. Esportare atleti e pagamenti in Excel</h3>
        <p className="text-sm text-muted-foreground">Sia nella pagina Atleti che nella pagina Pagamenti trovi in alto un pulsante per scaricare l'elenco completo in un file Excel, pronto per essere aperto o condiviso.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex items-center justify-center">
          <div className="relative">
            <span className="bg-brand-accent text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" /> Esporta Excel
            </span>
            <Callout n={1} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">2. Leggere il grafico dell'andamento finanziario</h3>
        <p className="text-sm text-muted-foreground">Nella Dashboard trovi il grafico "Incassato vs Previsto": confronta quanto ci si aspettava di incassare con quanto è stato effettivamente riscosso, mese per mese.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <p className="text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-accent" /> Incassato <span className="text-amber-500 not-italic">vs</span> Previsto</p>
          <div className="relative flex items-end gap-6 h-24 px-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 rounded-t-md bg-muted-foreground/20" style={{ height: '80%' }} />
              <span className="text-[9px] font-bold text-muted-foreground">Previsto</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 rounded-t-md bg-emerald-500/70" style={{ height: '55%' }} />
              <span className="text-[9px] font-bold text-muted-foreground">Quota</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 rounded-t-md bg-amber-500/70" style={{ height: '15%' }} />
              <span className="text-[9px] font-bold text-muted-foreground">Insoluti Recup.</span>
            </div>
            <Callout n={2} />
          </div>
          <p className="text-xs text-muted-foreground">Il divario tra la barra "Previsto" e la somma di "Quota Incassata" + "Insoluti Recuperati" rappresenta le rate ancora da riscuotere: non è denaro perso, ma denaro non ancora arrivato.</p>
        </div>
      </section>
    </div>
  )
}

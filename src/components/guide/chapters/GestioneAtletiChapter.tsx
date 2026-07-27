import { Users, UserPlus, AlertTriangle } from 'lucide-react'
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

export default function GestioneAtletiChapter() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 2</span>
        <h2 className="text-2xl font-black mt-1">Gestione Atleti e Anagrafica</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          In questa sezione imparerai come gestire gli atleti della tua società: come aggiungerli, modificarli, inserire i dati obbligatori e gestire il numero di matricola FIGC.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">1. Raggiungere la pagina Atleti</h3>
        <p className="text-sm text-muted-foreground">Dal menu principale, clicca sulla voce "Atleti". Ti troverai di fronte alla tabella con tutti i giocatori della società. Per aggiungere un nuovo atleta, usa il pulsante in alto a destra.</p>
        
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-muted-foreground" /> Atleti</h4>
            <div className="relative">
              <button className="bg-brand-accent text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Nuovo Atleta
              </button>
              <Callout n={1} />
            </div>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/40 p-2 text-xs font-bold text-muted-foreground grid grid-cols-3 gap-2">
              <div>Nome e Cognome</div>
              <div className="relative">Matricola FIGC <Callout n={2} className="-top-1 -right-1 w-4 h-4 text-[8px]" /></div>
              <div>Squadra</div>
            </div>
            <div className="p-2 text-sm grid grid-cols-3 gap-2 border-t border-border bg-background">
              <div className="font-semibold">Mario Rossi</div>
              <div className="text-muted-foreground">1234567</div>
              <div>Allievi</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">2. Inserimento Anagrafica</h3>
        <p className="text-sm text-muted-foreground">Quando crei o modifichi un atleta, il primo tab è "Anagrafica". Qui devi inserire i dati fondamentali. Assicurati di compilare correttamente il Codice Fiscale, che viene validato automaticamente dal sistema.</p>
        
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="flex gap-4 border-b border-border mb-4 pb-2">
            <span className="font-bold text-sm text-brand-accent border-b-2 border-brand-accent pb-2">Anagrafica</span>
            <span className="text-sm text-muted-foreground pb-2">Sport & Note</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome *</label>
              <div className="border border-border rounded-lg p-2 text-sm bg-muted/20">Mario</div>
              <Callout n={3} className="-top-1 -right-1 w-4 h-4 text-[8px]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Cognome *</label>
              <div className="border border-border rounded-lg p-2 text-sm bg-muted/20">Rossi</div>
            </div>
            <div className="col-span-2 relative">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Codice Fiscale *</label>
              <div className="border border-border rounded-lg p-2 text-sm font-mono bg-muted/20">RSSMRA00A01H501Z</div>
              <Callout n={4} className="-top-1 -right-1 w-4 h-4 text-[8px]" />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">3. Sport, Note e Matricola FIGC</h3>
        <p className="text-sm text-muted-foreground">Nel tab "Sport & Note" trovi il campo per la Matricola FIGC. Questo numero è essenziale per il tesseramento ufficiale dell'atleta. Se non lo possiedi subito, potrai aggiungerlo in seguito.</p>
        
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="flex gap-4 border-b border-border mb-4 pb-2">
            <span className="text-sm text-muted-foreground pb-2">Anagrafica</span>
            <span className="font-bold text-sm text-brand-accent border-b-2 border-brand-accent pb-2">Sport & Note</span>
          </div>
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Matricola FIGC</label>
            <div className="border border-border rounded-lg p-2 text-sm bg-muted/20">1234567</div>
            <Callout n={5} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">4. Validazione dei Dati</h3>
        <p className="text-sm text-muted-foreground">Il gestionale verifica automaticamente che i dati inseriti siano corretti e completi. Se ci sono errori, non potrai salvare l'atleta. Ecco alcuni messaggi comuni:</p>
        
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-3 text-sm flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1">Codice fiscale non valido</strong>
              <p className="text-xs text-red-600/80">Verifica che il codice fiscale sia lungo 16 caratteri e corrisponda ai dati anagrafici inseriti (nome, cognome, data e luogo di nascita).</p>
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-3 text-sm flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1">Contatti di un genitore obbligatori per i minorenni</strong>
              <p className="text-xs text-red-600/80">Se l'atleta è minorenne, devi compilare almeno un contatto (email o telefono) di uno dei genitori nel modulo.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">5. Avvisi e Notifiche</h3>
        <p className="text-sm text-muted-foreground">Se un atleta non ha la Matricola FIGC, il sistema mostrerà un avviso giallo nella sua pagina. Cliccando su "Risolvi ora", il sistema ti porterà direttamente al campo da compilare.</p>
        
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="relative">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-500">Matricola FIGC Mancante</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Questo atleta non ha una matricola associata.</p>
                </div>
              </div>
              <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-colors shadow-sm">
                Risolvi ora
              </button>
            </div>
            <Callout n={6} />
          </div>
        </div>
      </section>

    </div>
  )
}

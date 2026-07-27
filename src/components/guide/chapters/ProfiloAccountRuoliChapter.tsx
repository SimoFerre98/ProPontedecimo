import { Lock, KeyRound, ChevronDown, ShieldCheck } from 'lucide-react'
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

export default function ProfiloAccountRuoliChapter() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 6</span>
        <h2 className="text-2xl font-black mt-1">Profilo, Account e Ruoli</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          Qui trovi come gestire i tuoi dati personali e la password. Se sei Presidente, trovi anche come assistere un collega che ha smarrito la password e come assegnare un ruolo.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">1. Cambiare i tuoi dati e la password</h3>
        <p className="text-sm text-muted-foreground">Apri il menu utente e scegli "Profilo". Nella sezione "Cambia password", inserisci la nuova password e confermala con "Salva modifiche".</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-3">
          <div className="relative flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/20">
            <span className="text-sm font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Cambia password</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
            <Callout n={1} />
          </div>
          <div className="pl-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1">Nuova password</label>
            <div className="border border-border rounded-lg p-2 text-sm bg-muted/20 font-mono">••••••••••</div>
          </div>
          <div className="relative flex justify-end">
            <span className="bg-brand-accent text-white px-4 py-2 rounded-xl text-xs font-bold">Salva modifiche</span>
            <Callout n={2} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">2. Assistere un utente (solo Presidente)</h3>
        <p className="text-sm text-muted-foreground">Dalle Impostazioni, nel pannello "Gestione Utenti", il Presidente può inviare a un collega un'email per reimpostare la password e può cambiare il ruolo assegnato.</p>

        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background flex flex-col gap-2">
          <div className="relative flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/20">
            <div>
              <p className="text-sm font-semibold">Giulia Bianchi</p>
              <p className="text-[10px] text-muted-foreground">giulia.bianchi@email.it</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-[10px] font-bold text-muted-foreground">
                Allenatore <ChevronDown className="w-3 h-3" />
              </span>
              <span className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
                <KeyRound className="w-4 h-4" />
              </span>
            </div>
            <Callout n={3} />
          </div>
          <p className="text-[11px] text-muted-foreground pl-1">L'icona a forma di chiave invia l'email di reset password; il menu a tendina cambia il ruolo dell'utente.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">3. Perché il cambio ruolo è riservato al Presidente</h3>
        <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg p-5 bg-background">
          <div className="flex gap-3 items-start p-3 rounded-xl bg-muted/30">
            <ShieldCheck className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Assegnare i ruoli è un'azione delicata: un allenatore o un genitore non possono modificare il proprio ruolo o quello di altri, nemmeno per errore. Solo il Presidente può farlo, ed è protetto anche a livello di sistema: nessuna scorciatoia tecnica permette di aggirare questa regola.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

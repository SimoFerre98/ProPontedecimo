import { Bell, Calendar, Menu as MenuIcon, User, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export type GuideChapterVariant = 'staff' | 'portal'

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

interface InterfacePreviewProps {
  variant: GuideChapterVariant
}

// Ricrea la struttura reale dell'header dell'app (non uno screenshot statico):
// staff = DashboardLayout.tsx (stagione, calendario, notifiche, menu utente, pulsante Menu flottante)
// portal = PortalLayout.tsx (solo logo e menu utente: niente stagione/calendario/notifiche/menu flottante)
function InterfacePreview({ variant }: Readonly<InterfacePreviewProps>) {
  const isStaff = variant === 'staff'

  return (
    <div className="rounded-[2rem] border border-border overflow-hidden shadow-lg">
      <div className="bg-muted/40 px-3 py-1.5 flex items-center gap-1.5 border-b border-border">
        <span className="w-2 h-2 rounded-full bg-rose-400" />
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[10px] text-muted-foreground ml-2 font-semibold">Anteprima dell'intestazione del sito</span>
      </div>

      <div className="p-5 bg-background">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-black text-[10px]">
              PP
            </div>
            <span className="text-xs font-bold hidden sm:inline">Pontedecimo Manager</span>
          </div>

          <div className="flex items-center gap-2">
            {isStaff && (
              <>
                <div className="relative">
                  <span className="pill bg-muted/60 border border-border text-[10px] font-semibold px-3 py-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3 h-3" /> Stagione <b className="text-brand-accent">2025/26</b>
                  </span>
                  <Callout n={1} />
                </div>

                <div className="relative">
                  <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <Callout n={2} />
                </div>

                <div className="relative">
                  <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground">
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  <Callout n={3} />
                </div>
              </>
            )}

            <div className="relative">
              <span className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                <User className="w-3.5 h-3.5" />
              </span>
              <Callout n={isStaff ? 4 : 1} />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-brand-accent/30 bg-brand-accent/5 px-4 py-2.5 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" />
          <span className="text-[11px] font-semibold text-muted-foreground">
            Aprendo il menu utente ({isStaff ? 4 : 1}) trovi anche la voce <b className="text-foreground">"Guida"</b>: è la pagina che stai leggendo ora.
          </span>
        </div>

        {isStaff && (
          <div className="mt-5 flex justify-center">
            <div className="relative">
              <span className="pill bg-brand-accent text-white text-[10px] font-bold px-5 py-2 flex items-center gap-2">
                <MenuIcon className="w-3.5 h-3.5" /> MENU
              </span>
              <Callout n={5} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const STAFF_STEPS = [
  { n: 1, title: 'Selettore stagione', text: 'Mostra su quale stagione sportiva stai lavorando in questo momento.' },
  { n: 2, title: 'Calendario', text: 'Apre la vista calendario con gli eventi della società.' },
  { n: 3, title: 'Campanella delle notifiche', text: 'Avvisi importanti: visite mediche in scadenza, quote da saldare, task da fare.' },
  { n: 4, title: 'Menu utente', text: 'Il tuo nome e la tua icona: da qui apri il profilo, le impostazioni e questa Guida.' },
  { n: 5, title: 'Pulsante Menu', text: 'In basso al centro dello schermo: apre l\'elenco di tutte le sezioni del gestionale.' },
]

const PORTAL_STEPS = [
  { n: 1, title: 'Menu utente', text: 'Il tuo nome e la tua icona, in alto a destra: da qui apri il profilo, le impostazioni e questa Guida.' },
]

interface PrimiPassiChapterProps {
  variant?: GuideChapterVariant
}

export default function PrimiPassiChapter({ variant = 'staff' }: Readonly<PrimiPassiChapterProps>) {
  const steps = variant === 'staff' ? STAFF_STEPS : PORTAL_STEPS

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-accent">Capitolo 1</span>
        <h2 className="text-2xl font-black mt-1">Primi passi nel gestionale</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          Benvenuto! Questa pagina ti mostra dove trovare le cose più importanti: il menu in alto e il tuo profilo.
          Non serve nessuna conoscenza tecnica: bastano due minuti di lettura.
        </p>
      </div>

      <InterfacePreview variant={variant} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map(step => (
          <div key={step.n} className="p-4 rounded-2xl bg-muted/30 border border-border">
            <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent font-black text-xs flex items-center justify-center mb-2">
              {step.n}
            </div>
            <h3 className="text-sm font-bold">{step.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

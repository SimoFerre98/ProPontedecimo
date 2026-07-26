import type { ComponentType } from 'react'
import { Rocket, Users, CalendarRange, CreditCard, CalendarCheck, UserCog, BarChart3, Shield } from 'lucide-react'
import PrimiPassiChapter, { type GuideChapterVariant } from '@/components/guide/chapters/PrimiPassiChapter'

export interface GuideChapterComponentProps {
  variant?: GuideChapterVariant
}

export interface GuideChapter {
  id: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  status: 'available' | 'coming-soon'
  Component?: ComponentType<GuideChapterComponentProps>
}

// Registro dei capitoli dell'epica EP-015 (Documentazione e Supporto Utente).
// Solo "Primi passi" (US-049) è disponibile: gli altri sono già elencati come
// "coming-soon" così l'indice mostra da subito la mappa completa della guida
// (US-050 -> US-056 in docs/BACKLOG.md).
export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'primi-passi',
    title: 'Primi passi',
    description: 'Struttura del sito e menu principali',
    icon: Rocket,
    status: 'available',
    Component: PrimiPassiChapter,
  },
  {
    id: 'gestione-atleti',
    title: 'Gestione Atleti',
    description: 'Anagrafica, matricole e certificati',
    icon: Users,
    status: 'coming-soon',
  },
  {
    id: 'stagioni-sportive',
    title: 'Stagioni Sportive',
    description: 'Selettore globale e cambio stagione',
    icon: CalendarRange,
    status: 'coming-soon',
  },
  {
    id: 'pagamenti-quote',
    title: 'Pagamenti e Quote',
    description: 'Rateizzazione e stato saldi',
    icon: CreditCard,
    status: 'coming-soon',
  },
  {
    id: 'presenze-calendario',
    title: 'Presenze e Calendario Eventi',
    description: 'Convocazioni, presenze e calendario',
    icon: CalendarCheck,
    status: 'coming-soon',
  },
  {
    id: 'profilo-account-ruoli',
    title: 'Profilo, Account e Ruoli',
    description: 'Impostazioni personali e ruoli',
    icon: UserCog,
    status: 'coming-soon',
  },
  {
    id: 'reportistica-esportazioni',
    title: 'Reportistica ed Esportazioni',
    description: 'Report ed esportazione dei dati',
    icon: BarChart3,
    status: 'coming-soon',
  },
  {
    id: 'portali-genitore-giocatore-allenatore',
    title: 'Portali Genitore, Giocatore e Allenatore',
    description: 'Le viste dedicate agli altri ruoli',
    icon: Shield,
    status: 'coming-soon',
  },
]

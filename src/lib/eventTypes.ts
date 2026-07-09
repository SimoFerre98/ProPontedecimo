import { Dumbbell, Home, MapPin, Users, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FootballEventType } from '@/services/eventService'

export type EventTypeConfig = {
  label: string
  icon: LucideIcon
  color: string
}

export const EVENT_TYPES_CONFIG: Record<FootballEventType, EventTypeConfig> = {
  training: {
    label: 'Allenamento',
    icon: Dumbbell,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  },
  home_match: {
    label: 'Partita in Casa',
    icon: Home,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  away_match: {
    label: 'Trasferta',
    icon: MapPin,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  },
  meeting: {
    label: 'Riunione',
    icon: Users,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
  generic: {
    label: 'Evento Generico',
    icon: Calendar,
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }
}

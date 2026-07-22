import { ClipboardCheck, ShieldCheck, Activity } from 'lucide-react'
import { type Player } from '@/services/athleteService'
import { StatsGrid } from '@/components/ui/StatsGrid'

interface AthleteStatsCardsProps {
  players: Player[]
  availableSectors: string[]
  onNavigate: (link: string) => void
}

export default function AthleteStatsCards({ players, availableSectors, onNavigate }: Readonly<AthleteStatsCardsProps>) {
  return (
    <StatsGrid
      className="gap-4"
      cardClassName="border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
      iconShape="circle"
      items={[
        {
          label: 'Tesserati FIGC',
          value: players?.filter(p => p.is_registered).length || 0,
          icon: ClipboardCheck,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          hint: 'Atleti con tessera federale'
        },
        {
          label: 'Settori',
          value: availableSectors.length,
          icon: ShieldCheck,
          color: 'text-primary',
          bg: 'bg-primary/10',
          hint: 'Leve/squadre attive'
        },
        {
          label: 'Visite Scadute',
          value: players?.filter(p => p.medical_expiry && new Date(p.medical_expiry) < new Date()).length || 0,
          icon: Activity,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          onClick: () => onNavigate('/visite'),
          hint: 'Certificati medici da rinnovare'
        },
      ]}
    />
  )
}

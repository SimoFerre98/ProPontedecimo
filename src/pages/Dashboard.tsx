import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users,
  CreditCard,
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: 'bordeaux' | 'amber' | 'green' | 'blue'
  loading?: boolean
}

const colorMap = {
  bordeaux: {
    bg: 'bg-[#800020]/8',
    icon: 'text-[#800020]',
    border: 'border-[#800020]/10',
    badge: 'bg-[#800020] text-white',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-100',
    badge: 'bg-amber-500 text-white',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100',
    badge: 'bg-emerald-500 text-white',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-100',
    badge: 'bg-blue-500 text-white',
  },
}

function StatCard({ title, value, subtitle, icon, color, loading }: Readonly<StatCardProps>) {
  const c = colorMap[color]
  return (
    <div className={`relative bg-white rounded-xl border ${c.border} p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${c.bg} shrink-0 ml-4`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Query keys
const QK = {
  stats: ['dashboard', 'stats'],
  expiringMedical: ['dashboard', 'expiring-medical'],
  unpaidPayments: ['dashboard', 'unpaid-payments'],
}

export default function Dashboard() {
  const { profile } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0]

  // Totale atleti attivi
  const { data: totalPlayers, isLoading: l1 } = useQuery({
    queryKey: [...QK.stats, 'players'],
    queryFn: async () => {
      const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('is_active', true)
      return count ?? 0
    },
  })

  // Scadenze mediche nei prossimi 30 giorni
  const { data: expiringMedical, isLoading: l2 } = useQuery({
    queryKey: QK.expiringMedical,
    queryFn: async () => {
      const { count } = await supabase.from('players')
        .select('*', { count: 'exact', head: true })
        .gte('medical_expiry', today)
        .lte('medical_expiry', in30Days)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  // Scadenze mediche entro 7 giorni (urgenti)
  const { data: urgentMedical, isLoading: l3 } = useQuery({
    queryKey: [...QK.expiringMedical, 'urgent'],
    queryFn: async () => {
      const { count } = await supabase.from('players')
        .select('*', { count: 'exact', head: true })
        .gte('medical_expiry', today)
        .lte('medical_expiry', in7Days)
        .eq('is_active', true)
      return count ?? 0
    },
  })

  // Pagamenti pending
  const { data: pendingPayments, isLoading: l4 } = useQuery({
    queryKey: QK.unpaidPayments,
    queryFn: async () => {
      const { count } = await supabase.from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      return count ?? 0
    },
  })

  // Atleti per settore
  const { data: sectors } = useQuery({
    queryKey: [...QK.stats, 'sectors'],
    queryFn: async () => {
      const { data } = await supabase.from('players')
        .select('team_sector')
        .eq('is_active', true)
      if (!data) return []
      const map: Record<string, number> = {}
      data.forEach(r => {
        const s = r.team_sector ?? 'Non assegnato'
        map[s] = (map[s] ?? 0) + 1
      })
      return Object.entries(map)
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
    },
  })

  return (
    <div className="space-y-8">
      {/* Saluto */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bentornato{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ecco il riepilogo della stagione 2024/2025.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Atleti Iscritti"
          value={totalPlayers ?? 0}
          subtitle="Stagione corrente"
          icon={<Users className="w-6 h-6" />}
          color="bordeaux"
          loading={l1}
        />
        <StatCard
          title="Scadenze Mediche"
          value={expiringMedical ?? 0}
          subtitle="Nei prossimi 30 giorni"
          icon={<Stethoscope className="w-6 h-6" />}
          color={urgentMedical && urgentMedical > 0 ? 'amber' : 'green'}
          loading={l2}
        />
        <StatCard
          title="Pagamenti Pending"
          value={pendingPayments ?? 0}
          subtitle="Rate da saldare"
          icon={<CreditCard className="w-6 h-6" />}
          color={pendingPayments && pendingPayments > 10 ? 'amber' : 'bordeaux'}
          loading={l4}
        />
        <StatCard
          title="Urgenti (7gg)"
          value={urgentMedical ?? 0}
          subtitle="Visite in scadenza critica"
          icon={<AlertTriangle className="w-6 h-6" />}
          color={urgentMedical && urgentMedical > 0 ? 'amber' : 'green'}
          loading={l3}
        />
      </div>

      {/* Sezione inferiore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Atleti per settore */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#800020]" />
            <h2 className="text-sm font-semibold text-foreground">Atleti per Settore</h2>
          </div>
          {!sectors || sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nessun dato disponibile</p>
          ) : (
            <div className="space-y-3">
              {sectors.map(({ sector, count }) => {
                const total = sectors.reduce((s, r) => s + r.count, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={sector}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground truncate">{sector}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#800020] rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-[#800020]" />
            <h2 className="text-sm font-semibold text-foreground">Azioni Rapide</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Aggiungi Atleta',    href: '/atleti?new=1',    icon: '👤' },
              { label: 'Registra Pagamento', href: '/pagamenti?new=1', icon: '💳' },
              { label: 'Segna Presenza',     href: '/presenze',        icon: '✅' },
              { label: 'Visita Medica',      href: '/visite?new=1',   icon: '🏥' },
            ].map(({ label, href, icon }) => (
              <a
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-border hover:border-[#800020]/30 hover:bg-[#800020]/4 transition-all group text-center"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-foreground group-hover:text-[#800020] transition-colors">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  Users,
  CreditCard,
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
  Archive,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: 'primary' | 'amber' | 'green'
  loading?: boolean
}

function StatCard({ title, value, subtitle, icon, color, loading }: Readonly<StatCardProps>) {
  const glowColors = {
    primary: "bg-primary",
    amber: "bg-amber-500",
    green: "bg-emerald-500"
  }

  const iconStyles = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-600",
    green: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glass-card p-6 rounded-[2rem] relative overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:border-primary/20"
    >
      {/* Glow Effect */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity",
        glowColors[color]
      )} />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">{title}</p>
          {loading ? (
            <div className="h-9 w-20 bg-muted/20 animate-pulse pill" />
          ) : (
            <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">{value}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2 font-medium bg-background/50 pill inline-block px-2 py-0.5 border border-black/5 dark:border-white/10">{subtitle}</p>
        </div>
        <div className={cn(
          "w-12 h-12 pill flex items-center justify-center shrink-0 ml-4 border",
          iconStyles[color]
        )}>
          {icon}
        </div>
      </div>
    </motion.div>
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
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Saluto */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Bentornato{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Ecco il riepilogo della stagione <span className="text-foreground">2024/2025</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="glass-card pill px-4 py-2 flex items-center gap-2 text-xs font-bold border-black/10 dark:border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sistema Operativo
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Atleti Iscritti"
          value={totalPlayers ?? 0}
          subtitle="Totale attivi"
          icon={<Users className="w-5 h-5" />}
          color="primary"
          loading={l1}
        />
        <StatCard
          title="Scadenze Mediche"
          value={expiringMedical ?? 0}
          subtitle="Prossimi 30 giorni"
          icon={<Stethoscope className="w-5 h-5" />}
          color={urgentMedical && urgentMedical > 0 ? 'amber' : 'green'}
          loading={l2}
        />
        <StatCard
          title="Rate in Sospeso"
          value={pendingPayments ?? 0}
          subtitle="Pagamenti pending"
          icon={<CreditCard className="w-5 h-5" />}
          color={pendingPayments && pendingPayments > 5 ? 'amber' : 'primary'}
          loading={l4}
        />
        <StatCard
          title="Visite Urgenti"
          value={urgentMedical ?? 0}
          subtitle="Entro 7 giorni"
          icon={<AlertTriangle className="w-5 h-5" />}
          color={urgentMedical && urgentMedical > 0 ? 'amber' : 'green'}
          loading={l3}
        />
      </div>

      {/* Sezione inferiore */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Atleti per settore */}
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 pill bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Distribuzione Settori</h2>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 pill px-3 py-1">Tempo Reale</div>
          </div>
          
          {!sectors || sectors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {sectors.map(({ sector, count }) => {
                const total = sectors.reduce((s, r) => s + r.count, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={sector} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors">{sector}</span>
                      <span className="text-xs font-black tabular-nums">{count} <span className="text-muted-foreground font-medium text-[10px]">atleti</span></span>
                    </div>
                    <div className="h-3 bg-muted/20 pill overflow-hidden border border-black/5 dark:border-white/10 shadow-inner p-[2px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className="h-full bg-primary pill shadow-[0_0_10px_oklch(0.33_0.13_15/_0.3)]"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="glass-card rounded-[2.5rem] p-8 border-primary/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 pill bg-amber-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold">Azioni Rapide</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Nuovo Atleta',    href: '/atleti?new=1',    icon: <Users className="w-5 h-5" />, color: 'primary' },
              { label: 'Pagamenti',       href: '/pagamenti',       icon: <CreditCard className="w-5 h-5" />, color: 'amber' },
              { label: 'Presenze',        href: '/presenze',        icon: <CalendarClock className="w-5 h-5" />, color: 'green' },
              { label: 'Visite Mediche',  href: '/visite',         icon: <Stethoscope className="w-5 h-5" />, color: 'primary' },
              { label: 'Magazzino',       href: '/magazzino',       icon: <Archive className="w-5 h-5" />, color: 'primary' },
            ].map(({ label, href, icon, color }) => {
              const actionColors: Record<string, string> = {
                primary: "bg-primary text-white",
                amber: "bg-amber-500 text-white",
                green: "bg-emerald-500 text-white"
              }

              return (
                <Link
                  key={href}
                  to={href}
                  className="flex items-center gap-4 p-4 pill border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all group"
                >
                  <motion.div 
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-4 w-full"
                  >
                    <div className={cn(
                      "w-10 h-10 pill flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                      actionColors[color]
                    )}>
                      {icon}
                    </div>
                    <span className="text-sm font-bold text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground/30 group-hover:text-foreground/50 transition-all" />
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

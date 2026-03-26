import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Stethoscope,
  CalendarCheck,
  Package,
  ClipboardList,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',      exact: true },
  { to: '/atleti',    icon: Users,           label: 'Atleti' },
  { to: '/pagamenti', icon: CreditCard,      label: 'Pagamenti' },
  { to: '/visite',    icon: Stethoscope,     label: 'Visite Mediche' },
  { to: '/presenze',  icon: CalendarCheck,   label: 'Presenze' },
  { to: '/magazzino', icon: Package,         label: 'Magazzino' },
  { to: '/task',      icon: ClipboardList,   label: 'Task Staff' },
]

const ROLE_LABELS: Record<string, string> = {
  president: 'Presidente',
  director:  'Direttore',
  coach:     'Allenatore',
  player:    'Atleta',
}

export default function DashboardLayout() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-64 shrink-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r border-[var(--sidebar-border)]">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Pro Pontedecimo</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[var(--sidebar-accent)] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/50 group-hover:text-white')} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
            {/* Avatar */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-bordeaux text-white text-xs font-bold shrink-0"
              style={{ background: 'var(--bordeaux-light, #a8003a)' }}
            >
              {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name ?? profile?.email ?? 'Utente'}
              </p>
              <p className="text-[10px] text-white/40">
                {role ? ROLE_LABELS[role] : '—'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Logout"
              className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">
              {/* Filled by each page via document.title or a context — placeholder */}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Stagione</span>
            <span className="font-semibold text-foreground">2024/2025</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

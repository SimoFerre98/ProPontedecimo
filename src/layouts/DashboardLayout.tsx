import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
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
  Menu,
  X,
  User,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Background Decors ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-white/10 glass-morphism px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 pill bg-primary shadow-lg glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-bold tracking-tight">Pro Pontedecimo</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-[11px] font-medium">
            <span className="text-muted-foreground">Stagione</span>
            <span className="text-primary">2024/2025</span>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right hidden xs:block">
              <p className="text-xs font-semibold truncate max-w-[120px]">
                {profile?.full_name ?? 'Utente'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {role ? ROLE_LABELS[role] : '—'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full pill bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="p-6 pb-24 max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* ── Floating Nav Button ── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMenu}
          className={cn(
            "flex items-center gap-2 px-6 py-3 pill shadow-2xl transition-colors duration-300",
            isMenuOpen 
              ? "bg-foreground text-background" 
              : "bg-primary text-white shadow-[0_0_20px_oklch(0.33_0.13_15/_0.4)]"
          )}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-sm font-bold uppercase tracking-wider">
            {isMenuOpen ? 'Chiudi' : 'Menu'}
          </span>
        </motion.button>
      </div>

      {/* ── Menu Overlay ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="fixed inset-0 bg-background/40 backdrop-blur-md z-40 px-6"
            />
            
            {/* Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-card p-6 z-50 rounded-[2.5rem] shadow-2xl border-white/20"
            >
              <div className="grid grid-cols-1 gap-2">
                {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-4 px-4 py-3.5 pill text-sm font-semibold transition-all duration-300',
                        isActive
                          ? 'bg-primary text-white glow-primary'
                          : 'text-foreground/70 hover:bg-primary/5 hover:text-primary'
                      )
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                  </NavLink>
                ))}
                
                <div className="my-4 border-t border-white/10" />
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-4 px-4 py-3.5 pill text-sm font-semibold text-destructive hover:bg-destructive/5 transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout Account</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

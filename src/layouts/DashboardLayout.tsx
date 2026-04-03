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
  Menu,
  X,
  User,
  Settings,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import ProfileModal from '@/components/modals/ProfileModal'
import SettingsModal from '@/components/modals/SettingsModal'

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
  parent:    'Genitore',
}

const getVisibleNavItems = (userRole: string | null) => {
  if (!userRole || userRole === 'player' || userRole === 'parent') return []
  if (userRole === 'coach') {
    return NAV_ITEMS.filter(item => ['/', '/atleti', '/presenze', '/task'].includes(item.to))
  }
  return NAV_ITEMS
}

export default function DashboardLayout() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen)

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Background Decors ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/3 blur-[80px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-white/10 glass-morphism px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/Logo ASD Pro Pontedecimo.png"
            alt="Pro Pontedecimo"
            className="w-10 h-10 object-contain drop-shadow-sm flex-shrink-0"
          />
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
          
          <div className="relative">
            <button 
              onClick={toggleProfileMenu}
              className="flex items-center gap-3 pl-4 border-l border-border hover:opacity-80 transition-opacity text-left outline-none"
            >
            <div className="text-right hidden xs:block">
              <p className="text-xs font-semibold truncate max-w-[120px]">
                {profile?.full_name ?? 'Utente'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {role ? ROLE_LABELS[role] : '—'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full pill bg-primary/10 border border-primary/20 flex items-center justify-center pointer-events-none">
              <User className="w-4 h-4 text-primary" />
            </div>
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsProfileMenuOpen(false)
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-4 w-72 bg-background/95 backdrop-blur-3xl p-2 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/20 z-50 flex flex-col gap-1 cursor-default text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-black/5 dark:border-white/10 mb-2">
                      <p className="text-base font-black truncate text-foreground">
                        {profile?.full_name ?? 'Utente'}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {role ? ROLE_LABELS[role] : 'Nessun ruolo'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false)
                        setIsProfileModalOpen(true)
                      }}
                      className="flex items-center gap-3 px-4 py-3 pill text-sm font-semibold hover:bg-primary/10 hover:text-primary transition-all text-left"
                    >
                      <User className="w-4 h-4" />
                      Il mio Profilo
                    </button>

                    {(role === 'director' || role === 'president') && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          setIsSettingsModalOpen(true)
                        }}
                        className="flex items-center gap-3 px-4 py-3 pill text-sm font-semibold hover:bg-primary/10 hover:text-primary transition-all text-left"
                      >
                        <Settings className="w-4 h-4" />
                        Gestione Account
                      </button>
                    )}

                    <div className="flex items-center justify-between px-4 py-3 mt-1 border-t border-black/5 dark:border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tema</span>
                      <div className="flex bg-black/5 dark:bg-white/10 pill p-1 gap-1">
                        <button
                          onClick={() => setTheme('light')}
                          className={cn("p-2 pill transition-colors", theme === 'light' ? "bg-white dark:bg-black shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Sun className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={cn("p-2 pill transition-colors", theme === 'dark' ? "bg-white dark:bg-black shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Moon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTheme('system')}
                          className={cn("p-2 pill transition-colors", theme === 'system' ? "bg-white dark:bg-black shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-black/5 dark:border-white/10 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 pill text-sm font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all text-left w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
              className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40 px-6"
            />
            
            {/* Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-card p-6 z-50 rounded-[2.5rem] shadow-2xl border-white/20"
            >
              <div className="grid grid-cols-1 gap-2">
                {getVisibleNavItems(role).length > 0 ? (
                  getVisibleNavItems(role).map(({ to, icon: Icon, label, exact }) => (
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
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                    Nessun menu disponibile per il tuo ruolo.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </div>
  )
}

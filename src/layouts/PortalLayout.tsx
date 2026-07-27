import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut,
  Shield,
  User,
  Settings,
  BookOpen,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import ProfileModal from '@/components/modals/ProfileModal'
import SettingsModal from '@/components/modals/SettingsModal'

const ROLE_LABELS: Record<string, string> = {
  president: 'Presidente',
  director:  'Direttore',
  coach:     'Allenatore',
  player:    'Atleta',
  parent:    'Genitore',
}

export default function PortalLayout() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen)

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Background Decors ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-brand-accent/5 blur-[80px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-brand-accent/3 blur-[80px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/40 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-xl tracking-tight hidden sm:block">Pontedecimo</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={toggleProfileMenu}
              className="flex items-center gap-3 p-1.5 pr-4 pill transition-all bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-sm shadow-inner">
                {profile?.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-sm font-bold leading-none">{profile?.full_name || 'Utente'}</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent mt-1">
                  {role ? ROLE_LABELS[role] : 'Nessun ruolo'}
                </span>
              </div>
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={toggleProfileMenu}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-14 right-0 w-64 bg-background/98 backdrop-blur-md p-2 z-50 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/20 flex flex-col gap-1"
                  >
                    <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 sm:hidden">
                      <p className="text-sm font-bold text-foreground">{profile?.full_name || 'Utente'}</p>
                      <p className="text-xs text-brand-accent font-bold uppercase tracking-widest mt-1">
                        {role ? ROLE_LABELS[role] : 'Nessun ruolo'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false)
                        setIsProfileModalOpen(true)
                      }}
                      className="flex items-center gap-3 px-4 py-3 pill text-sm font-semibold hover:bg-brand-accent/10 hover:text-brand-accent transition-all text-left"
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
                        className="flex items-center gap-3 px-4 py-3 pill text-sm font-semibold hover:bg-brand-accent/10 hover:text-brand-accent transition-all text-left"
                      >
                        <Settings className="w-4 h-4" />
                        Gestione Account
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false)
                        navigate('/portal/guida')
                      }}
                      className="flex items-center gap-3 px-4 py-3 pill text-sm font-semibold hover:bg-brand-accent/10 hover:text-brand-accent transition-all text-left"
                    >
                      <BookOpen className="w-4 h-4" />
                      Guida
                    </button>

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

      {/* ── Modals ── */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      
      {/* Settings Modal (only for admin) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  )
}

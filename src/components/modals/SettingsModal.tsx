import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserCog, Mail, ShieldAlert, Loader2, Trash2, X, Users, AlertTriangle, KeyRound, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type UserRole = Database['public']['Enums']['user_role']

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  president: 'Presidente',
  director: 'Dirigente',
  coach: 'Allenatore',
  player: 'Giocatore',
  parent: 'Genitore',
}

const ROLE_COLORS: Record<UserRole, string> = {
  president: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  director: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  coach: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  player: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  parent: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface DeleteConfirmState {
  profile: Profile
  inputValue: string
}

export default function SettingsModal({ isOpen, onClose }: Readonly<SettingsModalProps>) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [sendingResetId, setSendingResetId] = useState<string | null>(null)
  const [resetSuccessId, setResetSuccessId] = useState<string | null>(null)

  // Fetch via TanStack Query (idioma del progetto): niente setState negli effect.
  const { data: profilesData, isLoading: loading, isError: loadError } = useQuery({
    queryKey: ['settings-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
    enabled: isOpen,
  })
  const profiles = profilesData ?? []

  // Reset dei campi all'apertura: pattern "adjust state on prop change" durante il
  // render (React docs) — un setState sincrono dentro l'effect causerebbe render a cascata.
  const [prevOpen, setPrevOpen] = useState(false)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setSearchTerm('')
      setRoleFilter('all')
      setErrorMsg(null)
    }
  }

  // All'apertura invalida la cache così la lista utenti è sempre fresca
  useEffect(() => {
    if (isOpen) {
      void queryClient.invalidateQueries({ queryKey: ['settings-profiles'] })
    }
  }, [isOpen, queryClient])

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    setUpdatingId(profileId)
    setErrorMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    if (error) {
      setErrorMsg("Errore durante l'aggiornamento del ruolo.")
    } else {
      queryClient.setQueryData<Profile[]>(['settings-profiles'], prev =>
        (prev ?? []).map(p => p.id === profileId ? { ...p, role: newRole } : p))
    }
    setUpdatingId(null)
  }

  const handleResetPassword = async (profile: Profile) => {
    setSendingResetId(profile.id)
    setResetSuccessId(null)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          email: profile.email,
          redirectTo: `${window.location.origin}/recovery`
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setResetSuccessId(profile.id)
      setTimeout(() => {
        setResetSuccessId(null)
      }, 3000)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : "Errore durante l'invio del reset password."
      setErrorMsg(message)
    } finally {
      setSendingResetId(null)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return
    const { profile } = deleteConfirm
    setDeletingId(profile.id)
    setErrorMsg(null)

    // Delete from auth.users (cascades to profiles via trigger)
    const { error } = await supabase.auth.admin.deleteUser(profile.id)

    if (error) {
      // Fallback: mark as inactive in profiles (if no admin rights)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id)

      if (profileError) {
        setErrorMsg("Errore nell'eliminazione dell'utente. Verifica i permessi.")
        setDeletingId(null)
        setDeleteConfirm(null)
        return
      }
    }

    queryClient.setQueryData<Profile[]>(['settings-profiles'], prev =>
      (prev ?? []).filter(p => p.id !== profile.id))
    setDeleteConfirm(null)
    setDeletingId(null)
  }

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch =
      (p.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || p.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Count per role for badges
  const roleCounts = profiles.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const expectedName = deleteConfirm ? (deleteConfirm.profile.full_name || deleteConfirm.profile.email) : ''
  const deleteConfirmValid = deleteConfirm?.inputValue.trim().toLowerCase() === expectedName.trim().toLowerCase()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-[95vw] max-w-5xl glass-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[96vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase leading-none">
                    Gestione <span className="text-primary not-italic">Account</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                    {profiles.length} utenti registrati
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Filters */}
            <div className="px-8 pb-4 space-y-3 shrink-0">
              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-12 pl-14 pr-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-primary focus:outline-none text-sm font-medium placeholder:text-muted-foreground/40 text-foreground transition-all"
                />
              </div>

              {/* Role filter pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                    roleFilter === 'all'
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  Tutti ({profiles.length})
                </button>
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                      roleFilter === role
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {label} {roleCounts[role] ? `(${roleCounts[role]})` : '(0)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {loadError && !errorMsg && (
              <div className="mx-8 mt-4 px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold">
                Errore nel caricamento degli utenti.
              </div>
            )}
            {errorMsg && (
              <div className="mx-8 mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-semibold flex items-center gap-2 shrink-0">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* User List - scrollable */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8">
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <UserCog className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold">Nessun utente trovato.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProfiles.map(profile => (
                    <motion.div
                      key={profile.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 glass-card rounded-2xl border border-black/5 dark:border-white/10 hover:border-primary/20 transition-all group"
                    >
                      {/* Avatar + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 pill bg-primary/15 flex-shrink-0 flex items-center justify-center font-black text-primary text-sm border border-primary/20">
                          {(profile.full_name?.charAt(0) || profile.email.charAt(0)).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate flex items-center gap-2">
                            {profile.full_name || 'Utente Senza Nome'}
                            {profile.id === user?.id && (
                              <span className="text-[9px] font-black uppercase tracking-widest bg-primary text-white px-2 py-0.5 pill">Tu</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 shrink-0" />
                            {profile.email}
                          </p>
                        </div>
                      </div>

                      {/* Role badge + selector */}
                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border hidden sm:block", ROLE_COLORS[profile.role])}>
                          {ROLE_LABELS[profile.role]}
                        </span>

                        {updatingId === profile.id ? (
                          <div className="px-3 py-2"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
                        ) : (
                          <select
                            value={profile.role}
                            onChange={e => handleRoleChange(profile.id, e.target.value as UserRole)}
                            disabled={profile.id === user?.id || updatingId !== null}
                            className="bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 text-foreground text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-primary disabled:opacity-50 cursor-pointer transition-colors hover:border-primary/50 appearance-none"
                          >
                            {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                              <option key={value} value={value} className="bg-background text-foreground">
                                {label}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Reset Password button */}
                        <button
                          onClick={() => void handleResetPassword(profile)}
                          disabled={sendingResetId !== null || updatingId !== null || deletingId !== null}
                          className={cn(
                            "p-2.5 rounded-xl transition-all border border-transparent shrink-0",
                            resetSuccessId === profile.id
                              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/20"
                          )}
                          title="Invia email di reset password"
                        >
                          {sendingResetId === profile.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : resetSuccessId === profile.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <KeyRound className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete button */}
                        {profile.id !== user?.id && (
                          <button
                            onClick={() => setDeleteConfirm({ profile, inputValue: '' })}
                            disabled={deletingId === profile.id || updatingId !== null}
                            className="p-2.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-30 border border-transparent hover:border-red-500/20"
                            title="Elimina utente"
                          >
                            {deletingId === profile.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Delete Confirmation Dialog ── */}
          <AnimatePresence>
            {deleteConfirm && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm"
                  onClick={() => setDeleteConfirm(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 20 }}
                  className="absolute z-[120] w-full max-w-md glass-card rounded-[2rem] p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] border border-red-500/20"
                >
                  {/* Warning icon */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 pill bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-foreground">Elimina Utente</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">Azione irreversibile</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                    Stai per eliminare definitivamente l'account di:
                  </p>
                  <p className="font-black text-foreground text-base mb-1">{deleteConfirm.profile.full_name || 'Utente Senza Nome'}</p>
                  <p className="text-xs text-muted-foreground mb-6">{deleteConfirm.profile.email}</p>

                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-6">
                    <p className="text-xs font-bold text-red-500 mb-3">
                      Per confermare, digita il nome completo dell'utente:
                    </p>
                    <p className="text-sm font-black text-foreground mb-3 bg-black/10 dark:bg-white/10 px-3 py-2 rounded-xl font-mono">
                      {expectedName}
                    </p>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Digita qui per confermare..."
                      value={deleteConfirm.inputValue}
                      onChange={e => setDeleteConfirm(prev => prev ? { ...prev, inputValue: e.target.value } : null)}
                      onKeyDown={e => { if (e.key === 'Enter' && deleteConfirmValid) void handleDeleteConfirmed() }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none transition-all bg-transparent text-foreground",
                        deleteConfirmValid
                          ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                          : "border-black/10 dark:border-white/15 focus:border-red-500/50"
                      )}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 h-12 pill bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => void handleDeleteConfirmed()}
                      disabled={!deleteConfirmValid || deletingId !== null}
                      className="flex-1 h-12 pill bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                    >
                      {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Elimina
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  )
}

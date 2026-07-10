import { useEffect, useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  User,
  Crown,
  Shield,
  Trophy,
  Mail,
  Calendar,
  Lock,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { icsFeedService } from '@/services/icsFeedService'
import { profileService } from '@/services/profileService'
import { supabase } from '@/lib/supabase'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

interface RoleBadge {
  label: string
  className: string
  Icon: ComponentType<{ className?: string }>
}

/* Pallone stilizzato del mockup (nessun equivalente in lucide-react) */
function BallIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7l4.5 3.3-1.7 5.4H9.2L7.5 10.3z" />
    </svg>
  )
}

/* Varianti badge ruolo — colori dal mockup US-005 (shared.css), etichette del codebase */
const ROLE_BADGES: Record<UserRole, RoleBadge> = {
  president: {
    label: 'Presidente',
    className:
      'text-[oklch(0.84_0.115_85)] bg-[oklch(0.84_0.115_85_/_0.1)] border-[oklch(0.84_0.115_85_/_0.3)]',
    Icon: Crown
  },
  director: {
    label: 'Direttore',
    className:
      'text-[oklch(0.62_0.19_12)] bg-[oklch(0.33_0.13_15_/_0.22)] border-[oklch(0.62_0.19_12_/_0.35)]',
    Icon: Shield
  },
  coach: {
    label: 'Allenatore',
    className: 'text-foreground bg-white/10 border-white/20',
    Icon: Trophy
  },
  player: {
    label: 'Atleta',
    className: 'text-rose-500 bg-rose-500/10 border-rose-500/25',
    Icon: BallIcon
  },
  parent: {
    label: 'Genitore',
    className: 'text-muted-foreground bg-white/5 border-white/10',
    Icon: User
  }
}

function getInitials(fullName: string | null, email: string): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase() || '—'
}

export default function ProfileModal({ isOpen, onClose }: Readonly<ProfileModalProps>) {
  const { profile, user, refreshProfile } = useAuth()

  const [icsToken, setIcsToken] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // US-018 Edit Profile States
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [localUser, setLocalUser] = useState(user)
  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const [generalError, setGeneralError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string | null>>({
    fullName: null,
    email: null,
    newPassword: null,
    confirmPassword: null,
  })

  useEffect(() => {
    setLocalUser(user)
  }, [user])

  useEffect(() => {
    if (!isOpen || !user) return

    let isMounted = true
    async function loadToken() {
      setIsLoadingToken(true)
      setErrorMsg(null)
      try {
        const token = await icsFeedService.getIcsToken()
        if (isMounted) {
          setIcsToken(token)
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Impossibile caricare il feed calendar')
          console.error(err)
        }
      } finally {
        if (isMounted) {
          setIsLoadingToken(false)
        }
      }
    }

    loadToken()
    return () => {
      isMounted = false
    }
  }, [isOpen, user])

  const handleCopyLink = async () => {
    if (!icsToken) return
    const url = icsFeedService.buildIcsUrl(icsToken)
    try {
      await navigator.clipboard.writeText(url)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const handleRegenerateToken = async () => {
    setIsLoadingToken(true)
    setErrorMsg(null)
    try {
      const newToken = await icsFeedService.regenerateIcsToken()
      setIcsToken(newToken)
    } catch (err) {
      setErrorMsg('Impossibile rigenerare il link')
      console.error(err)
    } finally {
      setIsLoadingToken(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const startEditing = () => {
    setFullName(profile?.full_name ?? '')
    setEmail(localUser?.new_email ?? profile?.email ?? '')
    setNewPassword('')
    setConfirmPassword('')
    setIsPasswordOpen(false)
    setGeneralError(null)
    setErrors({
      fullName: null,
      email: null,
      newPassword: null,
      confirmPassword: null,
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setGeneralError(null)
    setIsEditing(false)
  }

  const handleResendConfirmation = async () => {
    const pendingEmail = localUser?.new_email
    if (!pendingEmail) return
    setResendStatus('sending')
    try {
      await profileService.updateEmail(pendingEmail)
      setResendStatus('sent')
      setTimeout(() => setResendStatus('idle'), 2000)
    } catch (err) {
      console.error(err)
      setResendStatus('idle')
    }
  }

  const handleCancelPendingEmail = async () => {
    try {
      if (!user?.email) return
      await profileService.cancelPendingEmail(user.email)
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      setLocalUser(updatedUser)
      setEmail(user.email)
    } catch (err) {
      console.error(err)
    }
  }

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, className: '' }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd) && pwd.length >= 6) score++
    
    let className = ''
    if (score <= 1) className = 'on-weak'
    else if (score === 2) className = 'on-mid'
    else className = 'on-strong'
    
    return { score, className }
  }

  const handleSave = async () => {
    const newErrors: Record<string, string | null> = {
      fullName: null,
      email: null,
      newPassword: null,
      confirmPassword: null,
    }
    let hasErrors = false

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      newErrors.fullName = 'Il nome completo è obbligatorio.'
      hasErrors = true
    }

    const trimmedEmail = email.trim()
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail || !emailRe.test(trimmedEmail)) {
      newErrors.email = 'Inserisci un indirizzo email valido.'
      hasErrors = true
    }

    if (isPasswordOpen && (newPassword || confirmPassword)) {
      if (newPassword.length < 6) {
        newErrors.newPassword = 'La password deve contenere almeno 6 caratteri.'
        hasErrors = true
      }
      if (confirmPassword !== newPassword) {
        newErrors.confirmPassword = 'Le password non coincidono.'
        hasErrors = true
      }
    }

    setErrors(newErrors)
    setGeneralError(null)
    if (hasErrors) return

    setIsSaving(true)
    let emailUpdated = false

    try {
      if (trimmedName !== (profile?.full_name ?? '')) {
        await profileService.updateFullName(trimmedName)
      }

      const emailBaseline = localUser?.new_email ?? profile?.email ?? ''
      if (trimmedEmail !== emailBaseline) {
        await profileService.updateEmail(trimmedEmail)
        emailUpdated = true
      }

      if (isPasswordOpen && newPassword) {
        await profileService.updatePassword(newPassword)
      }

      await refreshProfile()
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      setLocalUser(updatedUser)

      setShowToast(true)
      setTimeout(() => setShowToast(false), 2200)

      if (emailUpdated) {
        setNewPassword('')
        setConfirmPassword('')
        setIsPasswordOpen(false)
      } else {
        setIsEditing(false)
      }
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('password') || message.includes('Password')) {
        setErrors(prev => ({ ...prev, newPassword: message }))
      } else if (message.includes('email') || message.includes('Email') || message.includes('account')) {
        setErrors(prev => ({ ...prev, email: message }))
      } else {
        setGeneralError(message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const badge = profile ? ROLE_BADGES[profile.role] : null
  const displayName = profile?.full_name ?? profile?.email ?? '—'
  const identityName = isEditing ? (fullName.trim() || profile?.full_name || profile?.email || '—') : displayName
  const initials = getInitials(
    isEditing ? fullName : (profile?.full_name ?? null), 
    isEditing ? email : (profile?.email ?? '')
  )
  const registeredAt = user?.created_at
    ? format(new Date(user.created_at), 'd MMMM yyyy', { locale: it })
    : '—'

  const infoRows = [
    { label: 'Email', value: profile?.email ?? '—', Icon: Mail },
    { label: 'Ruolo', value: badge?.label ?? '—', Icon: Shield },
    { label: 'Registrato il', value: registeredAt, Icon: Calendar }
  ]

  const pendingEmail = localUser?.new_email ?? null
  const pwdStrength = getPasswordStrength(newPassword)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSaving ? undefined : onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            className="relative w-[95vw] max-w-xl max-h-[90vh] glass-card overflow-hidden flex flex-col border border-white/20 shadow-2xl rounded-[3rem]"
          >
            {/* Header */}
            <div className={cn(
              "px-5 py-6 sm:p-8 border-b border-white/10 flex items-center justify-between gap-4 bg-white/5 shrink-0 modal-header", 
              isEditing && "is-editing"
            )}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0 icon-box">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2
                    id="profile-modal-title"
                    className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-foreground"
                  >
                    Il Mio <span className="text-primary not-italic">Profilo</span>
                  </h2>
                  <p className="text-[0.65rem] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 modal-subtitle">
                    {isEditing ? 'Modifica i tuoi dati' : 'I tuoi dati personali'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                aria-label="Chiudi"
                className="w-10 h-10 pill border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all group shrink-0"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Corpo scrollabile */}
            <div className="overflow-y-auto no-scrollbar px-5 py-6 sm:p-8 flex flex-col gap-[1.4rem] sm:gap-7 profile-body">
              {/* Identità */}
              <section className="flex flex-col items-center text-center gap-[0.9rem] pt-2 identity">
                <div className="w-[5.75rem] h-[5.75rem] sm:w-28 sm:h-28 pill p-1 bg-[conic-gradient(from_210deg,oklch(0.84_0.115_85_/_.8),oklch(0.45_0.16_15),oklch(0.84_0.115_85_/_.15),oklch(0.45_0.16_15),oklch(0.84_0.115_85_/_.8))] shadow-[0_0_35px_oklch(0.33_0.13_15_/_0.45)] avatar-ring">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={identityName}
                      className="w-full h-full pill object-cover border border-white/15 avatar"
                    />
                  ) : (
                    <div className="w-full h-full pill bg-[linear-gradient(150deg,oklch(0.42_0.15_15),oklch(0.24_0.1_15))] border border-white/15 flex items-center justify-center text-[2rem] font-black italic tracking-tighter text-[oklch(0.97_0.02_85)] [text-shadow:0_2px_12px_oklch(0_0_0_/_0.4)] avatar">
                      {initials}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-[1.35rem] sm:text-[1.6rem] font-black italic uppercase tracking-tighter leading-none text-foreground" id="identityName">
                    {identityName}
                  </h3>
                  {profile?.email && !isEditing && (
                    <p className="text-[0.8rem] font-medium text-muted-foreground -mt-[0.35rem]" id="identityEmail">
                      {profile.email}
                    </p>
                  )}
                </div>
                {badge && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-[0.45rem] h-8 px-4 pill border text-[10px] font-black uppercase tracking-[0.14em] whitespace-nowrap badge',
                      badge.className
                    )}
                  >
                    <badge.Icon className="w-[0.85rem] h-[0.85rem]" />
                    {badge.label}
                  </span>
                )}
              </section>

              {isEditing ? (
                <div className="flex flex-col gap-[1.4rem] sm:gap-7">
                  {generalError && (
                    <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl font-medium text-left">
                      {generalError}
                    </div>
                  )}
                  <section className="flex flex-col gap-3" aria-label="Dati personali">
                    <div className="section-head">
                      <p className="field-label text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 -mb-[0.1rem]">Dati personali</p>
                      <span className="section-hint">I campi contrassegnati sono modificabili</span>
                    </div>

                    {/* Nome completo */}
                    <div>
                      <div className={cn("info-row editable", errors.fullName && "has-error")}>
                        <span className="info-row-icon flex items-center justify-center">
                          <User className="w-[1.125rem] h-[1.125rem] text-muted-foreground/40 shrink-0" />
                        </span>
                        <span className="info-row-body" style={{ flex: 1 }}>
                          <label className="info-row-label text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 text-left block" htmlFor="inputFullName">Nome completo</label>
                          <input
                            className="field-input text-left"
                            id="inputFullName"
                            type="text"
                            value={fullName}
                            placeholder="Nome e cognome"
                            autoComplete="name"
                            disabled={isSaving}
                            onChange={(e) => {
                              setFullName(e.target.value)
                              if (e.target.value.trim()) {
                                setErrors(prev => ({ ...prev, fullName: null }))
                              }
                            }}
                          />
                        </span>
                      </div>
                      {errors.fullName && (
                        <p className="field-error text-left">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[0.8rem] h-[0.8rem] shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <div className={cn("info-row editable", errors.email && "has-error")}>
                        <span className="info-row-icon flex items-center justify-center">
                          <Mail className="w-[1.125rem] h-[1.125rem] text-muted-foreground/40 shrink-0" />
                        </span>
                        <span className="info-row-body" style={{ flex: 1 }}>
                          <label className="info-row-label text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 text-left block" htmlFor="inputEmail">Email</label>
                          <input
                            className="field-input text-left"
                            id="inputEmail"
                            type="email"
                            value={email}
                            placeholder="nome@email.com"
                            autoComplete="email"
                            disabled={isSaving}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                              if (emailRe.test(e.target.value.trim())) {
                                setErrors(prev => ({ ...prev, email: null }))
                              }
                            }}
                          />
                        </span>
                        {(email.trim() === (profile?.email ?? '') || email.trim() === '') && !pendingEmail && (
                          <span className="status-chip">
                            <Check className="w-[0.6rem] h-[0.6rem]" strokeWidth={3} />
                            Attivo
                          </span>
                        )}
                      </div>
                      {errors.email && (
                        <p className="field-error text-left">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[0.8rem] h-[0.8rem] shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          {errors.email}
                        </p>
                      )}

                      {/* Banner "email in attesa di conferma" */}
                      {pendingEmail && (
                        <div className="pending-banner">
                          <span className="pending-banner-icon spin flex items-center justify-center">
                            <RefreshCw className="w-[1.05rem] h-[1.05rem]" />
                          </span>
                          <div className="pending-banner-body">
                            <p className="pending-banner-title text-left">Conferma in sospeso</p>
                            <p className="pending-banner-text text-left">
                              Abbiamo inviato un link di conferma a <strong>{pendingEmail}</strong>.
                              Fino alla conferma continuerai ad accedere con{' '}
                              <strong>{profile?.email}</strong> — <span className="muted text-muted-foreground/60">il vecchio indirizzo resta attivo.</span>
                            </p>
                            <div className="pending-banner-actions">
                              <button
                                type="button"
                                className="pending-link"
                                onClick={handleResendConfirmation}
                                disabled={resendStatus === 'sending'}
                              >
                                {resendStatus === 'sending' ? 'Invio...' : resendStatus === 'sent' ? 'Inviata!' : 'Reinvia email'}
                              </button>
                              <button
                                type="button"
                                className="pending-link danger"
                                onClick={handleCancelPendingEmail}
                              >
                                Annulla richiesta
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ruolo (Sola lettura anche in modifica) */}
                    <div className="info-row flex items-center gap-4 min-h-14 px-[1.375rem] py-2 pill bg-white/5 border border-white/10 opacity-70">
                      <Shield className="w-[1.125rem] h-[1.125rem] text-muted-foreground/40 shrink-0" />
                      <span className="min-w-0 flex flex-col gap-[0.1rem] text-left">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50">Ruolo</span>
                        <span className="text-sm font-bold text-foreground truncate">{badge?.label ?? '—'}</span>
                      </span>
                    </div>
                  </section>

                  {/* Cambia password (collassabile, opzionale) */}
                  <section className={cn("collapse-section", isPasswordOpen && "open")} aria-label="Cambia password">
                    <button
                      type="button"
                      className="collapse-trigger"
                      onClick={() => {
                        const nextState = !isPasswordOpen
                        setIsPasswordOpen(nextState)
                        setErrors(prev => ({ ...prev, newPassword: null, confirmPassword: null }))
                        if (!nextState) {
                          setNewPassword('')
                          setConfirmPassword('')
                        }
                      }}
                      aria-expanded={isPasswordOpen}
                      aria-controls="password-collapse-body"
                    >
                      <span className="collapse-trigger-left">
                        <span className="collapse-icon flex items-center justify-center">
                          <Lock className="w-[1.15rem] h-[1.15rem]" />
                        </span>
                        <span className="collapse-titles">
                          <span className="collapse-title block text-left">Cambia password</span>
                          <span className="collapse-sub block text-left">Facoltativo — lascia vuoto per non modificarla</span>
                        </span>
                      </span>
                      <svg className="collapse-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    
                    <div 
                      id="password-collapse-body"
                      className="collapse-body transition-all duration-300 ease-in-out" 
                      style={{ maxHeight: isPasswordOpen ? '22rem' : '0' }}
                    >
                      <div className="collapse-body-inner flex flex-col gap-[0.85rem]">
                        <div>
                          <div className={cn("info-row editable", errors.newPassword && "has-error")}>
                            <span className="info-row-icon flex items-center justify-center">
                              <Lock className="w-[1.125rem] h-[1.125rem] text-muted-foreground/40 shrink-0" />
                            </span>
                            <span className="info-row-body" style={{ flex: 1 }}>
                              <label className="info-row-label text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 text-left block" htmlFor="inputNewPassword">Nuova password</label>
                              <input
                                className="field-input text-left"
                                id="inputNewPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                placeholder="Minimo 6 caratteri"
                                autoComplete="new-password"
                                disabled={isSaving}
                                onChange={(e) => {
                                  setNewPassword(e.target.value)
                                  if (e.target.value.length >= 6) {
                                    setErrors(prev => ({ ...prev, newPassword: null }))
                                  }
                                }}
                              />
                            </span>
                            <button
                              type="button"
                              className="field-visibility-btn"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                              tabIndex={-1}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          </div>
                          
                          {/* Strength meter */}
                          {newPassword.length > 0 && (
                            <div className="strength-meter">
                              <span className={cn("strength-bar", pwdStrength.score >= 1 && pwdStrength.className)}></span>
                              <span className={cn("strength-bar", pwdStrength.score >= 2 && pwdStrength.className)}></span>
                              <span className={cn("strength-bar", pwdStrength.score >= 3 && pwdStrength.className)}></span>
                            </div>
                          )}

                          {errors.newPassword && (
                            <p className="field-error text-left">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[0.8rem] h-[0.8rem] shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              {errors.newPassword}
                            </p>
                          )}
                        </div>

                        <div>
                          <div className={cn("info-row editable", errors.confirmPassword && "has-error")}>
                            <span className="info-row-icon flex items-center justify-center">
                              <Check className="w-[1.125rem] h-[1.125rem] text-muted-foreground/40 shrink-0" />
                            </span>
                            <span className="info-row-body" style={{ flex: 1 }}>
                              <label className="info-row-label text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 text-left block" htmlFor="inputConfirmPassword">Conferma nuova password</label>
                              <input
                                className="field-input text-left"
                                id="inputConfirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                placeholder="Ripeti la nuova password"
                                autoComplete="new-password"
                                disabled={isSaving}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value)
                                  if (e.target.value === newPassword) {
                                    setErrors(prev => ({ ...prev, confirmPassword: null }))
                                  }
                                }}
                              />
                            </span>
                            <button
                              type="button"
                              className="field-visibility-btn"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                              tabIndex={-1}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p className="field-error text-left">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[0.8rem] h-[0.8rem] shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              {errors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <>
                  {/* Dati in sola lettura */}
                  <section className="flex flex-col gap-3" aria-label="Dettagli account">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 -mb-[0.1rem] text-left">
                      Dettagli account
                    </p>
                    {infoRows.map(({ label, value, Icon }) => (
                      <div
                        key={label}
                        className="info-row flex items-center gap-4 min-h-14 px-[1.375rem] py-2 pill bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
                      >
                        <Icon className="w-[1.125rem] h-[1.125rem] text-muted-foreground/40 shrink-0" />
                        <span className="min-w-0 flex flex-col gap-[0.1rem] text-left">
                          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50">
                            {label}
                          </span>
                          <span className="text-sm font-bold text-foreground truncate">{value}</span>
                        </span>
                      </div>
                    ))}
                  </section>

                  {/* Sincronizza Calendario */}
                  <section className="flex flex-col gap-3" aria-label="Sincronizzazione Calendario">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3 -mb-[0.1rem] text-left">
                      Sincronizza Calendario
                    </p>
                    <div className="flex flex-col gap-3 p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="text-sm font-bold text-foreground">Sincronizzazione Esterna (iCal)</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Importa gli eventi societari e le partite direttamente sul tuo Google Calendar, Apple Calendar o Outlook in tempo reale.
                          </p>
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl font-medium">
                          {errorMsg}
                        </div>
                      )}

                      {icsToken ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-black/30 border border-white/5 flex items-center">
                              <span className="text-xs text-muted-foreground font-mono truncate select-all">
                                {icsFeedService.buildIcsUrl(icsToken)}
                              </span>
                            </div>
                            <button
                              onClick={handleCopyLink}
                              type="button"
                              className={cn(
                                "h-11 px-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shrink-0",
                                isCopied
                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                  : "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
                              )}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-4.5 h-4.5" />
                                  Copiato
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4.5 h-4.5" />
                                  Copia
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-1 pl-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Link pronto e attivo
                            </span>
                            <button
                              onClick={handleRegenerateToken}
                              disabled={isLoadingToken}
                              type="button"
                              className="text-[10px] font-bold text-muted-foreground hover:text-rose-400 transition-colors flex items-center gap-1 uppercase tracking-wider"
                            >
                              <RefreshCw className={cn("w-3 h-3", isLoadingToken && "animate-spin")} />
                              Rigenera Link
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <button
                            onClick={handleRegenerateToken}
                            disabled={isLoadingToken}
                            type="button"
                            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                          >
                            <RefreshCw className={cn("w-4 h-4", isLoadingToken && "animate-spin")} />
                            {isLoadingToken ? 'Generazione...' : 'Attiva Sincronizzazione'}
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* Success toast */}
            <div className={cn("save-toast", showToast && "show")}>
              <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
              Modifiche salvate
            </div>

            {/* Footer azioni */}
            <div className="p-5 sm:px-8 sm:py-6 border-t border-white/5 bg-black/20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="w-full sm:w-auto sm:flex-1 h-14 px-8 pill border border-white/10 text-[10px] font-black uppercase tracking-[0.12em] text-foreground hover:bg-white/5 active:scale-95 transition-all inline-flex items-center justify-center gap-3"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto sm:flex-[2] h-14 px-8 pill bg-primary text-white text-[10px] font-black uppercase tracking-[0.12em] inline-flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto sm:flex-1 h-14 px-8 pill border border-white/10 text-[10px] font-black uppercase tracking-[0.12em] text-foreground hover:bg-white/5 active:scale-95 transition-all inline-flex items-center justify-center gap-3"
                  >
                    Chiudi
                  </button>
                  <button
                    type="button"
                    onClick={startEditing}
                    className="w-full sm:w-auto sm:flex-[2] h-14 px-8 pill bg-primary text-white text-[10px] font-black uppercase tracking-[0.12em] inline-flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    <User className="w-[1.125rem] h-[1.125rem]" />
                    Modifica Profilo
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

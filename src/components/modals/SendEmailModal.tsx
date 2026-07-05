import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mail, Send, Users, User, Search, ChevronDown, Loader2,
  CheckCircle2, AlertTriangle, Tag
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}


const ROLE_LABELS: Record<UserRole, string> = {
  president: 'Presidenti',
  director: 'Dirigenti',
  coach: 'Allenatori',
  player: 'Giocatori (profilo)',
  parent: 'Genitori',
}

type RecipientMode = 'single' | 'group'
type GroupTarget = 'all' | UserRole | `sector:${string}`

function recipientLabel(target: GroupTarget): string {
  if (target === 'all') return 'Tutti gli utenti'
  if (target.startsWith('sector:')) {
    const s = target.replace('sector:', '')
    return `Leva ${s} (dal DB atleti)`
  }
  return ROLE_LABELS[target as UserRole] ?? target
}

interface EmailStats {
  monthly_emails_sent: number
  daily_emails_sent: number
  monthly_limit: number
  daily_limit: number
}

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
}

// Gauge arc component for visual limit display
function UsageArc({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1)
  const radius = 28
  const circumference = Math.PI * radius // half circle
  const offset = circumference * (1 - pct)
  const isWarning = pct >= 0.8
  const arcColor = isWarning ? (pct >= 0.95 ? '#ef4444' : '#f59e0b') : color

  return (
    <svg viewBox="0 0 72 40" className="w-16 h-10">
      {/* Track */}
      <path
        d="M 8 36 A 28 28 0 0 1 64 36"
        fill="none" stroke="currentColor" strokeWidth="6"
        strokeLinecap="round" className="text-muted/20"
      />
      {/* Fill */}
      <path
        d="M 8 36 A 28 28 0 0 1 64 36"
        fill="none" stroke={arcColor} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
      />
    </svg>
  )
}

export default function SendEmailModal({ isOpen, onClose }: Readonly<SendEmailModalProps>) {
  const [mode, setMode] = useState<RecipientMode>('group')
  const [groupTarget, setGroupTarget] = useState<GroupTarget>('all')
  const [singleEmail, setSingleEmail] = useState('')
  const [singleSearch, setSingleSearch] = useState('')
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sectors, setSectors] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [resolvedCount, setResolvedCount] = useState<number | null>(null)
  const [resolvingCount, setResolvingCount] = useState(false)
  const [showSectorDropdown, setShowSectorDropdown] = useState(false)
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)
  const sectorRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSubject('')
      setBody('')
      setSingleEmail('')
      setSingleSearch('')
      setSuggestions([])
      setMode('group')
      setGroupTarget('all')
      setResult(null)
      setResolvedCount(null)
      void fetchSectors()
      void fetchEmailStats()
    }
  }, [isOpen])

  const resolveRecipients = useCallback(async (validate = true): Promise<string[]> => {
    if (mode === 'single') {
      const addr = singleEmail.trim()
      if (validate && !addr.includes('@')) throw new Error('Email non valida')
      return addr ? [addr] : []
    }

    const emails: string[] = []

    if (groupTarget === 'all' || !groupTarget.startsWith('sector:')) {
      let query = supabase.from('profiles').select('email')
      if (groupTarget !== 'all') {
        query = query.eq('role', groupTarget as UserRole)
      }
      const { data } = await query
      if (data) emails.push(...data.map(p => p.email).filter(Boolean))
    }

    if (groupTarget.startsWith('sector:')) {
      const sector = groupTarget.replace('sector:', '')
      const { data } = await supabase
        .from('players')
        .select('email')
        .eq('team_sector', sector)
        .eq('is_active', true)
        .not('email', 'is', null)
      if (data) emails.push(...data.map(p => p.email).filter(Boolean) as string[])
    }

    return [...new Set(emails)].filter(e => e.includes('@'))
  }, [mode, singleEmail, groupTarget])

  const resolveCount = useCallback(async () => {
    setResolvingCount(true)
    try {
      const emails = await resolveRecipients(false)
      setResolvedCount(emails.length)
    } catch {
      setResolvedCount(null)
    }
    setResolvingCount(false)
  }, [resolveRecipients])

  useEffect(() => {
    if (!isOpen) return
    void resolveCount()
  }, [isOpen, resolveCount])

  const fetchSectors = async () => {
    const { data } = await supabase
      .from('players')
      .select('team_sector')
      .eq('is_active', true)
    if (data) {
      const unique = Array.from(new Set(data.map(p => p.team_sector).filter(Boolean))) as string[]
      setSectors(unique.sort())
    }
  }

  const fetchEmailStats = async () => {
    // Get this month's usage from email_usage table
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const { data: monthData } = await supabase
      .from('email_usage')
      .select('recipient_count, sent_at')
      .gte('sent_at', startOfMonth)

    if (monthData) {
      const monthly_emails_sent = monthData.reduce((sum, r) => sum + r.recipient_count, 0)
      const daily_emails_sent = monthData
        .filter(r => r.sent_at >= startOfDay)
        .reduce((sum, r) => sum + r.recipient_count, 0)
      setEmailStats({
        monthly_emails_sent,
        daily_emails_sent,
        monthly_limit: 3000,
        daily_limit: 100,
      })
    }
  }

  const handleSearch = async (query: string) => {
    setSingleSearch(query)
    setSingleEmail(query)
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    const { data } = await supabase.from('profiles').select('id, email, full_name, role')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(6)
    if (data) { setSuggestions(data as Profile[]); setShowSuggestions(true) }
  }

  const selectSuggestion = (p: Profile) => {
    setSingleEmail(p.email)
    setSingleSearch(p.full_name ? `${p.full_name} <${p.email}>` : p.email)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setResult(null)
    try {
      const to = await resolveRecipients(true)
      if (to.length === 0) throw new Error('Nessun destinatario trovato')

      // Check daily limit
      if (emailStats && emailStats.daily_emails_sent + to.length > emailStats.daily_limit) {
        throw new Error(`Limite giornaliero superato: puoi ancora inviare ${Math.max(0, emailStats.daily_limit - emailStats.daily_emails_sent)} email oggi.`)
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessione non valida. Rieffettua il login.')

      const res = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject: subject.trim(),
          html: body.replaceAll('\n', '<br/>'),
          groupTarget: mode === 'group' ? groupTarget : undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (res.error) throw new Error(res.error.message)
      setResult({ success: true, message: `✓ Email inviata a ${to.length} destinatari!` })
      // Refresh stats after sending
      void fetchEmailStats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore durante l'invio."
      setResult({ success: false, message: msg })
    }
    setSending(false)
  }

  const canSend = subject.trim().length > 0 && body.trim().length > 0 &&
    (mode === 'group' || singleEmail.includes('@'))

  // Warn if this send would exceed limits
  const dailyRemaining = emailStats ? Math.max(0, emailStats.daily_limit - emailStats.daily_emails_sent) : null
  const wouldExceedDaily = dailyRemaining !== null && resolvedCount !== null && resolvedCount > dailyRemaining

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-[95vw] max-w-4xl glass-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-black/5 dark:border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[96vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0">
                  <Mail className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase leading-none">
                    Invia <span className="text-primary not-italic">Email</span>
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                    Comunicazione interna · da onboarding@resend.dev
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 pill hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all hover:rotate-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* ── Email Usage Counter ── */}
            {emailStats && (
              <div className="mx-8 mb-2 shrink-0">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  {/* Daily */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex flex-col items-center">
                      <UsageArc
                        value={emailStats.daily_emails_sent}
                        max={emailStats.daily_limit}
                        color="#6366f1"
                      />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground -mt-1">Oggi</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          "text-xl font-black tabular-nums",
                          emailStats.daily_emails_sent / emailStats.daily_limit >= 0.95 ? "text-red-500" :
                          emailStats.daily_emails_sent / emailStats.daily_limit >= 0.8 ? "text-amber-500" : "text-foreground"
                        )}>
                          {emailStats.daily_emails_sent}
                        </span>
                        <span className="text-sm text-muted-foreground font-bold">/ {emailStats.daily_limit}</span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground leading-tight">
                        <span className={cn(
                          "font-black",
                          (emailStats.daily_limit - emailStats.daily_emails_sent) <= 10 ? "text-red-500" : "text-primary"
                        )}>
                          {Math.max(0, emailStats.daily_limit - emailStats.daily_emails_sent)}
                        </span> rimaste oggi
                      </p>
                    </div>
                  </div>

                  {/* Monthly */}
                  <div className="flex items-center gap-3 border-l border-black/5 dark:border-white/10 pl-3">
                    <div className="relative flex flex-col items-center">
                      <UsageArc
                        value={emailStats.monthly_emails_sent}
                        max={emailStats.monthly_limit}
                        color="#10b981"
                      />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground -mt-1">Mese</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          "text-xl font-black tabular-nums",
                          emailStats.monthly_emails_sent / emailStats.monthly_limit >= 0.95 ? "text-red-500" :
                          emailStats.monthly_emails_sent / emailStats.monthly_limit >= 0.8 ? "text-amber-500" : "text-foreground"
                        )}>
                          {emailStats.monthly_emails_sent}
                        </span>
                        <span className="text-sm text-muted-foreground font-bold">/ {emailStats.monthly_limit}</span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground leading-tight">
                        <span className={cn(
                          "font-black",
                          (emailStats.monthly_limit - emailStats.monthly_emails_sent) <= 100 ? "text-amber-500" : "text-emerald-500"
                        )}>
                          {Math.max(0, emailStats.monthly_limit - emailStats.monthly_emails_sent)}
                        </span> rimaste questo mese
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning if about to exceed */}
                {wouldExceedDaily && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Attenzione: {resolvedCount} destinatari supererebbe il limite giornaliero ({dailyRemaining} email rimaste).
                  </motion.div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8 space-y-6 pt-2">

              {/* ── Mode Toggle ── */}
              <div className="flex gap-2 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/10">
                <button
                  onClick={() => setMode('single')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                    mode === 'single' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="w-4 h-4" /> Singolo
                </button>
                <button
                  onClick={() => setMode('group')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                    mode === 'group' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="w-4 h-4" /> Gruppo
                </button>
              </div>

              {/* ── Single recipient ── */}
              {mode === 'single' && (
                <div className="space-y-2 relative" ref={suggestionsRef}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                    Destinatario
                  </label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder="Cerca nome o scrivi email..."
                      value={singleSearch}
                      onChange={e => handleSearch(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      className="w-full h-14 pl-14 pr-6 rounded-full glass-card border border-black/5 dark:border-white/10 focus:border-primary focus:outline-none text-base font-medium placeholder:text-muted-foreground/40 text-foreground transition-all"
                    />
                  </div>
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute z-20 w-full bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/15 overflow-hidden mt-1"
                      >
                        {suggestions.map(p => (
                          <button
                            key={p.id}
                            onClick={() => selectSuggestion(p)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-primary/5 hover:text-primary text-left transition-colors"
                          >
                            <div className="w-8 h-8 pill bg-primary/15 flex items-center justify-center font-black text-primary text-xs shrink-0">
                              {(p.full_name?.charAt(0) || p.email.charAt(0)).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{p.full_name || p.email}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Group recipient ── */}
              {mode === 'group' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                    Destinatari
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['all', 'Tutti'],
                      ['parent', 'Genitori'],
                      ['player', 'Giocatori'],
                      ['coach', 'Allenatori'],
                      ['director', 'Dirigenti'],
                    ] as [GroupTarget, string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setGroupTarget(val)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          groupTarget === val
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}

                    {/* Sector dropdown */}
                    <div className="relative" ref={sectorRef}>
                      <button
                        onClick={() => setShowSectorDropdown(p => !p)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          groupTarget.startsWith('sector:')
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                            : "text-muted-foreground border-black/10 dark:border-white/10 hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {groupTarget.startsWith('sector:') ? groupTarget.replace('sector:', '') : 'Per Leva'}
                        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                      </button>
                      <AnimatePresence>
                        {showSectorDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            className="absolute top-full left-0 mt-1 z-20 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/15 overflow-hidden min-w-[180px]"
                          >
                            {sectors.map(s => (
                              <button
                                key={s}
                                onClick={() => { setGroupTarget(`sector:${s}`); setShowSectorDropdown(false) }}
                                className="w-full text-left px-5 py-2.5 text-sm font-bold hover:bg-primary/5 hover:text-primary transition-colors"
                              >
                                Leva {s}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Count badge */}
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/15 w-fit">
                    {resolvingCount ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-black text-primary">
                      {resolvingCount
                        ? 'Calcolo destinatari...'
                        : resolvedCount !== null
                          ? `${resolvedCount} destinatari trovati`
                          : '—'}
                    </span>
                    {!resolvingCount && resolvedCount !== null && (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        · {recipientLabel(groupTarget)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Subject ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Oggetto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Oggetto della comunicazione..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full h-14 px-6 rounded-full glass-card border border-black/5 dark:border-white/10 focus:border-primary focus:outline-none text-base font-bold placeholder:text-muted-foreground/40 text-foreground transition-all"
                />
              </div>

              {/* ── Body ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 pl-3">
                  Messaggio <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={7}
                  placeholder="Scrivi qui il testo della tua email..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="w-full rounded-3xl glass-card border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:outline-none px-6 py-4 text-base font-medium placeholder:text-muted-foreground/40 bg-transparent text-foreground resize-none"
                />
                <p className="text-[10px] text-muted-foreground/50 pl-3">
                  {body.length} caratteri · I ritorni a capo saranno preservati
                </p>
              </div>

              {/* ── Result feedback ── */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-bold",
                    result.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                  )}
                >
                  {result.success
                    ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                    : <AlertTriangle className="w-5 h-5 shrink-0" />}
                  {result.message}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 pt-4 shrink-0 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-14 pill bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => void handleSend()}
                  disabled={!canSend || sending || wouldExceedDaily}
                  className="flex-[2] h-14 pill bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 active:scale-95"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {sending ? 'Invio in corso...' : 'Invia Email'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

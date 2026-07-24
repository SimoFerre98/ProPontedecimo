import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { profileService } from '@/services/profileService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function RecoveryPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkSession() {
      // Supabase parses URL hash automatically.
      // Let's first check if there's an error in the hash
      const hash = window.location.hash
      if (hash && (hash.includes('error=') || hash.includes('error_description='))) {
        setHasSession(false)
        setCheckingSession(false)
        return
      }

      // Check if session is already established
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
      } else {
        // Wait a tiny bit for supabase to process hash if redirect just happened
        await new Promise((resolve) => setTimeout(resolve, 500))
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        setHasSession(!!retrySession)
      }
      setCheckingSession(false)
    }

    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.')
      return
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await profileService.updatePassword(password)
      setSuccess(true)
      // Wait 2 seconds and navigate to dashboard/home page
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Si è verificato un errore durante il reset.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return <LoadingSpinner fullPage label="Verifica della sessione in corso..." />
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <img src="/Logo ASD Pro Pontedecimo.png" alt="Pontedecimo" className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Link non valido o scaduto</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Il link di recupero password utilizzato non è più valido, è già stato utilizzato o è scaduto.
            Contatta un amministratore per innescare un nuovo invio.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Torna all'accesso
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#800020] p-12 text-white">
        <div className="flex items-center gap-3">
          <img src="/Logo ASD Pro Pontedecimo.png" alt="Pontedecimo" className="w-12 h-12 object-contain" />
          <span className="text-xl font-bold">Pontedecimo</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Recupera la tua<br />password
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Imposta una nuova credenziale di sicurezza per accedere al portale del club.
          </p>
        </div>
        <p className="text-white/30 text-xs">© 2025 Pontedecimo ASD</p>
      </div>

      {/* Right – form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/Logo ASD Pro Pontedecimo.png" alt="Pontedecimo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-foreground">Pontedecimo</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Nuova Password</h2>
          <p className="text-sm text-muted-foreground mb-8">Inserisci la tua nuova password</p>

          {success ? (
            <div className="bg-[var(--emerald)]/10 border border-[var(--emerald)]/30 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-[var(--emerald)] mb-1">Password aggiornata con successo!</p>
              <p className="text-xs text-[var(--emerald)]/85">Verrai reindirizzato al pannello a breve...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="password">
                  Nuova password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition"
                    placeholder="Almeno 6 caratteri"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="confirmPassword">
                  Conferma password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition"
                  placeholder="Ripeti la password"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" tone="white" />
                    Salvataggio...
                  </span>
                ) : 'Salva nuova password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

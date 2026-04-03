import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenziali non valide. Riprova.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#800020] p-12 text-white">
        <div className="flex items-center gap-3">
          <img src="/Logo ASD Pro Pontedecimo.png" alt="Pro Pontedecimo" className="w-12 h-12 object-contain" />
          <span className="text-xl font-bold">Pro Pontedecimo</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Gestisci la tua<br />società calcistica
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Atleti, pagamenti, visite mediche e presenze: tutto in un unico posto sicuro.
          </p>
        </div>
        <p className="text-white/30 text-xs">© 2025 Pro Pontedecimo ASD</p>
      </div>

      {/* Right – form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/Logo ASD Pro Pontedecimo.png" alt="Pro Pontedecimo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-foreground">Pro Pontedecimo</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Accedi</h2>
          <p className="text-sm text-muted-foreground mb-8">Inserisci le tue credenziali per continuare</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#800020]/30 focus:border-[#800020] transition"
                placeholder="nome@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#800020]/30 focus:border-[#800020] transition"
                placeholder="••••••••"
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
              className="w-full py-2.5 px-4 rounded-lg bg-[#800020] text-white text-sm font-semibold hover:bg-[#5a0016] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#800020]/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accesso...
                </span>
              ) : 'Accedi'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Non hai un account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-medium text-[#800020] hover:underline focus:outline-none"
            >
              Registrati
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

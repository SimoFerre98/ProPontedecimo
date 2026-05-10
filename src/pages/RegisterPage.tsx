import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'player' | 'parent'>('player')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            role: role
          }
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Dopo il signup, tentiamo anche l'update/insert nel profilo per sicurezza
        // Nel caso manchi il trigger del DB su auth.users
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: `${firstName} ${lastName}`.trim(),
            role: role
          })

        if (profileError && profileError.code !== '23505') {
           // Ignoriamo l'errore di unicità (23505) se il trigger ha già creato il profilo
           console.error('Errore upsert profile:', profileError)
        }
      }

      setSuccess(true)
      // Navigazione posticipata
      setTimeout(() => {
        navigate('/login')
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione. Riprova.')
    } finally {
      setLoading(false)
    }
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
            Unisciti alla nostra<br />Famiglia
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Registrati come Atleta o Genitore per accedere alla tua area personale e rimanere aggiornato sulla stagione.
          </p>
        </div>
        <p className="text-white/30 text-xs">© 2025 Pontedecimo ASD</p>
      </div>

      {/* Right – form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/Logo ASD Pro Pontedecimo.png" alt="Pontedecimo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-foreground">Pontedecimo</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Crea un account</h2>
          <p className="text-sm text-muted-foreground mb-8">Compila i dati per accedere al portale dedicato.</p>

          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
              <h3 className="text-emerald-500 font-bold mb-2">Registrazione completata!</h3>
              <p className="text-sm text-muted-foreground">
                Il tuo account è stato creato con successo. Verrai reindirizzato al login a breve.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="firstName">
                    Nome
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#800020]/30 focus:border-[#800020] transition"
                    placeholder="Mario"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="lastName">
                    Cognome
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#800020]/30 focus:border-[#800020] transition"
                    placeholder="Rossi"
                  />
                </div>
              </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#800020]/30 focus:border-[#800020] transition"
                  placeholder="Minimo 6 caratteri"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Seleziona il tuo ruolo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('player')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                      role === 'player' 
                        ? "border-[#800020] bg-[#800020]/5 text-[#800020]" 
                        : "border-border bg-white text-muted-foreground hover:bg-black/5"
                    )}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-semibold">Atleta</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                      role === 'parent' 
                        ? "border-[#800020] bg-[#800020]/5 text-[#800020]" 
                        : "border-border bg-white text-muted-foreground hover:bg-black/5"
                    )}
                  >
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-semibold">Genitore</span>
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2 mt-4">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 mt-6 rounded-lg bg-[#800020] text-white text-sm font-semibold hover:bg-[#5a0016] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#800020]/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registrazione...
                  </span>
                ) : 'Registrati'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hai già un account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-medium text-[#800020] hover:underline focus:outline-none"
            >
              Accedi
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

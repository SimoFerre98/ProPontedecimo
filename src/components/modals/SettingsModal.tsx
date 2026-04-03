import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Search, UserCog, Mail, ShieldAlert, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

type UserRole = Database['public']['Enums']['user_role']

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
}

const ROLE_LABELS: Record<UserRole, string> = {
  president: 'Presidente',
  director: 'Dirigente',
  coach: 'Allenatore',
  player: 'Giocatore',
  parent: 'Genitore'
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      void fetchProfiles()
    }
  }, [isOpen])

  const fetchProfiles = async () => {
    setLoading(true)
    setErrorMsg(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setErrorMsg("Errore nel caricamento degli utenti.")
    } else if (data) {
      setProfiles(data as Profile[])
    }
    setLoading(false)
  }

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    setUpdatingId(profileId)
    setErrorMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    if (error) {
      console.error(error)
      setErrorMsg("Errore durante l'aggiornamento del ruolo. Verifica i permessi.")
    } else {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p))
    }
    setUpdatingId(null)
  }

  const filteredProfiles = profiles.filter(p => 
    (p.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestione Account">
      <div className="p-4 sm:p-6 space-y-6">
        
        {/* Intestazione */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Cerca per nome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/5 dark:bg-white/5 border border-border rounded-xl outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Lista Utenti */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nessun utente trovato.</p>
            </div>
          ) : (
            filteredProfiles.map(profile => (
              <div key={profile.id} className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 glass-card rounded-2xl border border-white/10 dark:border-white/5 transition-all hover:bg-black/5 dark:hover:bg-white/5">
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                  <div className="w-10 h-10 pill bg-primary/20 flex-shrink-0 flex items-center justify-center font-bold text-primary">
                    {profile.full_name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground truncate flex items-center gap-2">
                      {profile.full_name || 'Utente Senza Nome'}
                      {profile.id === user?.id && <span className="text-[9px] font-black uppercase tracking-widest bg-primary text-white dark:text-black px-2 py-0.5 pill">Tu</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {profile.email}
                    </p>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto mt-2 sm:mt-0 flex items-center justify-end">
                  {updatingId === profile.id ? (
                    <div className="px-4 py-2"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
                  ) : (
                    <select
                      value={profile.role}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                      disabled={profile.id === user?.id || updatingId !== null}
                      className="w-full sm:w-auto bg-black/5 dark:bg-white/10 border border-border text-foreground text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-primary disabled:opacity-50 cursor-pointer text-center sm:text-left transition-colors hover:border-primary"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value} className="bg-background text-foreground">
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

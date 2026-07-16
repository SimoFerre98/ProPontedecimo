import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { CalendarDays, CreditCard, Stethoscope, Construction, Users, Plus, Clock, CheckCircle2, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import RequestChildLinkModal from '@/components/modals/RequestChildLinkModal'
import { getMyChildren, type MyParentPlayer } from '@/services/parentService'

export default function PortalDashboard() {
  const { profile, role } = useAuth()
  const [requestModalOpen, setRequestModalOpen] = useState(false)

  const isPlayer = role === 'player'
  const isParent = role === 'parent'

  const { data: myChildren = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: getMyChildren,
    enabled: isParent,
  })

  const confirmedChildren = myChildren.filter((c: MyParentPlayer) => c.status === 'confirmed')
  const pendingChildren = myChildren.filter((c: MyParentPlayer) => c.status === 'pending')

  const sections = [
    {
      title: 'Calendario e Presenze',
      description: 'Consulta i prossimi allenamenti e le convocazioni per le partite.',
      icon: CalendarDays,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      visible: true
    },
    {
      title: 'Visite Mediche',
      description: 'Verifica la scadenza del certificato medico sportivo.',
      icon: Stethoscope,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      visible: isPlayer // maybe only players, although parents care too. For now show it.
    },
    {
      title: 'Stato Pagamenti',
      description: 'Gestisci le quote societarie e i pagamenti pendenti.',
      icon: CreditCard,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      visible: true
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header portale */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 glass-card border-white/10 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <CalendarDays className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-foreground mb-2">
            Benvenuto, {profile?.full_name || 'Utente'}
          </h1>
          <p className="text-muted-foreground font-medium">
            Questa è la tua area {isParent ? 'genitore' : 'atleta'} personale. Presto potrai accedere a tutte le funzionalità.
          </p>
        </div>
      </div>

      {/* Sezione "I miei figli" — solo per i genitori */}
      {isParent && (
        <div className="glass-card rounded-3xl border-white/10 overflow-hidden">
          {/* Header sezione */}
          <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground uppercase italic">
                  I miei <span className="text-primary not-italic">Figli</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  {confirmedChildren.length} confermati
                  {pendingChildren.length > 0 && ` · ${pendingChildren.length} in attesa`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setRequestModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" />
              Collega Figlio
            </button>
          </div>

          {/* Lista figli */}
          <div className="p-6">
            {childrenLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myChildren.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-14 h-14 pill bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <Users className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Nessun figlio collegato</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs">
                  Clicca su &quot;Collega Figlio&quot; per inviare una richiesta di associazione all&apos;amministratore.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Confermati */}
                {confirmedChildren.map((child: MyParentPlayer) => (
                  <motion.div
                    key={child.player_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5"
                  >
                    <div className="w-10 h-10 pill bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground uppercase">
                        {child.last_name} {child.first_name}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {child.team_sector ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Confermato
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* In attesa */}
                {pendingChildren.map((child: MyParentPlayer) => (
                  <motion.div
                    key={child.player_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 glass-card rounded-2xl border border-amber-500/20 bg-amber-500/5"
                  >
                    <div className="w-10 h-10 pill bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                      <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground uppercase">
                        {child.last_name} {child.first_name}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {child.team_sector ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                        In Attesa
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Avviso lavori in corso */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Construction className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">Sezione in Costruzione</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Stiamo lavorando per portare tutte le funzionalità del portale {isParent ? 'genitori' : 'atleti'} online. 
            Queste sezioni saranno disponibili nei prossimi aggiornamenti.
          </p>
        </div>
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((sec, idx) => {
          if (!sec.visible) return null
          const Icon = sec.icon
          
          return (
            <motion.div
              key={sec.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 rounded-[2rem] border-white/5 opacity-80 mix-blend-luminosity grayscale hover:grayscale-0 transition-all duration-500 cursor-not-allowed group relative overflow-hidden"
            >
              {/* Badge Presto Disponibile */}
              <div className="absolute top-4 right-4 text-[10px] uppercase font-black tracking-widest text-[#800020] bg-black/5 px-2 py-1 rounded pill">
                Presto
              </div>

              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", sec.bgColor)}>
                <Icon className={cn("w-7 h-7", sec.color)} />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{sec.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {sec.description}
              </p>
            </motion.div>
          )
        })}
      </div>

      <RequestChildLinkModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />
    </div>
  )
}

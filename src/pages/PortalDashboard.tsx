import { useAuth } from '@/hooks/useAuth'
import { CalendarDays, CreditCard, Stethoscope, Construction } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function PortalDashboard() {
  const { profile, role } = useAuth()
  
  const isPlayer = role === 'player'
  const isParent = role === 'parent'

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
    </div>
  )
}

import { Modal } from '@/components/ui/modal'
import { User } from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Il Mio Profilo">
      <div className="p-6 text-center space-y-4">
        <div className="mx-auto w-16 h-16 pill bg-primary/10 flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-widest text-foreground">In Lavorazione</h3>
        <p className="text-muted-foreground font-medium max-w-sm mx-auto">
          La sezione per la visualizzazione e modifica dei propri dati personali verrà implementata in questa modale.
        </p>
      </div>
    </Modal>
  )
}

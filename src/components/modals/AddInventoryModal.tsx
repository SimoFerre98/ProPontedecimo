import React, { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { inventoryService, type InventoryCategory } from '@/services/inventoryService'
import { Package, Tag, Hash, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddInventoryModal({ isOpen, onClose, onSuccess }: AddInventoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'equipment' as InventoryCategory,
    quantity: 0,
    notes: ''
  })

  const categories: { value: InventoryCategory; label: string }[] = [
    { value: 'kit', label: 'Kit Gara' },
    { value: 'equipment', label: 'Attrezzatura' },
    { value: 'trophy', label: 'Trofei' },
    { value: 'other', label: 'Altro' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await inventoryService.createItem(formData)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating inventory item:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Articolo Magazzino">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="inventory_name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Articolo</label>
          <div className="relative group">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="inventory_name"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
              placeholder="es. Pallone Nike Strike"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.value })}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-2",
                  formData.category === cat.value
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                )}
              >
                <Tag className="w-3 h-3" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="inventory_quantity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Quantità Iniziale</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              id="inventory_quantity"
              type="number"
              min="0"
              required
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 0 })}
              className="pl-9 glass-card border-white/5 focus:border-primary/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="inventory_notes" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Note / Descrizione</label>
          <div className="relative group">
            <FileText className="absolute left-3 top-4 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <textarea
              id="inventory_notes"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full min-h-[100px] pl-9 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-primary/50 text-foreground text-sm font-medium placeholder:text-muted-foreground/30 backdrop-blur-md"
              placeholder="Dettagli aggiuntivi..."
            />
          </div>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aggiungi al Magazzino"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

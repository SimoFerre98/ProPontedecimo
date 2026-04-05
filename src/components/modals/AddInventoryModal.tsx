import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Package, Tag, Hash, Box, Save, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { inventoryService } from '@/services/inventoryService'
import { useQueryClient } from '@tanstack/react-query'

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddInventoryModal({ isOpen, onClose, onSuccess }: Readonly<AddInventoryModalProps>) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'pz',
    min_stock: 5
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await inventoryService.addItem(formData)
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onSuccess?.()
      onClose()
      setFormData({
        name: '',
        category: '',
        quantity: 0,
        unit: 'pz',
        min_stock: 5
      })
    } catch (error) {
      console.error('Error adding inventory item:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-[95vw] max-w-2xl glass-card p-8 shadow-2xl border-black/5 dark:border-white/10 rounded-[2.5rem] overflow-hidden max-h-[96vh] overflow-y-auto"
          >
            {/* Background Decor */}
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 pill bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground italic uppercase">Nuovo <span className="text-primary NOT-italic">Articolo</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Inserimento materiale a magazzino</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 pill hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative">
              <div className="space-y-2">
                <label htmlFor="inv-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-2 cursor-pointer">Nome Articolo</label>
                <div className="relative group">
                  <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="inv-name"
                    required
                    placeholder="Es. Palloni Nike Academy"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="pl-11 h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="inv-cat" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-2 cursor-pointer">Categoria</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="inv-cat"
                    required
                    placeholder="Es. Attrezzatura"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="pl-11 h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="inv-qty" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-2 cursor-pointer">Quantità</label>
                  <div className="relative group">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="inv-qty"
                      type="number"
                      required
                      min="0"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: Number.parseInt(e.target.value, 10) || 0 })}
                      className="pl-11 h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-foreground font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="inv-min" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-2 cursor-pointer">Stock Minimo</label>
                  <div className="relative group">
                    <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="inv-min"
                      type="number"
                      required
                      min="1"
                      value={formData.min_stock}
                      onChange={e => setFormData({ ...formData, min_stock: Number.parseInt(e.target.value, 10) || 0 })}
                      className="pl-11 h-12 pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary text-foreground font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  className="flex-1 h-12 pill font-black uppercase tracking-widest text-[9px] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] h-12 pill bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[9px] shadow-xl shadow-primary/20 gap-2 active:scale-95 transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Aggiungi Articolo
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Package, 
  Plus, 
  Minus, 
  Archive,
  Trophy,
  Dumbbell,
  Shirt,
  MoreVertical,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { inventoryService, type InventoryCategory } from '@/services/inventoryService'
import { AddInventoryModal } from '@/components/modals/AddInventoryModal'

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'all'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getItems()
  })

  const filteredItems = items?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const updateQuantity = async (id: string, delta: number) => {
    const item = items?.find(i => i.id === id)
    if (!item) return
    
    try {
      await inventoryService.updateQuantity(id, item.quantity + delta)
      refetch()
    } catch (error) {
      console.error('Failed to update quantity:', error)
    }
  }

  const categoryIcons: Record<InventoryCategory, React.ReactNode> = {
    kit: <Shirt className="w-5 h-5" />,
    equipment: <Dumbbell className="w-5 h-5" />,
    trophy: <Trophy className="w-5 h-5" />,
    other: <Package className="w-5 h-5" />
  }

  const categoryColors: Record<InventoryCategory, string> = {
    kit: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    equipment: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    trophy: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    other: 'text-muted-foreground bg-white/5 border-white/10'
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <div className="p-2 pill bg-primary/10 border border-primary/20">
              <Archive className="w-8 h-8 text-primary" />
            </div>
            Magazzino
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Gestione kit, attrezzature e premi della società
          </p>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white pill px-6 py-3 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuovo Articolo
        </button>
      </div>

      <AddInventoryModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
      />

      {/* Filters Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Cerca articolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {(['all', 'kit', 'equipment', 'trophy', 'other'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                categoryFilter === cat 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" 
                  : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {cat === 'all' ? 'Tutte le categorie' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {(() => {
            if (isLoading) {
              return new Array(8).fill(0).map((_, i) => (
                <div key={`inventory-skeleton-${i}`} className="h-48 glass-card border-white/5 animate-pulse" />
              ))
            }

            if (filteredItems?.length === 0) {
              return (
                <div className="col-span-full py-20 text-center opacity-30">
                  <Package className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-bold">Nessun articolo trovato</p>
                </div>
              )
            }

            return filteredItems?.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card p-6 group hover:border-primary/30 transition-all relative overflow-hidden"
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -rotate-12 translate-x-4 -translate-y-4">
                  {categoryIcons[item.category]}
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-2.5 rounded-2xl border shrink-0",
                    categoryColors[item.category]
                  )}>
                    {categoryIcons[item.category]}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Quantità</span>
                    <span className={cn(
                      "text-3xl font-black tabular-nums tracking-tighter",
                      item.quantity === 0 ? "text-rose-400" : "text-foreground"
                    )}>
                      {item.quantity}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">{item.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                    {item.notes || 'Nessuna nota aggiuntiva'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="flex-1 bg-white/5 hover:bg-rose-400/10 border border-white/10 hover:border-rose-400/20 py-2.5 rounded-xl transition-all flex items-center justify-center group/btn"
                  >
                    <Minus className="w-4 h-4 text-muted-foreground group-hover/btn:text-rose-400" />
                  </button>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="flex-1 bg-white/5 hover:bg-emerald-400/10 border border-white/10 hover:border-emerald-400/20 py-2.5 rounded-xl transition-all flex items-center justify-center group/btn"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground group-hover/btn:text-emerald-400" />
                  </button>
                  <button className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center justify-center">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {item.quantity < 5 && item.quantity > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-amber-400/80">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Scorta limitata</span>
                  </div>
                )}
                {item.quantity === 0 && (
                  <div className="mt-4 flex items-center gap-2 text-rose-400/80">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Esaurito</span>
                  </div>
                )}
              </motion.div>
            ))
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}

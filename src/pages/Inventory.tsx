import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Package, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  History,
  Tag,
  Box,
  ChevronRight,
  LayoutGrid
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { inventoryService, type InventoryItem } from '@/services/inventoryService'
import AddInventoryModal from '@/components/modals/AddInventoryModal'
import { Pagination } from '@/components/ui/Pagination'

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 10
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, categoryFilter, page],
    queryFn: () => inventoryService.getInventory(search, categoryFilter, page, pageSize),
  })

  const items = data?.data || []
  const totalCount = data?.count || 0

  // Prendi le categorie uniche per il filtro
  const categories = ['all', ...Array.from(new Set(items.map((item: InventoryItem) => item.category)))]

  const stats = useMemo(() => {
    return {
      total: totalCount,
      lowStock: items.filter((item: InventoryItem) => item.quantity <= item.min_stock && item.quantity > 0).length,
      outOfStock: items.filter((item: InventoryItem) => item.quantity === 0).length
    }
  }, [items, totalCount])

  const filteredItems = items // Server side handled now

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
            <LayoutGrid className="w-4 h-4" />
            <span>Storehouse Manager</span>
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tight italic uppercase">
            Gestione <span className="text-primary NOT-italic">Magazzino</span>
          </h1>
          <p className="text-muted-foreground font-medium border-l-2 border-primary/30 pl-4 max-w-xl">
            Monitoraggio in tempo reale delle scorte, attrezzature e materiale tecnico della società.
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="pill bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" /> Nuovo Articolo
        </Button>
      </div>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Articoli Totali', val: stats.total, icon: Box, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'In Esaurimento', val: stats.lowStock, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Esauriti', val: stats.outOfStock, icon: Package, color: 'text-rose-500', bg: 'bg-rose-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center justify-between border-white/5 group hover:border-primary/20 transition-all"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-foreground">{stat.val}</p>
            </div>
            <div className={cn("w-14 h-14 pill flex items-center justify-center shadow-inner", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
<div className="flex-1 relative group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
          <input 
            placeholder="Cerca tra gli articoli a magazzino..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="h-16 pl-16 w-full text-xl pill glass-card border-black/5 dark:border-white/10 focus-visible:ring-primary shadow-2xl focus:scale-[1.01] transition-all font-medium placeholder:text-muted-foreground/40 bg-transparent outline-none text-foreground"
          />
        </div>
        <div className="flex items-center gap-2 p-1.5 glass-card rounded-2xl border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={`category-filter-${String(cat)}`}
              onClick={() => {
                setCategoryFilter(cat)
                setPage(0)
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                categoryFilter === cat 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              {cat === 'all' ? 'Tutte' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border-black/5 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02]">
                <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center w-16 italic">#</th>
                <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Articolo</th>
                <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Giacenza</th>
                <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stato</th>
                <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`inventory-skeleton-row-${i}`} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8"><div className="h-6 bg-white/5 pill w-full" /></td>
                    </tr>
                  ))
                ) : filteredItems?.map((item, idx) => (
                  <motion.tr 
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="px-6 py-6 text-center font-bold text-muted-foreground/30 tabular-nums italic">{idx + 1}</td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 pill bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors italic uppercase">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground/60 font-bold tracking-widest uppercase">Ultimo agg: {item.last_update ? new Date(item.last_update).toLocaleDateString() : '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="pill bg-white/5 border border-white/10 px-3 py-1.5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                        <Tag className="w-3 h-3" />
                        {item.category}
                      </div>
                    </td>
                    <td className="px-6 py-6 font-black text-sm tabular-nums text-foreground/80">
                      {item.quantity} <span className="text-[10px] text-muted-foreground/40 font-bold lowercase">{item.unit}</span>
                    </td>
                    <td className="px-6 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-inner",
                        item.quantity <= 0 ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        item.quantity <= item.min_stock ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      )}>
                        {item.quantity <= 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                         item.quantity <= item.min_stock ? <History className="w-3.5 h-3.5" /> : 
                         <CheckCircle2 className="w-3.5 h-3.5" />}
                        {item.quantity <= 0 ? 'Esaurito' : item.quantity <= item.min_stock ? 'Scarso' : 'Disponibile'}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button className="p-2.5 pill hover:bg-white/10 text-muted-foreground hover:text-primary transition-all group/btn">
                        <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <Pagination 
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        className="mt-6"
      />

      <AddInventoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}

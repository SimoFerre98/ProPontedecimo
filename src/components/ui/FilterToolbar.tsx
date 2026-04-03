import { useState, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  
  sectors: string[]
  activeSector: string
  onSectorChange: (sector: string) => void
  
  viewMode?: 'grid' | 'table'
  onViewModeChange?: (mode: 'grid' | 'table') => void
}

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Cerca...",
  sectors,
  activeSector,
  onSectorChange,
  viewMode,
  onViewModeChange
}: Readonly<FilterToolbarProps>) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })

  const isSearchExpanded = isSearchFocused || search.length > 0

  return (
    <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center w-full drop-shadow-sm border border-black/5 dark:border-white/10 rounded-3xl z-10 transition-all duration-300">
      {/* Expandable Search */}
      <div 
        className={cn(
          "relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 h-14",
          isSearchExpanded ? "w-full md:w-72" : "w-full md:w-14 items-center justify-center flex"
        )}
      >
        <button 
          type="button"
          onClick={() => {
            setIsSearchFocused(true);
            document.getElementById('filter-search-input')?.focus();
          }}
          className={cn(
            "absolute z-10 flex items-center justify-center transition-all duration-300 cursor-text",
            isSearchExpanded ? "left-4 top-1/2 -translate-y-1/2" : "inset-0 w-full h-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
          )}
        >
          <Search className={cn("w-5 h-5 transition-colors duration-300", isSearchFocused ? "text-primary" : "text-muted-foreground")} />
        </button>
        <input
          id="filter-search-input"
          type="text"
          placeholder={isSearchExpanded ? searchPlaceholder : ""}
          value={search}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "absolute inset-0 h-full rounded-full transition-all duration-500 font-medium placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
            isSearchExpanded 
              ? "w-full pl-12 pr-6 opacity-100 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-inner" 
              : "w-full pl-0 pr-0 opacity-0 cursor-pointer bg-transparent"
          )}
        />
        {!isSearchExpanded && (
          <div className="absolute inset-0 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 pointer-events-none transition-colors shadow-sm hidden md:block" />
        )}
      </div>

      {/* Scrollable Sectors List with Arrows */}
      <div className="flex-1 flex items-center w-full min-w-0 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/10 h-14">
        <button onClick={scrollLeft} className="p-2 pill hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground shrink-0 transition-all hover:scale-105 active:scale-95 hidden md:block ml-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div 
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-2"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)' }}
        >
          {sectors.map(sector => (
            <button
              key={sector}
              onClick={() => onSectorChange(sector)}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap h-10",
                activeSector === sector 
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105" 
                  : "text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
              )}
            >
              {sector === 'all' ? 'Tutti' : sector}
            </button>
          ))}
        </div>

        <button onClick={scrollRight} className="p-2 pill hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground shrink-0 transition-all hover:scale-105 active:scale-95 hidden md:block mr-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* View Mode Toggle (Optional) */}
      {viewMode && onViewModeChange && (
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/10 dark:border-white/10 h-14 shrink-0">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "p-3 rounded-xl transition-all h-full aspect-square flex items-center justify-center",
              viewMode === 'grid' ? "bg-white dark:bg-black/50 shadow-sm text-foreground scale-[1.05]" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-5 h-5 flex-shrink-0" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={cn(
              "p-3 rounded-xl transition-all h-full aspect-square flex items-center justify-center",
              viewMode === 'table' ? "bg-white dark:bg-black/50 shadow-sm text-foreground scale-[1.05]" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
            )}
          >
            <List className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      )}
    </div>
  )
}

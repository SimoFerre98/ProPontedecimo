import { Filter, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FilterToolbar } from '@/components/ui/FilterToolbar'

interface AthleteToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  sectors: string[]
  activeSector: string
  onSectorChange: (sector: string) => void
  viewMode: 'grid' | 'table'
  onViewModeChange: (mode: 'grid' | 'table') => void
  filterCount: number
  onToggleFilters: () => void
  onExport: () => void
  isExporting: boolean
  totalCount: number
}

export default function AthleteToolbar({
  search,
  onSearchChange,
  sectors,
  activeSector,
  onSectorChange,
  viewMode,
  onViewModeChange,
  filterCount,
  onToggleFilters,
  onExport,
  isExporting,
  totalCount,
}: Readonly<AthleteToolbarProps>) {
  return (
    <div className="flex flex-col lg:flex-row w-full items-stretch lg:items-center gap-2">
      <FilterToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Cerca per nome, cognome o codice fiscale..."
        sectors={sectors}
        activeSector={activeSector}
        onSectorChange={onSectorChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <Button
        variant="outline"
        onClick={onToggleFilters}
        className={cn(
          "pill h-14 px-5 shrink-0 gap-2 border transition-all font-black uppercase tracking-widest text-[10px] w-full lg:w-auto justify-center",
          filterCount > 0
            ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-black/10 dark:border-white/10 hover:border-primary"
        )}
      >
        <Filter className="w-4 h-4" />
        Filtri
        {filterCount > 0 && (
          <span className="bg-primary text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={onExport}
        disabled={totalCount === 0 || isExporting}
        className="pill h-14 px-5 shrink-0 gap-2 border border-black/10 dark:border-white/10 hover:border-primary transition-all font-black uppercase tracking-widest text-[10px] w-full lg:w-auto justify-center disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isExporting ? 'Esportazione...' : 'Esporta Excel'}
      </Button>
    </div>
  )
}

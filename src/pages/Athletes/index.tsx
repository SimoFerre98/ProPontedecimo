import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { UserPlus, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { type Player } from '@/services/athleteService'
import AddAthleteModal from '@/components/modals/AddAthleteModal'
import DeleteAthleteModal from '@/components/modals/DeleteAthleteModal'
import PlayerPaymentSummaryModal from '@/components/modals/PlayerPaymentSummaryModal'
import { Pagination } from '@/components/ui/Pagination'
import { QueryErrorState } from '@/components/ui/query-error-state'
import { DEFAULT_FILTERS } from './types'
import { useAthletesData } from './hooks/useAthletesData'
import AthleteFilterPanel from './components/AthleteFilterPanel'
import AthleteGridView from './components/AthleteGridView'
import AthleteTableView from './components/AthleteTableView'
import AthleteBanners from './components/AthleteBanners'
import AthleteStatsCards from './components/AthleteStatsCards'
import AthleteToolbar from './components/AthleteToolbar'

export default function Athletes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 12
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [athleteToDelete, setAthleteToDelete] = useState<Player | null>(null)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [summaryPlayer, setSummaryPlayer] = useState<Player | null>(null)
  const { role } = useAuth()
  const queryClient = useQueryClient()

  const isAdmin = role === 'president' || role === 'director'

  const {
    players,
    totalCount,
    isLoading,
    isError,
    error,
    refetch,
    overdueCount,
    missingRegistrationCount,
    availableSectors,
    filterSectors,
    filterCount,
    filters,
    setFilters,
    pendingFilters,
    setPendingFilters,
    applyFilters,
    resetFilters,
    setPending,
    handleSort,
    handleExport,
    isExporting,
  } = useAthletesData({ search, sectorFilter, page, setPage })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
            <TrendingUp className="w-4 h-4" />
            <span>Database Atleti</span>
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tight italic uppercase">
            Anagrafica <span className="text-primary not-italic">Atleti</span>
          </h1>
          <p className="text-muted-foreground font-medium border-l-2 border-primary/30 pl-4 max-w-xl">
            Gestione centralizzata di tutti gli atleti della Pontedecimo. Monitora stato, tesseramenti e scadenze.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Totale Atleti</span>
            <span className="text-2xl font-black text-foreground">{totalCount || 0}</span>
          </div>
          <Button
            onClick={() => {
              setSelectedPlayer(null)
              setIsModalOpen(true)
            }}
            className="pill bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5 transition-transform group-hover:rotate-12" />
            Nuovo Atleta
          </Button>
        </div>
      </div>

      <AthleteBanners
        overdueCount={overdueCount}
        missingRegistrationCount={missingRegistrationCount}
        onNavigateToPayments={() => navigate('/pagamenti')}
        onFilterMissingRegistration={() => {
          setFilters({
            ...DEFAULT_FILTERS,
            isActive: 'active',
            registrationStatus: 'missing'
          })
          setPendingFilters({
            ...DEFAULT_FILTERS,
            isActive: 'active',
            registrationStatus: 'missing'
          })
          setPage(0)
        }}
      />

      <AthleteStatsCards
        players={players}
        availableSectors={availableSectors}
        onNavigate={navigate}
      />

      <AthleteToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        sectors={filterSectors}
        activeSector={sectorFilter}
        onSectorChange={(sector) => {
          setSectorFilter(sector)
          setPage(0)
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterCount={filterCount}
        onToggleFilters={() => { setShowFilters(!showFilters); setPendingFilters(filters) }}
        onExport={handleExport}
        isExporting={isExporting}
        totalCount={totalCount}
      />

      <AthleteFilterPanel
        showFilters={showFilters}
        filters={filters}
        pendingFilters={pendingFilters}
        setPending={setPending}
        setPendingFilters={setPendingFilters}
        applyFilters={() => {
          applyFilters()
          setShowFilters(false)
        }}
        resetFilters={resetFilters}
        setShowFilters={setShowFilters}
        setFilters={setFilters}
        setPage={setPage}
        filterCount={filterCount}
      />

      {/* Main List Grid/Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`athlete-skel-${i}`} className="glass-card p-8 h-64 animate-pulse bg-muted/20 border-black/5 dark:border-white/10 rounded-[2rem]" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card rounded-[2rem]">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      ) : players.length === 0 ? (
        <div className="glass-card rounded-[2rem] p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 pill bg-muted/30 flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-black uppercase tracking-wider text-foreground">Nessun atleta trovato</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {filterCount > 0 ? 'Prova ad azzerare i filtri o cambiare i criteri di ricerca.' : 'Aggiungi il primo atleta con il pulsante in alto.'}
          </p>
          {filterCount > 0 && (
            <Button onClick={resetFilters} variant="outline" className="pill mt-2 h-10 px-6 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10">
              Azzera Filtri
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <AthleteTableView
          players={players}
          isAdmin={isAdmin}
          filters={filters}
          onSort={handleSort}
          onOpenDetails={(player) => {
            setSelectedPlayer(player)
            setIsModalOpen(true)
          }}
          onOpenSummary={(player) => {
            setSummaryPlayer(player)
            setIsSummaryOpen(true)
          }}
          onDelete={(player) => setAthleteToDelete(player)}
        />
      ) : (
        <AthleteGridView
          players={players}
          isAdmin={isAdmin}
          onOpenDetails={(player) => {
            setSelectedPlayer(player)
            setIsModalOpen(true)
          }}
          onOpenSummary={(player) => {
            setSummaryPlayer(player)
            setIsSummaryOpen(true)
          }}
          onDelete={(player) => setAthleteToDelete(player)}
        />
      )}

      <Pagination
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        className="mt-8"
      />

      <AddAthleteModal
        isOpen={isModalOpen}
        player={selectedPlayer}
        availableSectors={availableSectors}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPlayer(null)
        }}
        onSuccess={() => {
          setIsModalOpen(false)
          setSelectedPlayer(null)
          queryClient.invalidateQueries({ queryKey: ['players'] })
          queryClient.invalidateQueries({ queryKey: ['missingRegistrationCount'] })
        }}
      />

      <DeleteAthleteModal
        isOpen={!!athleteToDelete}
        athlete={athleteToDelete}
        onClose={() => setAthleteToDelete(null)}
        onSuccess={() => {
          setAthleteToDelete(null)
          queryClient.invalidateQueries({ queryKey: ['players'] })
          queryClient.invalidateQueries({ queryKey: ['missingRegistrationCount'] })
        }}
      />

      <PlayerPaymentSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => {
          setIsSummaryOpen(false)
          setSummaryPlayer(null)
        }}
        playerId={summaryPlayer?.id || null}
        playerName={summaryPlayer ? `${summaryPlayer.last_name} ${summaryPlayer.first_name}` : ''}
        playerTeamSector={summaryPlayer?.team_sector || null}
      />
    </div>
  )
}

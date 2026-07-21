import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { athleteService } from '@/services/athleteService'
import { paymentService } from '@/services/paymentService'
import { exportToXlsx } from '@/lib/xlsxExport'
import { useAppStore } from '@/store/useAppStore'
import { type FiltersState, DEFAULT_FILTERS, activeFilterCount } from '../types'

export function useAthletesData(params: {
  search: string
  sectorFilter: string
  page: number
  setPage: (page: number) => void
}) {
  const { search, sectorFilter, page, setPage } = params

  const pageSize = 12

  const { selectedSeasonId } = useAppStore()

  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FiltersState>(DEFAULT_FILTERS)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const dataToExport = await athleteService.getPlayersForExport(
        search,
        sectorFilter,
        filters,
        selectedSeasonId
      )

      const mappedRows = dataToExport.map(p => ({
        'Cognome': p.last_name || '',
        'Nome': p.first_name || '',
        'Data di Nascita': p.birth_date || '',
        'Luogo di Nascita': p.birth_place || '',
        'Codice Fiscale': p.tax_code || '',
        'Indirizzo': p.address_street || '',
        'Città': p.address_city || '',
        'CAP': p.address_zip || '',
        'Telefono': p.phone_player || p.phone_home || '',
        'Email': p.email || '',
        'Genitore 1 (Nome)': p.parent1_name || '',
        'Genitore 1 (Telefono)': p.parent1_phone || '',
        'Genitore 1 (CF)': p.parent1_tax_code || '',
        'Genitore 2 (Nome)': p.parent2_name || '',
        'Genitore 2 (Telefono)': p.parent2_phone || '',
        'Genitore 2 (CF)': p.parent2_tax_code || '',
        'Settore': p.team_sector || '',
        'Matricola FIGC': p.figc_registration || '',
        'Tesserato': p.is_registered ? 'Sì' : 'No',
        'Scadenza Visita Medica': p.medical_expiry || '',
        'Stato': p.is_active ? 'Attivo' : 'Non Attivo'
      }))

      exportToXlsx(mappedRows, 'esportazione_atleti.xlsx', 'Atleti')
    } catch (err) {
      console.error("Errore durante l'esportazione degli atleti:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['players', search, sectorFilter, page, filters, selectedSeasonId],
    queryFn: () => athleteService.getPlayers(search, sectorFilter, page, pageSize, filters, selectedSeasonId),
    enabled: !!selectedSeasonId,
  })

  const players = data?.data || []
  const totalCount = data?.count || 0

  const { data: overduePaymentsCount } = useQuery({
    queryKey: ['overduePaymentsCount'],
    queryFn: () => paymentService.getOverdueCount(),
  })

  const overdueCount = overduePaymentsCount || 0

  const { data: missingRegistrationCountData } = useQuery({
    queryKey: ['missingRegistrationCount', selectedSeasonId],
    queryFn: () => athleteService.getMissingRegistrationCount(selectedSeasonId),
    enabled: !!selectedSeasonId,
  })

  const missingRegistrationCount = missingRegistrationCountData || 0

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors', selectedSeasonId],
    queryFn: () => athleteService.getUniqueSectors(selectedSeasonId || undefined),
    enabled: !!selectedSeasonId,
  })

  const availableSectors = sectorsData || []
  const filterSectors = ['all', ...availableSectors]

  const filterCount = activeFilterCount(filters)

  function applyFilters() {
    setFilters(pendingFilters)
    setPage(0)
  }

  function resetFilters() {
    setPendingFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setPage(0)
  }

  function setPending<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setPendingFilters(prev => ({ ...prev, [key]: value }))
  }

  function handleSort(field: FiltersState['sortBy']) {
    const isNew = filters.sortBy !== field
    const newDir = isNew ? 'asc' : (filters.sortDir === 'asc' ? 'desc' : 'asc')

    setFilters(f => ({ ...f, sortBy: field, sortDir: newDir }))
    setPendingFilters(f => ({ ...f, sortBy: field, sortDir: newDir }))
    setPage(0)
  }

  return {
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
  }
}

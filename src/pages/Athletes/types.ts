import type { AthletesFilters } from '@/types/filters'

export type FiltersState = AthletesFilters

export const DEFAULT_FILTERS: FiltersState = {
  isActive: 'all',
  isRegistered: 'all',
  medicalStatus: 'all',
  privacyStatus: 'all',
  registrationStatus: 'all',
  sortBy: 'last_name',
  sortDir: 'asc',
}

export function activeFilterCount(f: FiltersState) {
  let c = 0
  if (f.isActive !== 'all') c++
  if (f.isRegistered !== 'all') c++
  if (f.medicalStatus !== 'all') c++
  if (f.privacyStatus !== 'all') c++
  if (f.registrationStatus !== 'all') c++
  if (f.sortBy !== 'last_name' || f.sortDir !== 'asc') c++
  return c
}

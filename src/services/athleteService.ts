import { supabase } from '@/lib/supabase'
import type { AthletesFilters } from '@/types/filters'

export type Player = {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
  // Anagrafica
  birth_date: string | null
  birth_place: string | null
  citizenship: string | null
  tax_code: string | null
  // Residenza
  address_street: string | null
  address_locality: string | null
  address_city: string | null
  address_zip: string | null
  // Contatti
  phone_home: string | null
  phone_player: string | null
  email: string | null
  // Genitore 1 (Papà)
  parent1_name: string | null
  parent1_phone: string | null
  parent1_tax_code: string | null
  // Genitore 2 (Mamma)
  parent2_name: string | null
  parent2_phone: string | null
  parent2_tax_code: string | null
  // Sport / Amministrazione
  figc_registration: string | null
  medical_expiry: string | null
  notes: string | null
  privacy_accepted: boolean | null
  is_active: boolean       // true = In Rosa, false = Ritirato
  is_registered: boolean   // true = Tesserato FIGC, false = Non tesserato
  created_at?: string
  updated_at?: string
}

function buildPlayersQuery(
  search?: string,
  sector?: string,
  filters?: AthletesFilters,
  seasonId?: string | null,
  selectOptions?: { count: 'exact' }
) {
  const sortField = filters?.sortBy ?? 'last_name'
  const sortAsc = (filters?.sortDir ?? 'asc') === 'asc'

  let query = supabase
    .from('players')
    .select('*', selectOptions)
    .order(sortField, { ascending: sortAsc })

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,tax_code.ilike.%${search}%`)
  }
  
  if (sector && sector !== 'all') {
    query = query.eq('team_sector', sector)
  }

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  if (filters?.isActive === 'active') query = query.eq('is_active', true)
  if (filters?.isActive === 'inactive') query = query.eq('is_active', false)
  if (filters?.isRegistered === 'yes') query = query.eq('is_registered', true)
  if (filters?.isRegistered === 'no') query = query.eq('is_registered', false)
  if (filters?.medicalStatus === 'expired') {
    query = query.not('medical_expiry', 'is', null).lt('medical_expiry', new Date().toISOString().split('T')[0])
  } else if (filters?.medicalStatus === 'valid') {
    query = query.not('medical_expiry', 'is', null).gte('medical_expiry', new Date().toISOString().split('T')[0])
  } else if (filters?.medicalStatus === 'missing') {
    query = query.is('medical_expiry', null)
  }

  if (filters?.privacyStatus === 'accepted') query = query.eq('privacy_accepted', true)
  if (filters?.privacyStatus === 'missing') query = query.or('privacy_accepted.eq.false,privacy_accepted.is.null')

  if (filters?.registrationStatus === 'missing') {
    query = query.is('figc_registration', null)
  }

  return query
}

export const athleteService = {
  async getPlayers(
    search?: string,
    sector?: string,
    page = 0,
    pageSize = 12,
    filters?: AthletesFilters,
    seasonId?: string | null
  ) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const query = buildPlayersQuery(search, sector, filters, seasonId, { count: 'exact' })
      .range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as Player[], count: count || 0 }
  },

  async getPlayersForExport(
    search?: string,
    sector?: string,
    filters?: AthletesFilters,
    seasonId?: string | null
  ) {
    const query = buildPlayersQuery(search, sector, filters, seasonId)
    const { data, error } = await query
    if (error) throw error
    return data as Player[]
  },

  async getUniqueSectors(seasonId?: string) {
    let query = supabase
      .from('players')
      .select('team_sector')

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw error
    const sectors = Array.from(new Set(data.map(p => p.team_sector).filter(Boolean))) as string[]
    return sectors.sort()
  },

  async createPlayer(player: Omit<Player, 'id' | 'created_at'>) {
    const playerToInsert = { ...player } as Omit<Player, 'id' | 'created_at'> & { season_id?: string }
    if (!playerToInsert.season_id) {
      const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).single()
      if (season) {
        playerToInsert.season_id = season.id
      }
    }

    const { data, error } = await supabase
      .from('players')
      .insert(playerToInsert)
      .select()
      .single()

    if (error) throw error
    return data as Player
  },

  async updatePlayer(id: string, updates: Partial<Player>) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Player
  },

  async deletePlayer(id: string) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async deleteAthlete(id: string) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async hasUnfinishedPayments(id: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('player_id', id)
      .in('status', ['pending', 'overdue'])
      .limit(1)

    if (error) throw error
    return data && data.length > 0
  },

  async getMissingRegistrationCount(seasonId?: string | null) {
    let query = supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('figc_registration', null)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { count, error } = await query
    if (error) throw error
    return count || 0
  }
}

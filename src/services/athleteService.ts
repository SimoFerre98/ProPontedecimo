import { supabase } from '@/lib/supabase'

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
  is_active: boolean
  created_at?: string
}

export const athleteService = {
  async getPlayers(search?: string, sector?: string, page = 0, pageSize = 12) {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('players')
      .select('*', { count: 'exact' })
      .order('last_name', { ascending: true })
      .range(from, to)

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
    
    if (sector && sector !== 'all') {
      query = query.eq('team_sector', sector)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as Player[], count: count || 0 }
  },

  async getUniqueSectors() {
    const { data, error } = await supabase
      .from('players')
      .select('team_sector')

    if (error) throw error
    const sectors = Array.from(new Set(data.map(p => p.team_sector).filter(Boolean))) as string[]
    return sectors.sort()
  },

  async createPlayer(player: Omit<Player, 'id' | 'created_at'>) {
    const playerToInsert = { ...player } as any
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
  }
}

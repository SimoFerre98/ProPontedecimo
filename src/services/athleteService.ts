import { supabase } from '@/lib/supabase'

export type Player = {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
  birth_date: string | null
  phone_parent: string | null
  phone_player: string | null
  email: string | null
  medical_expiry: string | null
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

  async createPlayer(player: Omit<Player, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('players')
      .insert(player)
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

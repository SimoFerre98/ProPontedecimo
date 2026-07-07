import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Season = Database['public']['Tables']['seasons']['Row']

export const seasonService = {
  async getSeasons() {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw error
    return data as Season[]
  },

  getActiveSeason(seasons: Season[]): Season | undefined {
    return seasons.find(s => s.is_active)
  },

  async createSeasonFromWizard(
    name: string,
    startDate: string,
    endDate: string,
    players: { player_id: string; team_sector: string | null }[]
  ): Promise<{ season_id: string; imported_count: number }> {
    const { data, error } = await supabase.rpc('create_season_from_wizard', {
      p_name: name,
      p_start_date: startDate,
      p_end_date: endDate,
      p_players: players
    })

    if (error) throw error
    return data as { season_id: string; imported_count: number }
  }
}
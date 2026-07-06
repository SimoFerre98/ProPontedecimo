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
  }
}
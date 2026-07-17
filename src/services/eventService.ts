import { supabase } from '@/lib/supabase'

export type FootballEventType = 'training' | 'home_match' | 'away_match' | 'meeting' | 'generic'

export interface FootballEvent {
  id: string
  title: string
  description: string | null
  event_type: FootballEventType
  start_date: string
  meetup_time: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  opponent?: string | null
  team_sector?: string | null
  // Sola lettura da questo servizio generico: valorizzato solo dal flusso di
  // pubblicazione delle convocazioni (callUpService.ts), mai scritto qui.
  call_up_published_at?: string | null
}

export const eventService = {
  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) throw error
    return data as FootballEvent[]
  },

  async createEvent(event: Omit<FootballEvent, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data as FootballEvent
  },

  async updateEvent(id: string, updates: Partial<Omit<FootballEvent, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as FootballEvent
  },

  async deleteEvent(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

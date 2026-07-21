import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type EventRow = Database['public']['Tables']['events']['Row']
export type CallUp = Database['public']['Tables']['call_ups']['Row']

export const callUpService = {
  /**
   * Retrieves upcoming match events (home or away), optionally filtered by team sector.
   */
  async getUpcomingMatchEvents(sector?: string): Promise<EventRow[]> {
    let query = supabase
      .from('events')
      .select('*')
      .in('event_type', ['home_match', 'away_match'])
      .gte('start_date', new Date().toISOString())

    if (sector && sector !== 'all') {
      query = query.eq('team_sector', sector)
    }

    const { data, error } = await query.order('start_date', { ascending: true })

    if (error) throw error
    return data as EventRow[]
  },

  /**
   * Retrieves the call-up records for a given event.
   */
  async getCallUpsForEvent(eventId: string): Promise<CallUp[]> {
    const { data, error } = await supabase.from('call_ups').select('*').eq('event_id', eventId)

    if (error) throw error
    return data as CallUp[]
  },

  /**
   * Adds or removes a player from an event's call-up list.
   */
  async toggleCallUp(
    eventId: string,
    playerId: string,
    isCalledUp: boolean,
    createdBy?: string
  ): Promise<void> {
    if (isCalledUp) {
      const { error } = await supabase
        .from('call_ups')
        .insert({ event_id: eventId, player_id: playerId, created_by: createdBy ?? null })

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('call_ups')
        .delete()
        .eq('event_id', eventId)
        .eq('player_id', playerId)

      if (error) throw error
    }
  },

  /**
   * Publishes the call-up list for an event.
   */
  async publishCallUps(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .update({ call_up_published_at: new Date().toISOString() })
      .eq('id', eventId)

    if (error) throw error
  },

  /**
   * Unpublishes the call-up list for an event.
   */
  async unpublishCallUps(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .update({ call_up_published_at: null })
      .eq('id', eventId)

    if (error) throw error
  },

  /**
   * Retrieves the next call-up details for the logged-in player.
   */
  async getMyNextCallUp(): Promise<Database['public']['Functions']['get_my_next_call_up']['Returns'][number] | null> {
    const { data, error } = await supabase.rpc('get_my_next_call_up')

    if (error) throw error
    return data && data.length > 0 ? data[0] : null
  }
}


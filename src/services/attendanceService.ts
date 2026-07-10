import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type AttendanceStatus = Database['public']['Enums']['attendance_status']
export type TrainingType = Database['public']['Enums']['training_type']

export type PlayerRosterItem = {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
  figc_registration: string | null
}

export type AttendanceRecord = Database['public']['Tables']['attendance']['Row']

export const attendanceService = {
  /**
   * Retrieves all active players for a given season, optionally filtered by team sector.
   * RLS automatically limits the results to the coach's assigned teams/sectors.
   */
  async getRosterForAttendance(seasonId: string, sector?: string): Promise<PlayerRosterItem[]> {
    let query = supabase
      .from('players')
      .select('id, first_name, last_name, team_sector, figc_registration')
      .eq('season_id', seasonId)
      .eq('is_active', true)

    if (sector && sector !== 'all') {
      query = query.eq('team_sector', sector)
    }

    const { data, error } = await query.order('last_name').order('first_name')

    if (error) throw error
    return data as PlayerRosterItem[]
  },

  /**
   * Retrieves attendance records for a list of players on a specific date.
   */
  async getAttendanceForDate(playerIds: string[], date: string): Promise<AttendanceRecord[]> {
    if (playerIds.length === 0) return []

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .in('player_id', playerIds)
      .eq('session_date', date)
      .eq('type', 'training')

    if (error) throw error
    return data as AttendanceRecord[]
  },

  /**
   * Sets or updates the attendance status for a player on a specific date.
   */
  async setAttendanceStatus(
    playerId: string,
    date: string,
    status: AttendanceStatus,
    createdBy?: string
  ): Promise<AttendanceRecord> {
    const payload: Database['public']['Tables']['attendance']['Insert'] = {
      player_id: playerId,
      session_date: date,
      status,
      type: 'training' as TrainingType
    }

    if (createdBy) {
      payload.created_by = createdBy
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'player_id,session_date,type' })
      .select()
      .single()

    if (error) throw error
    return data as AttendanceRecord
  }
}

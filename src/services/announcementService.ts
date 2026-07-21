import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Announcement = Database['public']['Tables']['announcements']['Row']
export type AnnouncementSeverity = Database['public']['Enums']['announcement_severity']

export interface CreateAnnouncementInput {
  severity: AnnouncementSeverity
  title: string
  body: string
  teamSector: string | null
  createdBy: string
}

export const announcementService = {
  /**
   * Retrieves the announcement history/feed visible to the logged-in user
   * (RLS scopes the result by role: full history for staff, own sectors
   * + club-wide for coach/player/parent).
   */
  async listAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Announcement[]
  },

  /**
   * Creates a new announcement. RLS enforces sector scoping: a coach can
   * only target one of their own sectors, president/director can target
   * any sector or the whole club (teamSector: null).
   */
  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        severity: input.severity,
        title: input.title,
        body: input.body,
        team_sector: input.teamSector,
        created_by: input.createdBy
      })
      .select()
      .single()

    if (error) throw error
    return data as Announcement
  },

  /**
   * Retrieves the sectors the logged-in coach may target, via the
   * self-select RLS policy on coach_teams (coach_teams_select_self).
   */
  async getMyCoachSectors(): Promise<string[]> {
    const { data, error } = await supabase.from('coach_teams').select('team_sector')

    if (error) throw error
    return (data ?? []).map(row => row.team_sector)
  },

  /**
   * Retrieves every active team sector (for president/director, who can
   * target any sector). Same source query as SendEmailModal's sector list.
   */
  async listAllSectors(): Promise<string[]> {
    const { data, error } = await supabase.from('players').select('team_sector').eq('is_active', true)

    if (error) throw error
    const unique = Array.from(new Set((data ?? []).map(p => p.team_sector).filter(Boolean))) as string[]
    return unique.sort()
  }
}

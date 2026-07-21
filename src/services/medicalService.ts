import { supabase } from '@/lib/supabase'
import { isPast } from 'date-fns/isPast'
import { differenceInDays } from 'date-fns/differenceInDays'

export type VisitStatus = 'valid' | 'expiring' | 'expired' | 'missing'

export interface MedicalVisitRecord {
  id: string
  first_name: string
  last_name: string
  team_sector: string | null
  medical_expiry: string | null
}

export interface SquadRosterMember {
  id: string
  first_name: string
  last_name: string
  birth_date: string | null
  figc_registration: string | null
  team_sector: string | null
  medical_expiry: string | null
}

export const medicalService = {
  async getMedicalVisits(
    search?: string, 
    sector?: string, 
    page = 0, 
    pageSize = 15,
    sortBy: 'last_name' | 'first_name' | 'team_sector' | 'medical_expiry' = 'last_name',
    sortDir: 'asc' | 'desc' = 'asc'
  ) {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('players')
      .select('id, first_name, last_name, team_sector, medical_expiry', { count: 'exact' })
      .eq('is_active', true)
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(from, to)

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    if (sector && sector !== 'all') {
      query = query.eq('team_sector', sector)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as MedicalVisitRecord[], count: count || 0 }
  },

  calculateStatus(expiryDate: string | null): VisitStatus {
    if (!expiryDate) return 'missing'
    const date = new Date(expiryDate)
    if (isPast(date)) return 'expired'
    const days = differenceInDays(date, new Date())
    if (days <= 30) return 'expiring'
    return 'valid'
  },

  async getMedicalStats(search?: string, sector?: string) {
    let query = supabase
      .from('players')
      .select('medical_expiry')
      .eq('is_active', true)

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
    if (sector && sector !== 'all') {
      query = query.eq('team_sector', sector)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).reduce(
      (acc, visit) => {
        const status = medicalService.calculateStatus(visit.medical_expiry)
        if (status === 'expired' || status === 'missing') acc.expired++
        else if (status === 'expiring') acc.expiring++
        else acc.valid++
        return acc
      },
      { expired: 0, expiring: 0, valid: 0 }
    )
  },

  async updateMedicalExpiry(playerId: string, expiryDate: string | null) {
    const { error } = await supabase
      .from('players')
      .update({ medical_expiry: expiryDate })
      .eq('id', playerId)

    if (error) throw error
  },

  async getSquadRoster(seasonId: string, sector?: string): Promise<SquadRosterMember[]> {
    let query = supabase
      .from('players')
      .select('id, first_name, last_name, birth_date, figc_registration, team_sector, medical_expiry')
      .eq('season_id', seasonId)
      .eq('is_active', true)

    if (sector && sector !== 'all') {
      query = query.eq('team_sector', sector)
    }

    const { data, error } = await query.order('last_name').order('first_name')
    if (error) throw error
    return data as SquadRosterMember[]
  }
}

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

export const medicalService = {
  async getMedicalVisits(search?: string, sector?: string, page = 0, pageSize = 15) {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('players')
      .select('id, first_name, last_name, team_sector, medical_expiry', { count: 'exact' })
      .eq('is_active', true)
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
    return { data: data as MedicalVisitRecord[], count: count || 0 }
  },

  calculateStatus(expiryDate: string | null): VisitStatus {
    if (!expiryDate) return 'missing'
    const date = new Date(expiryDate)
    if (isPast(date)) return 'expired'
    const days = differenceInDays(date, new Date())
    if (days <= 30) return 'expiring'
    return 'valid'
  }
}

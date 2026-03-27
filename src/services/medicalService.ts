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
  async getMedicalVisits() {
    const { data, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, team_sector, medical_expiry')
      .eq('is_active', true)
      .order('last_name', { ascending: true })

    if (error) throw error
    return data as MedicalVisitRecord[]
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

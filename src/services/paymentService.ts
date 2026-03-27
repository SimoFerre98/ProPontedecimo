import { supabase } from '@/lib/supabase'

export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export interface PaymentReference {
  id: string
  installment_no: number
  amount_eur: number | null
  receipt_number: string | null
  receipt_date: string | null
  status: PaymentStatus
  notes: string | null
  created_at: string
  player: {
    first_name: string
    last_name: string
    team_sector: string | null
  }
}

export const paymentService = {
  async getPayments(status?: PaymentStatus | 'all') {
    let query = supabase
      .from('payments')
      .select(`
        *,
        player:players(first_name, last_name, team_sector)
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data as unknown as PaymentReference[]
  },

  async updateStatus(id: string, status: PaymentStatus) {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', id)
    
    if (error) throw error
  }
}

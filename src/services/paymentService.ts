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
  async getPayments(search?: string, status?: PaymentStatus | 'all', page = 0, pageSize = 15) {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('payments')
      .select(`
        *,
        player:players!inner(first_name, last_name, team_sector)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`, { foreignTable: 'players' })
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as unknown as PaymentReference[], count: count || 0 }
  },

  async updateStatus(id: string, status: PaymentStatus) {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', id)
    
    if (error) throw error
  }
}

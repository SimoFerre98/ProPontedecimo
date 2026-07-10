import { supabase } from '@/lib/supabase'

export type PaymentStatus = 'pending' | 'paid' | 'overdue'
export type PaymentPlan = 'annual' | 'installments' | 'carried_over'
export type PaymentMethod = 'satispay' | 'contanti' | 'pos' | 'iban'

export interface PaymentReference {
  id: string
  player_id: string
  installment_no: number         // 1 = unica/prima rata, 2 = seconda rata
  plan: PaymentPlan              // 'annual' | 'installments'
  due_date: string | null        // Scadenza: 15 set o 15 gen
  amount_eur: number | null
  paid_amount_eur: number | null // Quanto è stato effettivamente pagato
  receipt_number: string | null
  receipt_date: string | null
  payment_method: PaymentMethod | null
  status: PaymentStatus
  notes: string | null
  created_at: string
  player: {
    first_name: string
    last_name: string
    team_sector: string | null
    birth_date: string | null
  }
}

export interface PaymentUpsertPayload {
  player_id: string
  installment_no: number
  plan: PaymentPlan
  due_date?: string | null
  amount_eur?: number | null
  paid_amount_eur?: number | null
  receipt_number?: string | null
  receipt_date?: string | null
  payment_method?: PaymentMethod | null
  status?: PaymentStatus
  notes?: string | null
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'satispay', label: 'Satispay', icon: '📱' },
  { value: 'contanti', label: 'Contanti', icon: '💵' },
  { value: 'pos', label: 'POS', icon: '💳' },
  { value: 'iban', label: 'Bonifico IBAN', icon: '🏦' },
]

// Scadenze fisse delle rate
export const INSTALLMENT_DUE_DATES = {
  1: `${new Date().getFullYear()}-09-15`, // 15 settembre
  2: `${new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0)}-01-15`, // 15 gennaio (anno successivo se siamo già dopo settembre)
}

function buildPaymentsQuery(
  search?: string,
  status?: PaymentStatus | 'all',
  sortBy: 'due_date' | 'player_name' | 'amount' = 'due_date',
  sortDir: 'asc' | 'desc' = 'asc',
  seasonId?: string | null,
  selectOptions?: { count: 'exact' }
) {
  let query = supabase
    .from('payments')
    .select(`
      *,
      player:players!inner(first_name, last_name, team_sector, birth_date)
    `, selectOptions)

  if (status && status !== 'all') {
    if (status === 'overdue') {
      const todayStr = new Date().toISOString().split('T')[0]
      query = query.eq('status', 'pending').lt('due_date', todayStr)
    } else if (status === 'pending') {
      const todayStr = new Date().toISOString().split('T')[0]
      query = query.eq('status', 'pending').or(`due_date.gte.${todayStr},due_date.is.null`)
    } else {
      query = query.eq('status', status)
    }
  }

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`, { foreignTable: 'players' })
  }

  if (sortBy === 'player_name') {
    // Fallback: Supabase JS order by on foreign table requires specific setup
    query = query.order('due_date', { ascending: sortDir === 'asc' })
  } else if (sortBy === 'amount') {
    query = query.order('amount_eur', { ascending: sortDir === 'asc' })
  } else {
    query = query.order(sortBy, { ascending: sortDir === 'asc' })
  }

  return query
}

export const paymentService = {
  async getPayments(
    search?: string,
    status?: PaymentStatus | 'all',
    page = 0,
    pageSize = 15,
    sortBy: 'due_date' | 'player_name' | 'amount' = 'due_date',
    sortDir: 'asc' | 'desc' = 'asc',
    seasonId?: string | null
  ) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const query = buildPaymentsQuery(search, status, sortBy, sortDir, seasonId, { count: 'exact' })
      .range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    const todayStr = new Date().toISOString().split('T')[0]
    const mapped = (data || []).map((p: any) => {
      if (p.status === 'pending' && p.due_date && p.due_date < todayStr) {
        return { ...p, status: 'overdue' as PaymentStatus }
      }
      return p
    })

    return { data: mapped as unknown as PaymentReference[], count: count || 0 }
  },

  async getPaymentsForExport(
    search?: string,
    status?: PaymentStatus | 'all',
    sortBy: 'due_date' | 'player_name' | 'amount' = 'due_date',
    sortDir: 'asc' | 'desc' = 'asc',
    seasonId?: string | null
  ) {
    const query = buildPaymentsQuery(search, status, sortBy, sortDir, seasonId)

    const { data, error } = await query
    if (error) throw error

    const todayStr = new Date().toISOString().split('T')[0]
    const mapped = (data || []).map((p: any) => {
      if (p.status === 'pending' && p.due_date && p.due_date < todayStr) {
        return { ...p, status: 'overdue' as PaymentStatus }
      }
      return p
    })

    return mapped as unknown as PaymentReference[]
  },

  // Recupera tutti i pagamenti di un singolo atleta
  async getPaymentsByPlayer(playerId: string, seasonId?: string | null) {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('player_id', playerId)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query.order('installment_no', { ascending: true })
    if (error) throw error

    const todayStr = new Date().toISOString().split('T')[0]
    const mapped = (data || []).map((p: any) => {
      if (p.status === 'pending' && p.due_date && p.due_date < todayStr) {
        return { ...p, status: 'overdue' as PaymentStatus }
      }
      return p
    })

    return mapped as PaymentReference[]
  },

  // Conta atleti con pagamenti in sospeso/scaduti (per banner Athletes)
  async getOverdueCount() {
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'overdue'])
      .lt('due_date', fifteenDaysAgo.toISOString().split('T')[0])
    
    if (error) throw error
    return count || 0
  },

  // Crea o aggiorna un pagamento
  async upsertPayment(payload: PaymentUpsertPayload) {
    // Cerca se esiste già per quell'atleta + rata
    const { data: existing, error: findError } = await supabase
      .from('payments')
      .select('id')
      .eq('player_id', payload.player_id)
      .eq('installment_no', payload.installment_no)
      .maybeSingle()

    // Ignora errore PGRST116 (no rows) — è il caso normale per nuovi atleti
    if (findError && findError.code !== 'PGRST116') throw findError

    if (existing) {
      const { error } = await supabase
        .from('payments')
        .update(payload)
        .eq('id', existing.id)
      if (error) throw error
      return existing.id
    } else {
      const { data, error } = await supabase
        .from('payments')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
  },

  // Registra un pagamento ricevuto (segna come pagato)
  async recordPayment(id: string, payload: {
    paid_amount_eur: number
    receipt_number: string
    receipt_date: string
    payment_method: PaymentMethod
    notes?: string
  }) {
    const { error } = await supabase
      .from('payments')
      .update({
        ...payload,
        status: 'paid',
      })
      .eq('id', id)
    if (error) throw error
  },

  // Aggiorna solo lo stato
  async updateStatus(id: string, status: PaymentStatus) {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', id)
    if (error) throw error
  },

  // Aggiorna importo e dati generali
  async updatePayment(id: string, payload: Partial<PaymentUpsertPayload>) {
    const { error } = await supabase
      .from('payments')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  },

  // Recupera pagamenti scaduti di 15+ giorni (per notifiche)
  async getOverduePayments() {
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    const dateStr = fifteenDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id, installment_no, due_date, amount_eur, status,
        player:players!inner(first_name, last_name)
      `)
      .in('status', ['pending', 'overdue'])
      .lt('due_date', dateStr)

    if (error) throw error

    const todayStr = new Date().toISOString().split('T')[0]
    const mapped = (data || []).map((p: any) => {
      if (p.status === 'pending' && p.due_date && p.due_date < todayStr) {
        return { ...p, status: 'overdue' as PaymentStatus }
      }
      return p
    })

    return mapped as unknown as Pick<PaymentReference, 'id' | 'installment_no' | 'due_date' | 'amount_eur' | 'status' | 'player'>[]
  },

  // Salva o sovrascrive un piano rate per un atleta (tramite RPC create_payment_plan)
  async createPaymentPlan(playerId: string, seasonId: string, totalAmount: number, installments: { amount_eur: number; due_date: string }[]) {
    const { error } = await supabase.rpc('create_payment_plan', {
      p_player_id: playerId,
      p_season_id: seasonId,
      p_total_amount: totalAmount,
      p_installments: installments
    })
    if (error) throw error
  }
}

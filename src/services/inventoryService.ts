import { supabase } from '@/lib/supabase'

export interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  min_stock: number
  status: 'ok' | 'low' | 'out'
  last_update: string
}

export const inventoryService = {
  async getInventory(search?: string, category?: string, page = 0, pageSize = 10) {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('inventory_items')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)
    
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as InventoryItem[], count: count || 0 }
  },

  async addItem(item: Omit<InventoryItem, 'id' | 'last_update' | 'status'>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([item])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateQuantity(id: string, quantity: number) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity, last_update: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }
}

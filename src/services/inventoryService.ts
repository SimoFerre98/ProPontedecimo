import { supabase } from '@/lib/supabase'

export type InventoryCategory = 'kit' | 'equipment' | 'trophy' | 'other'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  quantity: number
  notes: string | null
  updated_at: string
  created_at?: string
}

export const inventoryService = {
  async getItems() {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data as InventoryItem[]
  },

  async createItem(item: Omit<InventoryItem, 'id' | 'updated_at' | 'created_at'>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({ ...item, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return data as InventoryItem
  },

  async updateItem(id: string, updates: Partial<InventoryItem>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as InventoryItem
  },

  async updateQuantity(id: string, newQuantity: number) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ 
        quantity: Math.max(0, newQuantity), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteItem(id: string) {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

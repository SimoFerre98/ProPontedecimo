import { supabase } from '@/lib/supabase'

export type TaskStatus = 'created' | 'ready' | 'done' | 'archive' | 'todo' | 'in_progress'

export interface StaffTask {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: TaskStatus
  due_date: string | null
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export const staffService = {
  async getTasks() {
    const { data, error } = await supabase
      .from('staff_tasks')
      .select(`
        *,
        assignee:profiles!staff_tasks_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as StaffTask[]
  },

  async createTask(task: Omit<StaffTask, 'id' | 'created_at' | 'updated_at' | 'assignee'>) {
    const { data, error } = await supabase
      .from('staff_tasks')
      .insert(task)
      .select()
      .single()

    if (error) throw error
    return data as StaffTask
  },

  async updateTask(id: string, updates: Partial<Omit<StaffTask, 'id' | 'created_at' | 'assignee'>>) {
    const { data, error } = await supabase
      .from('staff_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as StaffTask
  },

  async updateTaskStatus(id: string, status: TaskStatus) {
    const { error } = await supabase
      .from('staff_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('staff_tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['president', 'director', 'coach'])
      .order('full_name', { ascending: true })

    if (error) throw error
    return data
  }
}

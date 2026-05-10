import { medicalService } from './medicalService'
import { staffService, type StaffTask } from './staffService'
import { eachDayOfInterval, parseISO, isValid } from 'date-fns'

export type CalendarEventType = 'task' | 'medical'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string // ISO date
  type: CalendarEventType
  status?: string
  originalData: any
}

export const calendarService = {
  async getEventsForMonth(_month: Date): Promise<CalendarEvent[]> {
    // 1. Get Tasks
    const tasks = await staffService.getTasks()
    
    // 2. Get Medical Expiries
    const { data: athletes } = await medicalService.getMedicalVisits('', 'all', 0, 1000)

    const events: CalendarEvent[] = []

    // Map Tasks to events (handling multi-day and time)
    tasks.forEach((task: StaffTask) => {
      if (!task.start_date) return

      const start = parseISO(task.start_date)
      if (!isValid(start)) return

      const end = task.end_date || task.due_date ? parseISO(task.end_date || task.due_date!) : null
      
      const timeStr = task.start_date.includes('T') 
        ? task.start_date.split('T')[1].substring(0, 5)
        : null

      const displayTitle = timeStr ? `${timeStr} - ${task.title}` : task.title

      if (end && isValid(end) && end > start) {
        // Multi-day task
        try {
          const days = eachDayOfInterval({ start, end })
          days.forEach((day, index) => {
            events.push({
              id: `task-${task.id}-${index}`,
              title: index === 0 ? `Task: ${displayTitle}` : `Cont. ${task.title}`,
              description: task.description ?? undefined,
              date: day.toISOString(),
              type: 'task',
              status: task.status,
              originalData: task
            })
          })
        } catch (e) {
          // Fallback to single day if interval is invalid
          events.push({
            id: `task-${task.id}`,
            title: `Task: ${displayTitle}`,
            description: task.description ?? undefined,
            date: task.start_date,
            type: 'task',
            status: task.status,
            originalData: task
          })
        }
      } else {
        // Single day task
        events.push({
          id: `task-${task.id}`,
          title: `Task: ${displayTitle}`,
          description: task.description ?? undefined,
          date: task.start_date,
          type: 'task',
          status: task.status,
          originalData: task
        })
      }
    })

    athletes.forEach(athlete => {
      if (athlete.medical_expiry) {
        events.push({
          id: `med-${athlete.id}`,
          title: `Scadenza Visita: ${athlete.last_name}`,
          description: `Visita medica di ${athlete.first_name} ${athlete.last_name} in scadenza`,
          date: athlete.medical_expiry,
          type: 'medical',
          originalData: athlete
        })
      }
    })

    return events
  }
}

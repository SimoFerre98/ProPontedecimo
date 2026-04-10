import { medicalService } from './medicalService'
import { staffService, type StaffTask } from './staffService'

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
  async getEventsForMonth(month: Date): Promise<CalendarEvent[]> {
    // 1. Get Tasks
    const tasks = await staffService.getTasks()
    
    // 2. Get Medical Expiries
    const { data: athletes } = await medicalService.getMedicalVisits('', 'all', 0, 1000)

    const events: CalendarEvent[] = []

    // Map Tasks to events (showing on start_date)
    tasks.forEach((task: StaffTask) => {
      if (task.start_date) {
        events.push({
          id: `task-${task.id}`,
          title: `Task: ${task.title}`,
          description: task.description,
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

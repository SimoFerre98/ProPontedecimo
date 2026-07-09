import { medicalService, type MedicalVisitRecord } from './medicalService'
import { staffService, type StaffTask } from './staffService'
import { eventService, type FootballEvent } from './eventService'
import { eachDayOfInterval, parseISO, isValid } from 'date-fns'
import { splitLocalDateTime } from '@/lib/dateTime'

export type CalendarEventType = 'task' | 'medical' | 'event'

// Unione discriminata su `type`: chi consuma l'evento ottiene il tipo
// corretto di originalData semplicemente controllando event.type.
export type CalendarEvent = {
  id: string
  title: string
  description?: string
  date: string // ISO date
  status?: string
} & (
  | { type: 'task'; originalData: StaffTask }
  | { type: 'medical'; originalData: MedicalVisitRecord }
  | { type: 'event'; originalData: FootballEvent }
)

export const calendarService = {
  async getEventsForMonth(): Promise<CalendarEvent[]> {
    // 1. Get Tasks
    const tasks = await staffService.getTasks()
    
    // 2. Get Medical Expiries
    const { data: athletes } = await medicalService.getMedicalVisits('', 'all', 0, 1000)

    // 3. Get Football Events
    const fEvents = await eventService.getEvents()

    const events: CalendarEvent[] = []

    // Map Tasks to events (handling multi-day and time)
    tasks.forEach((task: StaffTask) => {
      if (!task.start_date) return

      const start = parseISO(task.start_date)
      if (!isValid(start)) return

      const end = task.end_date || task.due_date ? parseISO(task.end_date || task.due_date!) : null
      
      const timeStr = task.start_date.includes('T') 
        ? splitLocalDateTime(task.start_date).time
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
        } catch {
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
        const parts = athlete.medical_expiry.split('-').map(Number)
        const localDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
        if (!isNaN(localDate.getTime())) {
          events.push({
            id: `med-${athlete.id}`,
            title: `Scadenza Visita: ${athlete.last_name}`,
            description: `Visita medica di ${athlete.first_name} ${athlete.last_name} in scadenza`,
            date: localDate.toISOString(),
            type: 'medical',
            originalData: athlete
          })
        }
      }
    })

    fEvents.forEach(event => {
      if (!event.start_date) return
      const startStr = splitLocalDateTime(event.start_date).time
      let displayTitle = ''
      if (event.event_type === 'home_match' || event.event_type === 'away_match') {
        const typeLabel = event.event_type === 'home_match' ? 'Partita in Casa' : 'Trasferta'
        const meetupStr = event.meetup_time ? splitLocalDateTime(event.meetup_time).time : ''
        displayTitle = meetupStr ? `${meetupStr} → ${startStr} - ${typeLabel}: ${event.title}` : `${startStr} - ${event.title}`
      } else {
        displayTitle = `${startStr} - ${event.title}`
      }

      events.push({
        id: "event-" + event.id,
        title: displayTitle,
        description: event.description ?? undefined,
        date: event.start_date,
        type: 'event',
        originalData: event
      })
    })

    return events
  }
}

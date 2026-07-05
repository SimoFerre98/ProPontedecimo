import { supabase } from '@/lib/supabase'
import { isPast } from 'date-fns/isPast'
import { differenceInDays } from 'date-fns/differenceInDays'

export type AppNotification = {
  id: string
  type: 'medical' | 'task' | 'privacy' | 'payment'
  title: string
  message: string
  color: 'red' | 'yellow' | 'blue' | 'gray'
  link: string
  timestamp: string
}

export const notificationService = {
  async fetchNotifications(role: string | null): Promise<AppNotification[]> {
    if (!role || role === 'player' || role === 'parent') return []

    const notifications: AppNotification[] = []
    const now = new Date()

    // 1. Fetch Medical & Privacy (players)
    if (role === 'director' || role === 'president' || role === 'coach') {
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, medical_expiry, privacy_accepted')
        .eq('is_active', true)

      if (players) {
        players.forEach(p => {
          // Privacy check
          if ((role === 'director' || role === 'president') && (p.privacy_accepted === false || p.privacy_accepted === null)) {
            notifications.push({
              id: `privacy-${p.id}`,
              type: 'privacy',
              title: 'Consenso Privacy Mancante',
              message: `${p.first_name} ${p.last_name} non ha ancora accettato la privacy.`,
              color: 'gray',
              link: '/atleti',
              timestamp: now.toISOString()
            })
          }

          // Medical check
          if (!p.medical_expiry) {
            notifications.push({
              id: `med-missing-${p.id}`,
              type: 'medical',
              title: 'Visita Medica Mancante',
              message: `${p.first_name} ${p.last_name} non ha registrato la visita.`,
              color: 'red',
              link: '/visite',
              timestamp: now.toISOString()
            })
          } else {
            const expiry = new Date(p.medical_expiry)
            if (isPast(expiry)) {
              notifications.push({
                id: `med-expired-${p.id}`,
                type: 'medical',
                title: 'Visita Medica Scaduta',
                message: `La visita di ${p.first_name} ${p.last_name} è scaduta.`,
                color: 'red',
                link: '/visite',
                timestamp: p.medical_expiry
              })
            } else {
              const days = differenceInDays(expiry, now)
              if (days <= 30) {
                notifications.push({
                  id: `med-expiring-${p.id}`,
                  type: 'medical',
                  title: 'Visita Medica In Scadenza',
                  message: `La visita di ${p.first_name} ${p.last_name} scade tra ${days} giorn${days === 1 ? 'o' : 'i'}.`,
                  color: 'yellow',
                  link: '/visite',
                  timestamp: p.medical_expiry
                })
              }
            }
          }
        })
      } // end players
    }

    // 2. Fetch Tasks (Staff)
    if (role === 'director' || role === 'president' || role === 'coach') {
      const { data: tasks } = await supabase
        .from('staff_tasks')
        .select('id, title, due_date, status')
        .in('status', ['todo', 'in_progress'])

      if (tasks) {
        tasks.forEach(t => {
          if (!t.due_date) return
          const due = new Date(t.due_date)
          
          if (isPast(due)) {
            notifications.push({
              id: `task-expired-${t.id}`,
              type: 'task',
              title: 'Task Scaduto',
              message: `Il task "${t.title}" ha superato la data di scadenza.`,
              color: 'red',
              link: '/task',
              timestamp: t.due_date
            })
          } else {
            const days = differenceInDays(due, now)
            if (days <= 3) {
              notifications.push({
                id: `task-expiring-${t.id}`,
                type: 'task',
                title: 'Task in Scadenza',
                message: `Il task "${t.title}" scade tra ${days} giorn${days === 1 ? 'o' : 'i'}.`,
                color: 'yellow',
                link: '/task',
                timestamp: t.due_date
              })
            }
          }
        })
      }
    }

    // 3. Fetch Pagamenti in ritardo (>15 giorni dalla scadenza)
    if (role === 'director' || role === 'president') {
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
      const dateStr = fifteenDaysAgo.toISOString().split('T')[0]

      interface OverduePaymentRow {
        id: string
        installment_no: number
        due_date: string
        amount_eur: number | null
        status: string
        player: { first_name: string; last_name: string }
      }

      const { data: overduePayments } = await supabase
        .from('payments')
        .select(`
          id, installment_no, due_date, amount_eur, status,
          player:players!inner(first_name, last_name)
        `)
        .in('status', ['pending', 'overdue'])
        .not('due_date', 'is', null)
        .lt('due_date', dateStr)

      if (overduePayments) {
        (overduePayments as unknown as OverduePaymentRow[]).forEach((p) => {
          const daysLate = differenceInDays(now, new Date(p.due_date))
          notifications.push({
            id: `payment-overdue-${p.id}`,
            type: 'payment',
            title: 'Pagamento Non Ricevuto',
            message: `${p.player.first_name} ${p.player.last_name} — ${p.installment_no === 1 ? '1ª Rata' : '2ª Rata'} in ritardo di ${daysLate} giorn${daysLate === 1 ? 'o' : 'i'}${p.amount_eur ? ` (€ ${p.amount_eur})` : ''}.`,
            color: 'red',
            link: '/pagamenti',
            timestamp: p.due_date
          })
        })
      }
    }

    // Sor to show most critical/recent first
    // Colors prioritization: red > yellow > blue/gray
    const colorWeight = { red: 3, yellow: 2, blue: 1, gray: 0 }
    notifications.sort((a, b) => {
      if (colorWeight[a.color] !== colorWeight[b.color]) {
        return colorWeight[b.color] - colorWeight[a.color]
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

    return notifications
  }
}

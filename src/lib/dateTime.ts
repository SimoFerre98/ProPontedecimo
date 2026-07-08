/**
 * Combina una data locale (formato YYYY-MM-DD) e un orario locale (formato HH:MM)
 * in una stringa ISO UTC che rappresenta l'istante corretto nel fuso orario locale.
 */
export function combineLocalDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    return null
  }
  const date = new Date(year, month - 1, day, hours, minutes, 0)
  return date.toISOString()
}

/**
 * Converte una stringa ISO UTC nel corrispondente giorno (YYYY-MM-DD)
 * e orario (HH:MM) nel fuso orario locale del client.
 */
export function splitLocalDateTime(isoString: string | null): { date: string; time: string } {
  if (!isoString) return { date: '', time: '' }
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return { date: '', time: '' }
  
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  
  return {
    date: `${y}-${m}-${d}`,
    time: `${hh}:${mm}`
  }
}

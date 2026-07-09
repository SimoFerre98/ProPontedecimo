/**
 * Serializzatore iCal (RFC 5545) per gli eventi societari.
 */

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  event_type: 'training' | 'home_match' | 'away_match' | 'meeting' | 'generic';
  start_date: string;
  meetup_time?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Formatta una data ISO string nel formato richiesto da iCal (UTC: YYYYMMDDTHHMMSSZ).
 */
export function formatDateToIcs(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Esegue l'escape dei caratteri speciali secondo lo standard iCal (RFC 5545).
 */
export function escapeText(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Divide le righe più lunghe di 75 byte inserendo CRLF seguito da uno spazio (folding RFC 5545).
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) {
    return line;
  }
  let result = '';
  let currentLineBytes = 0;
  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (currentLineBytes + charBytes > 75) {
      result += '\r\n ';
      currentLineBytes = 1; // Spazio iniziale
    }
    result += char;
    currentLineBytes += charBytes;
  }
  return result;
}

/**
 * Genera il feed iCal a partire da una lista di eventi.
 */
export function generateIcs(events: Event[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pro Pontedecimo Manager//NONSGML v1.0//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const timeFormatter = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome'
  });

  for (const event of events) {
    const isMatch = event.event_type === 'home_match' || event.event_type === 'away_match';
    
    // Per le partite usiamo meetup_time (ritrovo) come DTSTART, per gli altri start_date
    const startStr = (isMatch && event.meetup_time) ? event.meetup_time : event.start_date;
    const startDate = new Date(startStr);
    const dtstart = formatDateToIcs(startStr);

    // Calcoliamo DTEND in base alla durata predefinita
    let durationMs = 60 * 60 * 1000; // 1 ora default (riunione, generico)
    if (isMatch) {
      durationMs = 2 * 60 * 60 * 1000; // 2 ore per le partite
    } else if (event.event_type === 'training') {
      durationMs = 1.5 * 60 * 60 * 1000; // 1 ora e mezza per allenamento
    }
    // Per le partite la durata va calcolata dall'inizio gara (start_date), non dal ritrovo:
    // altrimenti, con un ritrovo molto anticipato, l'evento potrebbe apparire concluso
    // prima ancora del fischio d'inizio.
    const endReferenceDate = isMatch ? new Date(event.start_date) : startDate;
    const endDate = new Date(endReferenceDate.getTime() + durationMs);
    const dtend = formatDateToIcs(endDate.toISOString());

    // Costruzione descrizione per le partite
    let description = event.description || '';
    if (isMatch) {
      const parts: string[] = [];
      if (event.meetup_time) {
        parts.push(`Ritrovo: ${timeFormatter.format(new Date(event.meetup_time))}`);
      }
      if (event.start_date) {
        parts.push(`Inizio gara: ${timeFormatter.format(new Date(event.start_date))}`);
      }
      const timeDetails = parts.join('\n');
      
      description = description 
        ? `${timeDetails}\n\n${description}`
        : timeDetails;
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@propontedecimo`);
    lines.push(`DTSTAMP:${formatDateToIcs(event.updated_at || event.created_at || new Date().toISOString())}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (description) {
      lines.push(`DESCRIPTION:${escapeText(description)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

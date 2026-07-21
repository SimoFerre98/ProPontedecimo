import { AlertTriangle, Clock, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AnnouncementSeverity } from '@/services/announcementService'

export type SeverityConfig = {
  label: string
  labelPlural: string
  icon: LucideIcon
  cssClass: string
  textColorClass: string
}

export const SEVERITY_CONFIG: Record<AnnouncementSeverity, SeverityConfig> = {
  urgent: { label: 'Urgente', labelPlural: 'Urgenti', icon: AlertTriangle, cssClass: 'urgent', textColorClass: 'text-[var(--sev-urgent)]' },
  reminder: { label: 'Promemoria', labelPlural: 'Promemoria', icon: Clock, cssClass: 'reminder', textColorClass: 'text-[var(--sev-reminder)]' },
  communication: { label: 'Comunicazione', labelPlural: 'Comunicazioni', icon: Megaphone, cssClass: 'comm', textColorClass: 'text-[var(--sev-comm)]' }
}

export const SEVERITY_ORDER: AnnouncementSeverity[] = ['urgent', 'reminder', 'communication']

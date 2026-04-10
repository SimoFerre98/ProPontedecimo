import { useQuery } from '@tanstack/react-query'
import { notificationService } from '@/services/notificationService'
import { useAuth } from '@/contexts/AuthContext'

export function useNotifications() {
  const { role } = useAuth()

  return useQuery({
    queryKey: ['notifications', role],
    queryFn: () => notificationService.fetchNotifications(role),
    // Fetch solo se ha un ruolo, e rifai il fetch ogni 15 minuti in background
    enabled: !!role && role !== 'player' && role !== 'parent',
    refetchInterval: 1000 * 60 * 15,
  })
}

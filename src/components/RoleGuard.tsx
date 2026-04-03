import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface RoleGuardProps {
  allowedRoles: string[]
  fallbackPath: string
}

export default function RoleGuard({ allowedRoles, fallbackPath }: RoleGuardProps) {
  const { role, loading } = useAuth()

  if (loading) return null

  // Se l'utente non ha un ruolo o non ha il ruolo permesso, reindirizza al fallback
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />
  }

  // Altrimenti renderizza le rotte figlie
  return <Outlet />
}

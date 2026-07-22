import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullPage label="Caricamento..." />
  }

  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}

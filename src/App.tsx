import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleGuard from '@/components/RoleGuard'

// Layouts e Pagine Staff
import DashboardLayout from '@/layouts/DashboardLayout'
import Dashboard from '@/pages/Dashboard'
import Athletes from '@/pages/Athletes'
import Payments from '@/pages/Payments'
import MedicalVisits from '@/pages/MedicalVisits'
import Attendance from '@/pages/Attendance'
import Convocazioni from '@/pages/Convocazioni'
import SquadraAtleti from '@/pages/SquadraAtleti'
import Inventory from '@/pages/Inventory'
import StaffTasks from '@/pages/StaffTasks'
import Notifiche from '@/pages/Notifiche'
import Guide from '@/pages/Guide'

// Layouts e Pagine Atleti/Genitori
import PortalLayout from '@/layouts/PortalLayout'
import PortalDashboard from '@/pages/PortalDashboard'
import PortalNotifiche from '@/pages/PortalNotifiche'

// Auth Pages
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import RecoveryPage from '@/pages/RecoveryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuti di cache
      retry: 1,
      refetchOnWindowFocus: false, // Non ricaricare i dati quando si cambia tab del browser
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Rotte pubbliche */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/recovery" element={<RecoveryPage />} />

              {/* Rotte Protette - Divise per Ruolo */}

              {/* 1. Branch Staff (Admin/Coach) */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoleGuard
                      allowedRoles={['president', 'director', 'coach']}
                      fallbackPath="/portal"
                    />
                  </ProtectedRoute>
                }
              >
                <Route element={<DashboardLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="atleti"    element={<Athletes />} />
                  <Route path="pagamenti" element={<Payments />} />
                  <Route path="visite"    element={<MedicalVisits />} />
                  <Route path="presenze"  element={<Attendance />} />
                  <Route path="convocazioni" element={<Convocazioni />} />
                  <Route path="squadra" element={<SquadraAtleti />} />
                  <Route path="magazzino" element={<Inventory />} />
                  <Route path="task"      element={<StaffTasks />} />
                  <Route path="notifiche" element={<Notifiche />} />
                  <Route path="guida"     element={<Guide />} />
                </Route>
              </Route>

              {/* 2. Branch Atleti e Genitori */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <RoleGuard
                      allowedRoles={['player', 'parent']}
                      fallbackPath="/"
                    />
                  </ProtectedRoute>
                }
              >
                <Route element={<PortalLayout />}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="notifiche" element={<PortalNotifiche />} />
                  <Route path="guida"     element={<Guide />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App

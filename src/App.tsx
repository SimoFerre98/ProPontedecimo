import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleGuard from '@/components/RoleGuard'

// Layouts e Auth
import DashboardLayout from '@/layouts/DashboardLayout'
import PortalLayout from '@/layouts/PortalLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

// Pagine Lazy Loaded
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Athletes = lazy(() => import('@/pages/Athletes'))
const Payments = lazy(() => import('@/pages/Payments'))
const MedicalVisits = lazy(() => import('@/pages/MedicalVisits'))
const Attendance = lazy(() => import('@/pages/Attendance'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const StaffTasks = lazy(() => import('@/pages/StaffTasks'))
const PortalDashboard = lazy(() => import('@/pages/PortalDashboard'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuti di cache
      retry: 1,
      refetchOnWindowFocus: false, // Non ricaricare i dati quando si cambia tab del browser
    },
  },
})

function LoadingSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Rotte pubbliche */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

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
                  <Route path="magazzino" element={<Inventory />} />
                  <Route path="task"      element={<StaffTasks />} />
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
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

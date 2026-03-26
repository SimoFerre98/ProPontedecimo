import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/layouts/DashboardLayout'
import Dashboard from '@/pages/Dashboard'
import LoginPage from '@/pages/LoginPage'
import Athletes from '@/pages/Athletes'
import Payments from '@/pages/Payments'
import MedicalVisits from '@/pages/MedicalVisits'
import Attendance from '@/pages/Attendance'
import Inventory from '@/pages/Inventory'
import StaffTasks from '@/pages/StaffTasks'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuti di cache
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Route pubblica */}
            <Route path="/login" element={<LoginPage />} />

            {/* Route protette */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="atleti"    element={<Athletes />} />
              <Route path="pagamenti" element={<Payments />} />
              <Route path="visite"    element={<MedicalVisits />} />
              <Route path="presenze"  element={<Attendance />} />
              <Route path="magazzino" element={<Inventory />} />
              <Route path="task"      element={<StaffTasks />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

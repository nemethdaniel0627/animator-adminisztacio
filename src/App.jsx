import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './common/components/Layout.jsx'
import TimelineView from './modules/timeline/felulet/TimelineView.jsx'
import EventList from './modules/events/felulet/EventList.jsx'
import AnimatorList from './modules/animators/felulet/AnimatorList.jsx'
import ProfileView from './modules/profile/felulet/ProfileView.jsx'
import KgyUserView from './modules/kozgyules/felulet/KgyUserView.jsx'
import KgyAdminView from './modules/kozgyules/felulet/KgyAdminView.jsx'
import LoginView from './modules/auth/felulet/LoginView.jsx'
import StatuszujitasUserView from './modules/statuszujitas/felulet/StatuszujitasUserView.jsx'
import StatuszujitasAdminView from './modules/statuszujitas/felulet/StatuszujitasAdminView.jsx'
import { AuthProvider, useAuth } from './common/context/AuthContext.jsx'

function RequireAuth({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-text-muted)' }}>
        Munkamenet betöltése...
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}

function AppRoutes() {
  const { currentUser, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-text-muted)' }}>
        Munkamenet betöltése...
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/timeline" replace /> : <LoginView />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Navigate to="/timeline" replace />
          </RequireAuth>
        }
      />
      <Route
        path="/timeline"
        element={
          <RequireAuth>
            <TimelineView />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            {isAdmin ? <EventList /> : <Navigate to="/timeline" replace />}
          </RequireAuth>
        }
      />
      <Route path="/events" element={<Navigate to="/admin" replace />} />
      <Route
        path="/animators"
        element={
          <RequireAuth>
            {isAdmin ? <AnimatorList /> : <Navigate to="/timeline" replace />}
          </RequireAuth>
        }
      />
      <Route path="/taglista" element={<Navigate to="/animators" replace />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfileView />
          </RequireAuth>
        }
      />

      {/* Státuszújítás User Side */}
      <Route
        path="/statuszujitas"
        element={
          <RequireAuth>
            <StatuszujitasUserView />
          </RequireAuth>
        }
      />

      {/* Státuszújítás Admin Side */}
      <Route
        path="/statuszujitas-kerelmek"
        element={
          <RequireAuth>
            {isAdmin ? <StatuszujitasAdminView /> : <Navigate to="/statuszujitas" replace />}
          </RequireAuth>
        }
      />
      <Route path="/statuszujitas/admin" element={<Navigate to="/statuszujitas-kerelmek" replace />} />

      {/* Közgyűlés User Side */}
      <Route
        path="/kgy"
        element={
          <RequireAuth>
            <KgyUserView />
          </RequireAuth>
        }
      />

      {/* Közgyűlés Admin Side - strictly accessible to admins */}
      <Route
        path="/kgy/admin"
        element={
          <RequireAuth>
            {isAdmin ? <KgyAdminView /> : <Navigate to="/kgy" replace />}
          </RequireAuth>
        }
      />

      <Route
        path="*"
        element={
          currentUser ? <Navigate to="/timeline" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}

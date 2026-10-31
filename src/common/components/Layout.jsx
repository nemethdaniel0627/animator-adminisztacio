import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  User,
  Clock,
  LogOut,
  Users,
  Settings,
  Menu,
  X,
  Database,
  Shield,
  ShieldCheck,
  UserCheck,
  CheckSquare,
  FileText
} from 'lucide-react'
import BrandLogo from './BrandLogo.jsx'
import { apiClient } from '../api/apiClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getAnimatorDisplayRole } from '../../modules/animators/modell/animatorModels.js'
import { statuszujitasService } from '../../modules/statuszujitas/szolgaltatas/statuszujitasService.js'
import { isStatuszujitasPeriodActive } from '../../modules/statuszujitas/modell/statuszujitasModels.js'

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isStatuszujitasActive, setIsStatuszujitasActive] = useState(false)
  const location = useLocation()
  const { currentUser, isAdmin, userPosition, animators, logout } = useAuth()

  // Compute prominent community role badge (Position > Veterán / Vén > Animátor)
  const displayRole = getAnimatorDisplayRole(currentUser, userPosition)

  useEffect(() => {
    let isMounted = true

    const checkPeriod = () => {
      statuszujitasService
        .getConfig()
        .then((cfg) => {
          if (isMounted && cfg) {
            const nextActive = Boolean(cfg.isPeriodActive ?? isStatuszujitasPeriodActive(cfg))
            setIsStatuszujitasActive((prev) => (prev !== nextActive ? nextActive : prev))
          }
        })
        .catch(() => {
          if (isMounted) setIsStatuszujitasActive(false)
        })
    }

    const handleConfigChange = (e) => {
      if (isMounted && e?.detail) {
        const nextActive = Boolean(e.detail.isPeriodActive ?? isStatuszujitasPeriodActive(e.detail))
        setIsStatuszujitasActive((prev) => (prev !== nextActive ? nextActive : prev))
      } else {
        checkPeriod()
      }
    }

    checkPeriod()

    // Listen to real-time status renewal period updates from admin panel and background sync
    let pollTimer = null
    if (typeof window !== 'undefined') {
      window.addEventListener('statuszujitas_config_change', handleConfigChange)
      window.addEventListener('focus', checkPeriod)
      pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          checkPeriod()
        }
      }, 15000)
    }

    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('statuszujitas_config_change', handleConfigChange)
        window.removeEventListener('focus', checkPeriod)
      }
      if (pollTimer) {
        clearInterval(pollTimer)
      }
    }
  }, [location.pathname])

  // Determine topbar title from active route
  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/statuszujitas-kerelmek') || path.startsWith('/statuszujitas/admin')) return 'Státuszújítási kérelmek'
    if (path.startsWith('/statuszujitas')) return 'Státuszújítás'
    if (path.startsWith('/timeline')) return 'Idővonal'
    if (path.startsWith('/kgy/admin')) return 'Közgyűlés Adminisztráció'
    if (path.startsWith('/admin') || path.startsWith('/events')) return 'Adminisztráció'
    if (path.startsWith('/animators') || path.startsWith('/taglista')) return 'Taglista'
    if (path.startsWith('/profile')) return 'Profil'
    return 'Idővonal'
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // Fullscreen standalone view for Közgyűlés user & admin interfaces
  if (location.pathname === '/login' || location.pathname === '/kgy' || location.pathname === '/kgy/') {
    return <>{children}</>
  }

  return (
    <div className="portal-shell">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={closeMobileMenu} />
      )}

      {/* Left Sidebar matching screenshot */}
      <aside className={`portal-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <NavLink to="/timeline" className="portal-brand" onClick={closeMobileMenu}>
          <BrandLogo size={42} showText={true} />
        </NavLink>

        <nav className="portal-nav">
          <NavLink
            to="/profile"
            className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <User size={16} />
            <span>Profil</span>
          </NavLink>

          <NavLink
            to="/timeline"
            className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Clock size={16} />
            <span>Idővonal</span>
          </NavLink>

          {/* Státuszújítás: csak akkor jelenik meg a menüben, ha az időszak aktív (és a mai dátum a határidők közé esik) */}
          {isStatuszujitasActive && (
            <NavLink
              to="/statuszujitas"
              className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <CheckSquare size={16} />
              <span>Státuszújítás</span>
            </NavLink>
          )}

          {/* Taglista is strictly visible only for Administrators (not simple Tag-s) */}
          {isAdmin && (
            <NavLink
              to="/animators"
              className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <Users size={16} />
              <span>Taglista</span>
            </NavLink>
          )}

          {/* Adminisztráció link is strictly visible only for Administrators */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `portal-nav-item ${isActive || location.pathname.startsWith('/events') ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              <Settings size={16} />
              <span>Adminisztráció</span>
            </NavLink>
          )}

          {/* Státuszújítási kérelmek (Admin only, matching portal screenshot) */}
          {isAdmin && (
            <NavLink
              to="/statuszujitas-kerelmek"
              className={({ isActive }) =>
                `portal-nav-item ${isActive || location.pathname.startsWith('/statuszujitas-kerelmek') || location.pathname.startsWith('/statuszujitas/admin') ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              <FileText size={16} />
              <span>Státuszújítási kérelmek</span>
            </NavLink>
          )}

          {/* Közgyűlés linkek */}
          <NavLink
            to="/kgy"
            className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <UserCheck size={16} />
            <span>Közgyűlés</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/kgy/admin"
              className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <Shield size={16} />
              <span>Közgyűlés Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Sidebar Footer with Database Status and User Tester Switcher */}
        <div className="portal-sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Adatbázis:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: apiClient.isMockMode ? '#851b22' : '#059669',
                color: '#ffffff'
              }}
            >
              <Database size={11} />
              {apiClient.isMockMode ? 'MOCK' : 'LIVE'}
            </span>
          </div>

          {/* Test User Switcher */}
          <div style={{ width: '100%', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              type="button"
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              title="Kijelentkezés a fiókból"
            >
              <LogOut size={14} />
              <span>Kijelentkezés</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="portal-main-area">
        {/* Topbar */}
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menü megnyitása"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="portal-topbar-title">{getPageTitle()}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Prominent Community Role Badge: Position > Veterán / Vén > Animátor */}
            {displayRole.roleType === 'position' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: 'rgba(133, 27, 34, 0.1)',
                  color: '#851b22',
                  border: '1px solid rgba(133, 27, 34, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                title={`Vezetőségi tisztség a legutóbbi tisztújítás alapján: ${displayRole.roleLabel}`}
              >
                <ShieldCheck size={13} color="#851b22" />
                <span>{displayRole.roleLabel}</span>
              </span>
            ) : displayRole.roleType === 'veteran' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  color: '#d97706',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                title="Veterán animátor"
              >
                <span>Veterán</span>
              </span>
            ) : displayRole.roleType === 'ex' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(148, 163, 184, 0.12)',
                  color: '#94a3b8',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                title="Ex-animátor"
              >
                <span>Ex</span>
              </span>
            ) : displayRole.roleType === 'ven' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(124, 58, 237, 0.12)',
                  color: '#7c3aed',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                title="Vén animátor"
              >
                <span>Vén</span>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--color-surface-hover)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                <span>Animátor</span>
              </span>
            )}

            <NavLink to="/profile" className="portal-topbar-user" title="Profil megtekintése">
              <div className="portal-avatar" style={{ overflow: 'hidden' }}>
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.nev} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} />
                )}
              </div>
              <span>{currentUser?.nev || 'Németh Dániel'}</span>
            </NavLink>
          </div>
        </header>

        {/* Content Container */}
        <main className="portal-content">
          {children}
        </main>
      </div>
    </div>
  )
}

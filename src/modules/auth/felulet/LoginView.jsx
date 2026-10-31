import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, Key, User, Shield, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import BrandLogo from '../../../common/components/BrandLogo.jsx'
import { useAuth } from '../../../common/context/AuthContext.jsx'

export default function LoginView() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect target after login (default /timeline)
  const queryParams = new URLSearchParams(location.search)
  const redirectTo = queryParams.get('redirect') || '/timeline'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setError('Kérjük add meg az azonosítódat vagy e-mail címedet.')
      return
    }

    try {
      setLoading(true)
      setError('')
      await login(identifier, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Sikertelen bejelentkezés.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#060E20',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Brand Header */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <BrandLogo size={52} showText={true} color="#ffffff" />
          <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Pázmány ITK Animátor Közösség oldala
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div style={{ marginBottom: '24px' }}>
            <h1 className="login-title">
              Bejelentkezés
            </h1>
            <p className="login-subtitle">
              Lépj be a regisztrált egyetemi azonosítóddal.
            </p>
          </div>

          {error && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-bg, rgba(220, 38, 38, 0.15))',
                border: '1px solid var(--color-danger-border, rgba(220, 38, 38, 0.3))',
                color: 'var(--color-danger-text, #ef4444)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Username / Shibboleth input */}
            <div>
              <label htmlFor="identifier" className="login-label">
                Azonosító / Shibboleth
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="pl. tesel"
                  required
                  autoFocus
                  className="login-input"
                  style={{ paddingLeft: '42px' }}
                />
                <User size={18} className="login-input-icon" />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="login-label">
                Jelszó
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input"
                  style={{ paddingLeft: '42px' }}
                />
                <Key size={18} className="login-input-icon" />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
              }}
            >
              <LogIn size={18} />
              <span>{loading ? 'Bejelentkezés...' : 'Bejelentkezés'}</span>
            </button>
          </form>

          {/* Shibboleth SSO Integration Notice */}
          <div className="login-notice">
            <Shield size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Egyetemi Shibboleth azonosítás:</strong> A rendszer a Pázmány ITK központi Shibboleth címtárával működik.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

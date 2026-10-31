import { useState, useEffect } from 'react'
import { apiClient } from '../../../common/api/apiClient.js'
import { CheckCircle, AlertCircle, Upload, ShieldCheck, ShieldAlert, Award } from 'lucide-react'
import { useAuth } from '../../../common/context/AuthContext.jsx'
import { getAnimatorDisplayRole } from '../../animators/modell/animatorModels.js'

export default function ProfileView() {
  const { currentUser, isAdmin, userPosition, latestTisztujitas } = useAuth()
  const displayRole = getAnimatorDisplayRole(currentUser, userPosition)
  const [profile, setProfile] = useState({
    nev: currentUser?.nev || 'Németh Dániel',
    email: currentUser?.email || 'nem.dani0627@gmail.com',
    telefon: currentUser?.telefonszam || '+36 308-334589',
    avatarUrl: currentUser?.avatarUrl || ''
  })
  const [loading, setLoading] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')

  useEffect(() => {
    if (currentUser) {
      setProfile({
        nev: currentUser.nev || '',
        email: currentUser.email || '',
        telefon: currentUser.telefonszam || '',
        avatarUrl: currentUser.avatarUrl || ''
      })
    }
  }, [currentUser])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSavedSuccess(false)
    try {
      const updated = await apiClient.post('/api/profile', profile)
      if (updated) {
        setProfile((prev) => ({ ...prev, ...updated }))
      }
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
      const reader = new FileReader()
      reader.onload = (event) => {
        setProfile((prev) => ({ ...prev, avatarUrl: event.target?.result || '' }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {savedSuccess && (
          <div className="alert alert-success" style={{ marginBottom: '8px' }}>
            <CheckCircle size={18} />
            <span>Profil adatok sikeresen mentve!</span>
          </div>
        )}

        {/* Név */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <label style={{ width: '100px', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
            Név
          </label>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              value={profile.nev}
              onChange={(e) => setProfile({ ...profile, nev: e.target.value })}
              required
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>

        {/* Email */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <label style={{ width: '100px', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
            Email
          </label>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              required
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>

        {/* Telefon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <label style={{ width: '100px', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
            Telefon
          </label>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="tel"
              value={profile.telefon}
              onChange={(e) => setProfile({ ...profile, telefon: e.target.value })}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: '#e11d48' /* Red highlight as seen in screenshot */
              }}
            />
          </div>
        </div>

        {/* MENTÉS Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '16px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#060e20',
              color: '#ffffff',
              padding: '10px 48px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.8125rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              border: 'none',
              boxShadow: 'var(--shadow-md)',
              cursor: 'pointer',
              minHeight: '42px',
              transition: 'background var(--transition-fast), transform var(--transition-fast)'
            }}
          >
            {loading ? 'Mentés...' : 'Mentés'}
          </button>
        </div>

        {/* Profilkép */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '20px' }}>
          <label style={{ width: '100px', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
            Profilkép
          </label>
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                padding: '4px 6px 4px 14px',
                minHeight: '44px'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: selectedFileName ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {selectedFileName || 'Válassz egy fájlt'}
              </span>
              <label
                htmlFor="avatar-upload"
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                Tallózás
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt="Avatar előnézet"
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary-500)' }}
              />
            )}
          </div>
        </div>
      </form>

      {/* Permissions / Pozíció Info Card */}
      <div className="card" style={{ padding: '20px', borderLeft: isAdmin ? '4px solid #851b22' : '4px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {isAdmin ? <ShieldCheck size={20} color="#851b22" /> : <ShieldAlert size={20} color="var(--color-text-muted)" />}
          <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>
            Rendszerjogosultság (pozíció alapján)
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <div>
            <strong>Közösségi szerepkör:</strong>{' '}
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {displayRole.roleLabel}
            </span>
          </div>
          <div>
            <strong>Legutóbbi tisztújítás:</strong>{' '}
            {latestTisztujitas ? `${latestTisztujitas.cim} (${latestTisztujitas.datum})` : 'Nincs rögzítve'}
          </div>
          <div>
            <strong>Rögzített pozíció:</strong>{' '}
            {userPosition ? (
              <span style={{ fontWeight: 600, color: '#851b22' }}>{userPosition}</span>
            ) : (
              'Nincs vezetőségi pozíció a legutóbbi tisztújításhoz'
            )}
          </div>
          <div>
            <strong>Adminisztrátori jogkör:</strong>{' '}
            {isAdmin ? (
              <span style={{ color: '#059669', fontWeight: 600 }}>Aktív (Teljes adminisztrációs hozzáférés: Események, Jelenlét, Taglista)</span>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>Inaktív (Csak személyes Profil és Idővonal megtekintése)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { X, Award, AlertCircle, Plus, Trash2, ShieldCheck, User, Calendar } from 'lucide-react'
import { apiClient } from '../../../common/api/apiClient.js'
import { useAuth } from '../../../common/context/AuthContext.jsx'

const STANDARD_POSITIONS = [
  'Elnök',
  'Alelnök',
  'Képzés felelőse',
  'Gólyatábor felelőse',
  'Gólyanapok felelőse',
  'Gólyahétvége felelőse'
]

export default function TisztujitasModal({ isOpen, onClose, onEventCreated }) {
  const { refreshPermissions } = useAuth()
  const currentYear = new Date().getFullYear()

  const [cim, setCim] = useState(`Tisztújítás ${currentYear}`)
  const [datum, setDatum] = useState(() => new Date().toISOString().split('T')[0])
  const [nextId, setNextId] = useState(null)
  const [animators, setAnimators] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Positions being assigned in this Tisztújítás
  const [assignedPositions, setAssignedPositions] = useState([])

  // Position Picker state
  const [selectedAnimatorId, setSelectedAnimatorId] = useState('')
  const [selectedPositionPreset, setSelectedPositionPreset] = useState(STANDARD_POSITIONS[0])

  useEffect(() => {
    if (isOpen) {
      setCim(`Tisztújítás ${new Date().getFullYear()}`)
      setDatum(new Date().toISOString().split('T')[0])
      setAssignedPositions([])
      setSelectedPositionPreset(STANDARD_POSITIONS[0])
      setError(null)
      setLoading(true)

      // Fetch next event ID and all animators
      Promise.all([
        apiClient.get('/api/events/next-id').catch(() => ({ next_esemeny_ID: null })),
        apiClient.get('/api/animators').catch(() => [])
      ])
        .then(([idRes, animList]) => {
          if (idRes?.next_esemeny_ID) setNextId(idRes.next_esemeny_ID)
          setAnimators(animList || [])
          if (animList && animList.length > 0) {
            setSelectedAnimatorId(String(animList[0].animator_ID))
          }
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAddPosition = () => {
    const animId = Number(selectedAnimatorId)
    if (!animId) {
      setError('Kérjük, válassz ki egy animátort a pozícióhoz!')
      return
    }

    const posTitle = selectedPositionPreset.trim()

    if (!posTitle) {
      setError('Kérjük, add meg a pozíció megnevezését!')
      return
    }

    // Check if this animator is already assigned a position in this tisztújítás
    const existing = assignedPositions.find((p) => p.animator_ID === animId)
    if (existing) {
      setError(`${existing.animator_nev} már rendelkezik pozícióval (${existing.pozicio})!`)
      return
    }

    const animObj = animators.find((a) => a.animator_ID === animId)
    const newEntry = {
      animator_ID: animId,
      animator_nev: animObj?.nev || `Animátor #${animId}`,
      kategoria: animObj?.kategoria || '',
      pozicio: posTitle
    }

    setAssignedPositions([...assignedPositions, newEntry])
    setError(null)


  }

  const handleRemovePosition = (animId) => {
    setAssignedPositions(assignedPositions.filter((p) => p.animator_ID !== animId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cim.trim()) {
      setError('A tisztújítás megnevezése kötelező!')
      return
    }
    if (!datum) {
      setError('A dátum megadása kötelező!')
      return
    }
    if (assignedPositions.length === 0) {
      setError('Legalább egy vezetőségi pozíciót ki kell osztani a tisztújításhoz!')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        cim: cim.trim(),
        datum,
        poziciok: assignedPositions.map((p) => ({
          animator_ID: p.animator_ID,
          pozicio: p.pozicio
        }))
      }

      const res = await apiClient.createTisztujitas(payload)

      // Refresh current user permissions in case they were assigned or permissions changed
      if (typeof refreshPermissions === 'function') {
        refreshPermissions()
      }

      if (onEventCreated) {
        onEventCreated(res.event)
      }

      onClose()
    } catch (err) {
      setError(err.message || 'Nem sikerült menteni a tisztújítást.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            backgroundColor: '#060e20',
            color: '#ffffff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={22} color="#f43f5e" />
            <div>
              <h2 style={{ fontSize: '1.1875rem', margin: 0, color: '#ffffff', fontWeight: 700 }}>
                Új Tisztújítás Rögzítése
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Új vezetőség megválasztása és adminisztrátori jogosultságok kiosztása
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Bezárás"
            style={{ color: '#ffffff' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Explanatory callout */}
            <div
              style={{
                backgroundColor: 'rgba(133, 27, 34, 0.08)',
                border: '1px solid rgba(133, 27, 34, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <ShieldCheck size={20} color="#851b22" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Rendszerjogosultsági szabály:</strong>{' '}
                A tisztújítás a szervezet legfontosabb eseménye. Az itt pozíciót kapott animátorok
                bejegyzésre kerülnek a <code>pozicio</code> táblába, és mivel ez lesz a legfrissebb tisztújítás,{' '}
                <strong style={{ color: '#851b22' }}>automatikusan adminisztrátori jogot szereznek</strong> a rendszerben!
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ margin: 0 }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Event Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tisztújítás Neve *
                </label>
                <input
                  type="text"
                  value={cim}
                  onChange={(e) => setCim(e.target.value)}
                  placeholder="Pl. Tisztújítás 2026"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Dátum *
                </label>
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Esemény típusa:</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  backgroundColor: '#851b22',
                  color: '#ffffff'
                }}
              >
                tisztújítás
              </span>
              {nextId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  Esemény ID: <strong>#{nextId}</strong>
                </span>
              )}
            </div>

            {/* Position Picker Section */}
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                Pozíciók Kiosztása Animátoroknak
              </h3>

              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  {/* Select Animator */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                      Animátor
                    </label>
                    <select
                      value={selectedAnimatorId}
                      onChange={(e) => setSelectedAnimatorId(e.target.value)}
                      style={{ fontSize: '0.875rem', backgroundColor: 'var(--color-surface)' }}
                    >
                      {animators.map((a) => (
                        <option key={a.animator_ID} value={a.animator_ID}>
                          {a.nev} ({a.kategoria || 'tag'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Position */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                      Tisztség / Pozíció
                    </label>
                    <select
                      value={selectedPositionPreset}
                      onChange={(e) => setSelectedPositionPreset(e.target.value)}
                      style={{ fontSize: '0.875rem', backgroundColor: 'var(--color-surface)' }}
                    >
                      {STANDARD_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>



                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddPosition}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8125rem',
                      padding: '6px 14px',
                      minHeight: '34px'
                    }}
                  >
                    <Plus size={15} />
                    <span>Pozíció hozzáadása</span>
                  </button>
                </div>
              </div>

              {/* Assigned Positions List */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Kiosztott pozíciók ({assignedPositions.length} fő):
                  </span>
                  {assignedPositions.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setAssignedPositions([])}
                      style={{ fontSize: '0.75rem', padding: '2px 8px', minHeight: 'auto', color: 'var(--color-text-muted)' }}
                    >
                      Összes törlése
                    </button>
                  )}
                </div>

                {assignedPositions.length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      border: '1px dashed var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.875rem'
                    }}
                  >
                    Még nem osztottál ki pozíciót. Válassz ki egy animátort és tisztséget a fenti űrlapon!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assignedPositions.map((pos) => (
                      <div
                        key={pos.animator_ID}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: 'var(--shadow-xs)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              backgroundColor: '#851b22',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {pos.pozicio}
                          </span>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{pos.animator_nev}</span>
                            {pos.kategoria && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                                ({pos.kategoria})
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemovePosition(pos.animator_ID)}
                          title="Pozíció törlése"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || assignedPositions.length === 0}
              style={{
                backgroundColor: '#851b22',
                borderColor: '#851b22',
                color: '#ffffff'
              }}
            >
              {loading
                ? 'Mentés folyamatban...'
                : `Tisztújítás Mentése (${assignedPositions.length} pozícióval)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

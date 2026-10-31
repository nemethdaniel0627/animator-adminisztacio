import { useState, useEffect } from 'react'
import { X, Pencil, Trash2, Plus, Check, AlertCircle, Award, User, RefreshCw } from 'lucide-react'
import { apiClient } from '../../../common/api/apiClient.js'
import { useAuth } from '../../../common/context/AuthContext.jsx'

export const STANDARD_POSITIONS = [
  'Elnök',
  'Alelnök',
  'Képzés felelőse',
  'Gólyatábor felelőse',
  'Gólyanapok felelőse',
  'Gólyahétvége felelőse'
]

export default function TisztujitasPositionsModal({ event, isOpen, onClose, onPositionsUpdated }) {
  const { refreshPermissions } = useAuth()

  const [positions, setPositions] = useState([])
  const [animators, setAnimators] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Editing state for an existing position
  const [editingPosId, setEditingPosId] = useState(null)
  const [editAnimatorId, setEditAnimatorId] = useState('')
  const [editPositionTitle, setEditPositionTitle] = useState('')
  const [editCustomTitle, setEditCustomTitle] = useState('')
  const [isEditCustom, setIsEditCustom] = useState(false)

  // Adding new position state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [newAnimatorId, setNewAnimatorId] = useState('')
  const [newPositionTitle, setNewPositionTitle] = useState(STANDARD_POSITIONS[0])
  const [newCustomTitle, setNewCustomTitle] = useState('')
  const [isNewCustom, setIsNewCustom] = useState(false)

  // Load positions and animators when modal opens
  const loadData = async () => {
    if (!event?.esemeny_ID) return
    try {
      setLoading(true)
      setError(null)
      const [posList, animList] = await Promise.all([
        apiClient.getEventPositions(event.esemeny_ID).catch(() => []),
        apiClient.get('/api/animators').catch(() => [])
      ])
      setPositions(posList || [])
      setAnimators(animList || [])
      if (animList && animList.length > 0 && !newAnimatorId) {
        setNewAnimatorId(String(animList[0].animator_ID))
      }
    } catch (err) {
      console.error(err)
      setError('Nem sikerült betölteni a pozíciókat.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && event) {
      loadData()
      setEditingPosId(null)
      setIsAddFormOpen(false)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, event])

  if (!isOpen || !event) return null

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  // Start editing a row
  const handleStartEdit = (pos) => {
    setEditingPosId(pos.pozicio_ID)
    setEditAnimatorId(String(pos.animator_ID))

    const isStandard = STANDARD_POSITIONS.includes(pos.pozicio)
    if (isStandard) {
      setEditPositionTitle(pos.pozicio)
      setIsEditCustom(false)
      setEditCustomTitle('')
    } else {
      setEditPositionTitle('CUSTOM')
      setIsEditCustom(true)
      setEditCustomTitle(pos.pozicio)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPosId(null)
    setEditAnimatorId('')
    setEditPositionTitle('')
    setEditCustomTitle('')
    setIsEditCustom(false)
  }

  // Save edited position
  const handleSaveEdit = async (posId) => {
    const finalTitle = isEditCustom ? editCustomTitle.trim() : editPositionTitle.trim()
    const animId = Number(editAnimatorId)

    if (!animId) {
      setError('Kérjük, válassz ki egy animátort!')
      return
    }
    if (!finalTitle) {
      setError('A pozíció megnevezése nem lehet üres!')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      await apiClient.updatePosition(posId, {
        animator_ID: animId,
        pozicio: finalTitle
      })

      // Update state locally
      const animObj = animators.find((a) => a.animator_ID === animId)
      setPositions((prev) =>
        prev.map((p) =>
          p.pozicio_ID === posId
            ? {
                ...p,
                animator_ID: animId,
                animator_nev: animObj?.nev || `Animátor #${animId}`,
                pozicio: finalTitle
              }
            : p
        )
      )

      handleCancelEdit()
      showSuccess('Pozíció sikeresen frissítve!')
      refreshPermissions()
      onPositionsUpdated?.()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Hiba a pozíció módosításakor.')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete position
  const handleDeletePosition = async (posId, posName) => {
    if (!window.confirm(`Biztosan törölni szeretnéd a(z) "${posName}" pozíciót?`)) {
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      await apiClient.deletePosition(posId)
      setPositions((prev) => prev.filter((p) => p.pozicio_ID !== posId))
      showSuccess('Pozíció törölve!')
      refreshPermissions()
      onPositionsUpdated?.()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Hiba a pozíció törlésekor.')
    } finally {
      setActionLoading(false)
    }
  }

  // Add new position
  const handleAddNewPosition = async (e) => {
    e?.preventDefault()
    const finalTitle = isNewCustom ? newCustomTitle.trim() : newPositionTitle.trim()
    const animId = Number(newAnimatorId)

    if (!animId) {
      setError('Kérjük, válassz ki egy animátort!')
      return
    }
    if (!finalTitle) {
      setError('A pozíció megnevezése nem lehet üres!')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      const res = await apiClient.addEventPosition(event.esemeny_ID, {
        animator_ID: animId,
        pozicio: finalTitle
      })

      const animObj = animators.find((a) => a.animator_ID === animId)
      const created = {
        pozicio_ID: res.pozicio_ID || Date.now(),
        animator_ID: animId,
        esemeny_ID: event.esemeny_ID,
        pozicio: finalTitle,
        animator_nev: animObj?.nev || `Animátor #${animId}`
      }

      setPositions((prev) => [...prev, created])
      setIsAddFormOpen(false)
      setNewCustomTitle('')
      setIsNewCustom(false)
      setNewPositionTitle(STANDARD_POSITIONS[0])
      showSuccess('Új pozíció sikeresen hozzáadva!')
      refreshPermissions()
      onPositionsUpdated?.()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Hiba az új pozíció mentésekor.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '540px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching screenshot */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tisztújítás Pozíciói
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {event.cim}
            </h3>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Bezárás"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.875rem',
              marginBottom: '14px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              color: '#4ade80',
              fontSize: '0.875rem',
              marginBottom: '14px'
            }}
          >
            <Check size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Position List */}
        <div style={{ marginBottom: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
              Pozíciók betöltése...
            </div>
          ) : positions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px dashed var(--color-border)'
              }}
            >
              Még nincsenek rögzített pozíciók ehhez a tisztújításhoz.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {positions.map((pos) => {
                const isEditing = editingPosId === pos.pozicio_ID

                if (isEditing) {
                  return (
                    <div
                      key={pos.pozicio_ID}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid #3b82f6',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            Animátor
                          </label>
                          <select
                            value={editAnimatorId}
                            onChange={(e) => setEditAnimatorId(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-surface-hover)',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.8125rem'
                            }}
                          >
                            {animators.map((a) => (
                              <option key={a.animator_ID} value={a.animator_ID}>
                                {a.nev}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            Tisztség
                          </label>
                          <select
                            value={isEditCustom ? 'CUSTOM' : editPositionTitle}
                            onChange={(e) => {
                              if (e.target.value === 'CUSTOM') {
                                setIsEditCustom(true)
                              } else {
                                setIsEditCustom(false)
                                setEditPositionTitle(e.target.value)
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-surface-hover)',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.8125rem'
                            }}
                          >
                            {STANDARD_POSITIONS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                            <option value="CUSTOM">Egyedi pozíció...</option>
                          </select>
                        </div>
                      </div>

                      {isEditCustom && (
                        <div>
                          <input
                            type="text"
                            placeholder="Egyedi tisztség megnevezése..."
                            value={editCustomTitle}
                            onChange={(e) => setEditCustomTitle(e.target.value)}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-surface-hover)',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.8125rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        >
                          Mégse
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleSaveEdit(pos.pozicio_ID)}
                          disabled={actionLoading}
                          style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Check size={14} />
                          <span>Mentés</span>
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={pos.pozicio_ID}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-surface-hover)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {pos.animator_nev}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          backgroundColor: '#851b22',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '4px'
                        }}
                      >
                        {pos.pozicio}
                      </span>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(pos)}
                        disabled={actionLoading}
                        title="Pozíció szerkesztése"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeletePosition(pos.pozicio_ID, `${pos.animator_nev} - ${pos.pozicio}`)}
                        disabled={actionLoading}
                        title="Pozíció törlése"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add New Position Form / Toggle */}
        <div style={{ marginBottom: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          {!isAddFormOpen ? (
            <button
              type="button"
              onClick={() => setIsAddFormOpen(true)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                color: '#38bdf8',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)'
                e.currentTarget.style.borderColor = '#38bdf8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <Plus size={16} />
              <span>+ Új pozíció felvétele</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddNewPosition}
              style={{
                padding: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  Új pozíció hozzárendelése
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Animátor kiválasztása
                  </label>
                  <select
                    value={newAnimatorId}
                    onChange={(e) => setNewAnimatorId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    {animators.map((a) => (
                      <option key={a.animator_ID} value={a.animator_ID}>
                        {a.nev}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Pozíció
                  </label>
                  <select
                    value={isNewCustom ? 'CUSTOM' : newPositionTitle}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsNewCustom(true)
                      } else {
                        setIsNewCustom(false)
                        setNewPositionTitle(e.target.value)
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    {STANDARD_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="CUSTOM">Egyedi pozíció...</option>
                  </select>
                </div>
              </div>

              {isNewCustom && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Egyedi tisztség megnevezése
                  </label>
                  <input
                    type="text"
                    placeholder="pl. Marketing felelős"
                    value={newCustomTitle}
                    onChange={(e) => setNewCustomTitle(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.8125rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddFormOpen(false)}
                  style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#851b22',
                    borderColor: '#851b22'
                  }}
                >
                  <Plus size={14} />
                  <span>{actionLoading ? 'Mentés...' : 'Pozíció mentése'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ minWidth: '90px' }}
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  )
}


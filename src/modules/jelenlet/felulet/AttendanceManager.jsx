import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Search,
  UserCheck,
  Users,
  CheckCircle,
  AlertTriangle,
  Clipboard,
  Trash2,
  Calendar,
  Sparkles
} from 'lucide-react'
import { animatorService } from '../../animators/szolgaltatas/animatorService.js'
import { filterAnimators, matchAnimatorsByNames } from '../../animators/modell/animatorModels.js'
import { validateNoDuplicates } from '../modell/jelenletModels.js'
import { jelenletService } from '../szolgaltatas/jelenletService.js'

export default function AttendanceManager({ event, isOpen, onClose, onAttendanceUpdated }) {
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'checklist' | 'clipboard'
  const [animators, setAnimators] = useState([])
  const [recordedAttendees, setRecordedAttendees] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clipboardText, setClipboardText] = useState('')
  const [clipboardFeedback, setClipboardFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)

  // Fetch all animators and existing event attendances
  useEffect(() => {
    if (isOpen && event?.esemeny_ID) {
      setLoading(true)
      setSelectedIds(new Set())
      setSearchQuery('')
      setCategoryFilter('')
      setClipboardText('')
      setClipboardFeedback(null)
      setNotification(null)

      Promise.all([
        animatorService.getAnimators(),
        jelenletService.getAttendancesByEvent(event.esemeny_ID)
      ])
        .then(([animList, attList]) => {
          setAnimators(animList)
          setRecordedAttendees(attList)
        })
        .catch((err) => {
          setNotification({ type: 'danger', message: err.message || 'Nem sikerült betölteni az adatokat.' })
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, event])

  // Map recorded attendee IDs
  const recordedIdsSet = useMemo(() => {
    return new Set(recordedAttendees.map((a) => Number(a.animator_ID)))
  }, [recordedAttendees])

  // Filtered animators for autocomplete/search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return filterAnimators(animators, searchQuery, categoryFilter)
      .filter((a) => !selectedIds.has(a.animator_ID) && !recordedIdsSet.has(a.animator_ID))
      .slice(0, 8)
  }, [animators, searchQuery, categoryFilter, selectedIds, recordedIdsSet])

  // Animators grouped by category for Checklist
  const groupedAnimators = useMemo(() => {
    const groups = {}
    animators.forEach((a) => {
      const cat = a.kategoria || 'Egyéb'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(a)
    })
    return groups
  }, [animators])

  // Duplicate check
  const duplicateCheck = useMemo(() => {
    return validateNoDuplicates(recordedAttendees, Array.from(selectedIds))
  }, [recordedAttendees, selectedIds])

  if (!isOpen || !event) return null

  const handleToggleSelect = (animatorId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(animatorId)) {
        next.delete(animatorId)
      } else {
        next.add(animatorId)
      }
      return next
    })
  }

  const handleSelectFromSearch = (animator) => {
    setSelectedIds((prev) => new Set(prev).add(animator.animator_ID))
    setSearchQuery('')
  }

  const handleProcessClipboard = () => {
    if (!clipboardText.trim()) return
    const result = matchAnimatorsByNames(animators, clipboardText)

    const newlyAdded = []
    result.matched.forEach((a) => {
      if (!recordedIdsSet.has(a.animator_ID)) {
        newlyAdded.push(a.animator_ID)
      }
    })

    setSelectedIds((prev) => {
      const next = new Set(prev)
      newlyAdded.forEach((id) => next.add(id))
      return next
    })

    setClipboardFeedback({
      matchedCount: result.matched.length,
      newlySelectedCount: newlyAdded.length,
      unmatched: result.unmatched
    })
  }

  const handleSaveAttendance = async () => {
    const idsToSave = Array.from(selectedIds)
    if (idsToSave.length === 0) return

    try {
      setSaving(true)
      const res = await jelenletService.saveBatchAttendance(event.esemeny_ID, idsToSave)

      // Refresh attendee list
      const updatedAttendees = await jelenletService.getAttendancesByEvent(event.esemeny_ID)
      setRecordedAttendees(updatedAttendees)
      setSelectedIds(new Set())
      setNotification({
        type: 'success',
        message: `${res.count || idsToSave.length} animátor jelenléte sikeresen rögzítve!`
      })

      if (onAttendanceUpdated) {
        onAttendanceUpdated(event.esemeny_ID, updatedAttendees.length)
      }
    } catch (err) {
      setNotification({ type: 'danger', message: err.message || 'Hiba a mentés során.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExisting = async (jelenletId, name) => {
    if (!window.confirm(`Biztosan törölni szeretnéd ${name} jelenlétét?`)) return

    try {
      await jelenletService.deleteAttendance(jelenletId)
      const updated = recordedAttendees.filter((a) => a.jelenlet_ID !== jelenletId)
      setRecordedAttendees(updated)
      setNotification({ type: 'success', message: `${name} jelenléte törölve.` })
      if (onAttendanceUpdated) {
        onAttendanceUpdated(event.esemeny_ID, updated.length)
      }
    } catch (err) {
      setNotification({ type: 'danger', message: err.message || 'Nem sikerült törölni a jelenlétet.' })
    }
  }

  // Animators currently selected for batch saving
  const selectedAnimatorsList = animators.filter((a) => selectedIds.has(a.animator_ID))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '820px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={22} color="var(--color-primary-600)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Jelenléti Ív Rögzítése</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{event.cim}</span>
              <span>&bull;</span>
              <span>{event.datum}</span>
              <span>&bull;</span>
              <span className={`type-badge badge-${event.tipus.replace(/\s+/g, '-')}`}>
                {event.tipus}
              </span>
            </div>
          </div>
          <button type="button" className="chip-remove" onClick={onClose} aria-label="Bezárás">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {notification && (
            <div className={`alert alert-${notification.type}`}>
              {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Keresés névre
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
            >
              <Users size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Gyors kijelölés (lista)
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'clipboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('clipboard')}
            >
              <Clipboard size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Névsor beillesztése
            </button>
          </div>

          {/* TAB 1: Search Autocomplete */}
          {activeTab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="search"
                  placeholder="Kezdj el gépelni egy animátor nevét (pl. Bolla Péter)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 30,
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}
                  >
                    {searchResults.map((animator) => (
                      <div
                        key={animator.animator_ID}
                        onClick={() => handleSelectFromSearch(animator)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--color-border-subtle)',
                          transition: 'background var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{animator.nev}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                            (#{animator.animator_ID})
                          </span>
                        </div>
                        {animator.kategoria && (
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-surface-hover)' }}>
                            {animator.kategoria}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Quick Checklist */}
          {activeTab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {Object.entries(groupedAnimators).map(([kategoria, animList]) => (
                <div key={kategoria} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    {kategoria} ({animList.length} fő)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {animList.map((animator) => {
                      const isRecorded = recordedIdsSet.has(animator.animator_ID)
                      const isSelected = selectedIds.has(animator.animator_ID)
                      return (
                        <label
                          key={animator.animator_ID}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-xs)',
                            cursor: isRecorded ? 'not-allowed' : 'pointer',
                            opacity: isRecorded ? 0.6 : 1,
                            backgroundColor: isSelected ? 'var(--color-primary-50)' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isRecorded || isSelected}
                            disabled={isRecorded}
                            onChange={() => handleToggleSelect(animator.animator_ID)}
                            style={{ width: '16px', height: '16px', minHeight: 'auto' }}
                          />
                          <span style={{ fontSize: '0.875rem' }}>{animator.nev}</span>
                          {isRecorded && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginLeft: 'auto' }}>
                              (rögzítve)
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Clipboard Paste */}
          {activeTab === 'clipboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Illessz be egy névsort Google Sheets-ből vagy szöveges listából (soronként egy név):
              </p>
              <textarea
                rows={5}
                placeholder="Bolla Péter&#10;Széwald Péter Tamás&#10;Kovács Anna"
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleProcessClipboard}
                style={{ alignSelf: 'flex-start' }}
              >
                <Sparkles size={16} />
                Nevek felismerése & Kijelölés
              </button>

              {clipboardFeedback && (
                <div style={{ fontSize: '0.875rem', padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <div>
                    Sikeresen felismert: <strong>{clipboardFeedback.matchedCount} fő</strong> (Ebből új kijelölés: {clipboardFeedback.newlySelectedCount} fő)
                  </div>
                  {clipboardFeedback.unmatched.length > 0 && (
                    <div style={{ color: 'var(--color-danger-text)', marginTop: '4px' }}>
                      Nem található az adatbázisban: {clipboardFeedback.unmatched.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected Candidates for Batch Save */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                Kijelölt animátorok ({selectedAnimatorsList.length} új fő)
              </h3>
              {selectedAnimatorsList.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedIds(new Set())}
                  style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '0.8125rem' }}
                >
                  Kijelölés törlése
                </button>
              )}
            </div>

            {selectedAnimatorsList.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                Nincs új animátor kiválasztva mentésre. Keress névre vagy válassz a listából!
              </p>
            ) : (
              <div className="chip-container">
                {selectedAnimatorsList.map((a) => (
                  <span key={a.animator_ID} className="chip">
                    <span>
                      #{a.animator_ID} - {a.nev}
                    </span>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => handleToggleSelect(a.animator_ID)}
                      title="Eltávolítás"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Already Recorded Attendees */}
          {recordedAttendees.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '8px' }}>
                Már rögzített jelenlétek ({recordedAttendees.length} fő)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {recordedAttendees.map((att) => (
                  <div
                    key={att.jelenlet_ID}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>{att.nev}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Jelenlét #{att.jelenlet_ID}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => handleDeleteExisting(att.jelenlet_ID, att.nev)}
                      title="Jelenlét törlése"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Bezárás
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveAttendance}
            disabled={saving || selectedAnimatorsList.length === 0}
          >
            {saving ? 'Mentés folyamatban...' : `Jelenléti ív mentése (${selectedAnimatorsList.length} új fő)`}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { X, Calendar, Tag, AlertCircle, PlusCircle, Pencil } from 'lucide-react'
import { EVENT_TYPES, createEventModel } from '../modell/eventModels.js'
import { eventService } from '../szolgaltatas/eventService.js'

export default function EventFormModal({ isOpen, onClose, onEventCreated, onEventUpdated, eventToEdit = null }) {
  const isEditing = Boolean(eventToEdit?.esemeny_ID)
  const [cim, setCim] = useState('')
  const [datum, setDatum] = useState(() => new Date().toISOString().split('T')[0])
  const [tipus, setTipus] = useState(EVENT_TYPES[0])
  const [nextId, setNextId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (isEditing && eventToEdit) {
        setCim(eventToEdit.cim || '')
        setDatum(eventToEdit.datum ? eventToEdit.datum.split(' ')[0] : new Date().toISOString().split('T')[0])
        setTipus(eventToEdit.tipus || EVENT_TYPES[0])
        setErrors({})
        setNextId(null)
        setLoading(false)
      } else {
        setCim('')
        setDatum(new Date().toISOString().split('T')[0])
        setTipus(EVENT_TYPES[0])
        setErrors({})
        setLoading(true)

        eventService
          .getNextEventId()
          .then((id) => setNextId(id))
          .catch(() => setNextId(null))
          .finally(() => setLoading(false))
      }
    }
  }, [isOpen, eventToEdit, isEditing])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validation = createEventModel({
      esemeny_ID: isEditing ? eventToEdit.esemeny_ID : undefined,
      cim,
      datum,
      tipus
    })
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      setLoading(true)
      if (isEditing) {
        const res = await eventService.updateEvent(eventToEdit.esemeny_ID, validation.value)
        if (typeof onEventUpdated === 'function') {
          onEventUpdated({
            esemeny_ID: eventToEdit.esemeny_ID,
            cim: validation.value.cim,
            datum: validation.value.datum,
            tipus: validation.value.tipus,
            attendeeCount: eventToEdit.attendeeCount ?? res.event?.attendeeCount ?? 0
          })
        }
        onClose()
      } else {
        const res = await eventService.createEvent(validation.value)
        if (typeof onEventCreated === 'function') {
          onEventCreated({
            esemeny_ID: res.esemeny_ID,
            cim: validation.value.cim,
            datum: validation.value.datum,
            tipus: validation.value.tipus,
            attendeeCount: 0
          })
        }
        onClose()
      }
    } catch (err) {
      setErrors({ form: err.message || 'Nem sikerült menteni az eseményt.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEditing ? (
              <Pencil size={22} color="var(--color-primary-600)" />
            ) : (
              <PlusCircle size={22} color="var(--color-primary-600)" />
            )}
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
              {isEditing ? 'Esemény Módosítása' : 'Új Esemény Létrehozása'}
            </h2>
          </div>
          <button
            type="button"
            className="chip-remove"
            onClick={onClose}
            aria-label="Bezárás"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {isEditing ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-200)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  color: 'var(--color-primary-700)',
                  fontWeight: 600,
                  width: 'fit-content'
                }}
              >
                Szerkesztés alatt: Esemény #{eventToEdit?.esemeny_ID}
              </div>
            ) : (
              nextId && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-200)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    color: 'var(--color-primary-700)',
                    fontWeight: 600,
                    width: 'fit-content'
                  }}
                >
                  Következő Esemény ID: #{nextId}
                </div>
              )
            )}

            {errors.form && (
              <div className="alert alert-danger">
                <AlertCircle size={18} />
                <span>{errors.form}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                Esemény Neve *
              </label>
              <input
                type="text"
                placeholder="Pl. Pázmány nap, Tisztújító Közgyűlés, Közgyűlés..."
                value={cim}
                onChange={(e) => {
                  setCim(e.target.value)
                  if (errors.cim) setErrors({ ...errors, cim: undefined })
                }}
                autoFocus
                required
              />
              {errors.cim && (
                <span style={{ display: 'block', color: 'var(--color-danger-text)', fontSize: '0.8125rem', marginTop: '4px' }}>
                  {errors.cim}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                Dátum *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => {
                    setDatum(e.target.value)
                    if (errors.datum) setErrors({ ...errors, datum: undefined })
                  }}
                  required
                />
              </div>
              {errors.datum && (
                <span style={{ display: 'block', color: 'var(--color-danger-text)', fontSize: '0.8125rem', marginTop: '4px' }}>
                  {errors.datum}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                Típus *
              </label>
              <select
                value={tipus}
                onChange={(e) => {
                  setTipus(e.target.value)
                  if (errors.tipus) setErrors({ ...errors, tipus: undefined })
                }}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {isEditing && (
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  A módosított adatok azonnal megjelennek a központi listán és a résztvevők Idővonalán is.
                </div>
              )}
              {errors.tipus && (
                <span style={{ display: 'block', color: 'var(--color-danger-text)', fontSize: '0.8125rem', marginTop: '4px' }}>
                  {errors.tipus}
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Mégse
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Mentés...' : isEditing ? 'Módosítások Mentése' : 'Esemény Mentése'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

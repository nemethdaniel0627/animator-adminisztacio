import { useState, useEffect, useMemo } from 'react'
import { PlusCircle, Search, Calendar, Users, Filter, UserCheck, AlertCircle, Award, Eye, X, Pencil } from 'lucide-react'
import { EVENT_TYPES } from '../modell/eventModels.js'
import { eventService } from '../szolgaltatas/eventService.js'
import EventFormModal from './EventFormModal.jsx'
import TisztujitasModal from './TisztujitasModal.jsx'
import AttendanceManager from '../../jelenlet/felulet/AttendanceManager.jsx'
import { apiClient } from '../../../common/api/apiClient.js'

export default function EventList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTisztujitasModalOpen, setIsTisztujitasModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState(null)
  const [viewingPositionsEvent, setViewingPositionsEvent] = useState(null)
  const [positionsList, setPositionsList] = useState([])
  const [loadingPositions, setLoadingPositions] = useState(false)

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await eventService.getEvents()
      setEvents(data)
    } catch (err) {
      setError(err.message || 'Nem sikerült betölteni az eseményeket.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        (ev.cim || '').toLowerCase().includes(query) ||
        String(ev.esemeny_ID || '').includes(query)

      const matchesType = selectedType === 'ALL' || ev.tipus === selectedType

      return matchesSearch && matchesType
    })
  }, [events, searchQuery, selectedType])

  const handleEventUpdated = (updated) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.esemeny_ID === updated.esemeny_ID
          ? { ...e, ...updated, attendeeCount: e.attendeeCount ?? updated.attendeeCount ?? 0 }
          : e
      )
    )
    setEditingEvent(null)
  }

  const handleEventCreated = (newEvent) => {
    setEvents((prev) => [newEvent, ...prev])
    // Offer to manage attendances for regular events
    if (newEvent.tipus !== 'tisztújítás') {
      setSelectedEventForAttendance(newEvent)
    }
  }

  const handleAttendanceUpdated = (eventId, newCount) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.esemeny_ID === eventId ? { ...ev, attendeeCount: newCount } : ev))
    )
  }

  const handleOpenPositions = async (event) => {
    setViewingPositionsEvent(event)
    setLoadingPositions(true)
    try {
      const pos = await apiClient.getEventPositions(event.esemeny_ID)
      setPositionsList(pos || [])
    } catch (err) {
      console.error(err)
      setPositionsList([])
    } finally {
      setLoadingPositions(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Események & Jelenlét</h1>
          <p style={{ marginTop: '4px', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
            Események nyilvántartása, tisztújítások és jelenléti ívek kezelése.
          </p>
        </div>

        {/* Action Buttons: Új esemény and Új tisztújítás */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusCircle size={18} />
            <span>+ Új esemény</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setIsTisztujitasModalOpen(true)}
            style={{
              backgroundColor: '#851b22',
              color: '#ffffff',
              border: 'none',
              boxShadow: 'var(--shadow-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="Új tisztújítás rögzítése és vezetőségi pozíciók kiosztása"
          >
            <Award size={18} />
            <span>+ Új tisztújítás</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="search"
            placeholder="Keresés esemény nevére vagy ID-ra..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ flex: '0 1 220px' }}>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">Összes eseménytípus</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {events.length > 0 && (
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
            Összesen: <strong>{filteredEvents.length}</strong> / {events.length} esemény
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadEvents}
            style={{ marginLeft: 'auto', minHeight: 'auto' }}
          >
            Újrapróbálás
          </button>
        </div>
      )}

      {/* Events Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
          Események betöltése...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Calendar size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px' }}>Nincs találat</h3>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
            A megadott szűrési feltételeknek egyetlen esemény sem felel meg.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('')
              setSelectedType('ALL')
            }}
          >
            Szűrők törlése
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Esemény Neve</th>
                <th>Dátum</th>
                <th>Típus</th>
                <th style={{ textAlign: 'center' }}>Résztvevők</th>
                <th style={{ textAlign: 'right' }}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev.esemeny_ID}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    #{ev.esemeny_ID}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {ev.cim}
                      </span>
                      {ev.tipus === 'tisztújítás' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(133, 27, 34, 0.1)',
                            color: '#851b22',
                            border: '1px solid rgba(133, 27, 34, 0.3)'
                          }}
                        >
                          Vezetőségválasztás
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {ev.datum}
                  </td>
                  <td>
                    <span className={`type-badge badge-${(ev.tipus || '').replace(/\s+/g, '-')}`}>
                      {ev.tipus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        backgroundColor: (ev.attendeeCount || 0) > 0 ? 'var(--color-primary-50)' : 'var(--color-surface-hover)',
                        color: (ev.attendeeCount || 0) > 0 ? 'var(--color-primary-700)' : 'var(--color-text-muted)'
                      }}
                    >
                      <Users size={14} />
                      {ev.attendeeCount || 0} fő
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setEditingEvent(ev)}
                        style={{ padding: '6px 10px', minHeight: '36px', fontSize: '0.8125rem' }}
                        title="Esemény adatainak szerkesztése (név, dátum, típus)"
                      >
                        <Pencil size={15} />
                        <span>Szerkesztés</span>
                      </button>
                      {ev.tipus === 'tisztújítás' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenPositions(ev)}
                          style={{ padding: '6px 10px', minHeight: '36px', fontSize: '0.8125rem' }}
                          title="Kiosztott vezetőségi pozíciók megtekintése"
                        >
                          <Award size={15} color="#851b22" />
                          <span>Pozíciók</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectedEventForAttendance(ev)}
                        style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.8125rem' }}
                      >
                        <UserCheck size={16} />
                        <span>Jelenlét</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Regular Event Creation & Editing Modal */}
      <EventFormModal
        isOpen={isCreateModalOpen || Boolean(editingEvent)}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingEvent(null)
        }}
        onEventCreated={handleEventCreated}
        onEventUpdated={handleEventUpdated}
        eventToEdit={editingEvent}
      />

      {/* Specialized Tisztújítás Modal with Leadership Position Picker */}
      <TisztujitasModal
        isOpen={isTisztujitasModalOpen}
        onClose={() => setIsTisztujitasModalOpen(false)}
        onEventCreated={handleEventCreated}
      />

      {/* View Positions Modal for a Tisztújítás */}
      {viewingPositionsEvent && (
        <div className="modal-backdrop" onClick={() => setViewingPositionsEvent(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#851b22', textTransform: 'uppercase' }}>
                  Tisztújítás Pozíciói
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  {viewingPositionsEvent.cim}
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setViewingPositionsEvent(null)}
                aria-label="Bezárás"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              {loadingPositions ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                  Pozíciók betöltése...
                </div>
              ) : positionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Nincsenek rögzített pozíciók ehhez a tisztújításhoz.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {positionsList.map((pos) => (
                    <div
                      key={pos.pozicio_ID}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-surface-hover)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {pos.animator_nev}
                      </span>
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingPositionsEvent(null)}
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Manager Modal */}
      {selectedEventForAttendance && (
        <AttendanceManager
          event={selectedEventForAttendance}
          isOpen={Boolean(selectedEventForAttendance)}
          onClose={() => setSelectedEventForAttendance(null)}
          onAttendanceUpdated={handleAttendanceUpdated}
        />
      )}
    </div>
  )
}

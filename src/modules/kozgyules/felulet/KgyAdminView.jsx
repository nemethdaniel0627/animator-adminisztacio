import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users,
  Vote,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  RotateCcw,
  BarChart2,
  Power,
  PowerOff,
  Lock,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  CalendarCheck,
  CheckCheck
} from 'lucide-react'
import ConfirmModal from '../../../common/components/ConfirmModal.jsx'
import { useAuth } from '../../../common/context/AuthContext.jsx'
import { kgyService, getPollResults, getQuorumInfo } from '../szolgaltatas/kgyService.js'
import { eventService } from '../../events/szolgaltatas/eventService.js'
import { jelenletService } from '../../jelenlet/szolgaltatas/jelenletService.js'

// Compact, expandable attendee breakdown for finalization modal to prevent endless lists
function FinalizeModalContent({ attendeeNames, todayFormatted }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const count = attendeeNames.length
  const previewLimit = 3
  const previewText = attendeeNames.slice(0, previewLimit).join(', ')
  const remaining = count - previewLimit

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>• <strong>Esemény címe:</strong> Közgyűlés</div>
        <div>• <strong>Dátum:</strong> {todayFormatted}</div>
        <div>• <strong>Esemény típusa:</strong> közgyűlés</div>
        <div>
          • <strong>Jelenlévők ({count} fő):</strong>{' '}
          {count <= previewLimit ? (
            <span>{attendeeNames.join(', ')}</span>
          ) : (
            <span>
              {previewText}{' '}
              <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                ...és további {remaining} fő
              </span>
            </span>
          )}
        </div>
      </div>

      {count > previewLimit && (
        <div style={{ marginTop: '2px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--color-primary-600)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'underline'
            }}
          >
            {isExpanded
              ? '▲ Névsor összecsukása'
              : `▼ Teljes névsor megtekintése (${count} fő)`}
          </button>

          {isExpanded && (
            <div
              style={{
                marginTop: '8px',
                maxHeight: '110px',
                overflowY: 'auto',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              {attendeeNames.map((name, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.4
        }}
      >
        A művelet során az esemény bekerül az adatbázisba, és minden jelenlévő animátor Idővonalán megjelenik a jelenléti bejegyzés. A jelenléti ív lezárásra kerül.
      </div>
    </div>
  )
}

export default function KgyAdminView() {
  const { animators, isAdmin, currentUser } = useAuth()
  const [state, setState] = useState(() => kgyService.getState())
  const [optionInputs, setOptionInputs] = useState({})
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeSuccess, setFinalizeSuccess] = useState(null)

  // Real-time synchronization across normal tabs, incognito windows and devices
  useEffect(() => {
    const stopAutoSync = kgyService.startAutoSync((remoteState) => {
      setState(remoteState)
    }, 1200)

    const handleStateChange = (e) => {
      if (e?.detail) setState(e.detail)
      else setState(kgyService.getState())
    }

    const handleStorage = (e) => {
      if (e.key === 'animator_kgy_state_v1') {
        setState(kgyService.getState())
      }
    }

    window.addEventListener('kgy_state_change', handleStateChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      stopAutoSync()
      window.removeEventListener('kgy_state_change', handleStateChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Attendance toggle
  const handleToggleAttendance = () => {
    const updated = kgyService.toggleAttendance()
    setState(updated)
  }

  // Summary toggle
  const handleToggleSummary = () => {
    const updated = kgyService.toggleSummary()
    setState(updated)
  }

  // Execute finalization of KGY: creates event and records batch attendances
  const executeFinalizeKgy = async () => {
    setFinalizing(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      // 1. Create event in database
      const created = await eventService.createEvent({
        cim: 'Közgyűlés',
        datum: todayStr,
        tipus: 'közgyűlés'
      })

      const eventId = created.esemeny_ID || created.event?.esemeny_ID

      // 2. Write attendance to every attendee's timeline
      if (state.attendees && state.attendees.length > 0) {
        await jelenletService.saveBatchAttendance(eventId, state.attendees)
      }

      // 3. Mark finalized in kgyService & notify all clients
      const updated = kgyService.finalizeKgy(eventId)
      setState(updated)

      // 4. Set success feedback banner
      setFinalizeSuccess({
        eventId,
        count: state.attendees.length,
        datum: todayStr
      })
    } catch (err) {
      console.error('Finalize error:', err)
      alert('Hiba történt a közgyűlés lezárásakor: ' + (err.message || 'Ismeretlen hiba'))
    } finally {
      setFinalizing(false)
    }
  }

  // Open confirmation modal for finalizing
  const handleOpenFinalizeConfirm = () => {
    if (state.attendees.length === 0) {
      alert('Nem zárható le a közgyűlés: nincs egyetlen regisztrált jelenlévő sem a jelenléti íven.')
      return
    }

    const attendeeNames = state.attendees.map((id) => {
      const a = animators.find((anim) => Number(anim.animator_ID) === Number(id))
      return a ? a.nev : `Animátor #${id}`
    })

    const todayFormatted = new Date().toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

    setConfirmConfig({
      title: 'Közgyűlés lezárása és rögzítése',
      message: 'Biztosan véglegesíted a mai közgyűlést, létrehozod az eseményt és beírod a jelenléteket az idővonalakra?',
      details: <FinalizeModalContent attendeeNames={attendeeNames} todayFormatted={todayFormatted} />,
      confirmText: 'Közgyűlés véglegesítése & rögzítés',
      cancelText: 'Mégse',
      variant: 'success',
      icon: CalendarCheck,
      onConfirm: executeFinalizeKgy
    })
  }

  // Middle action buttons
  const handleRestartKgy = () => {
    setConfirmConfig({
      title: 'Közgyűlés újraindítása',
      message: 'Biztosan újraindítod a közgyűlést?',
      details: 'A jelenléti ív és az összes eddig leadott szavazat törlődik. Ez a folyamat nem vonható vissza.',
      confirmText: 'Igen, újraindítás',
      cancelText: 'Mégse',
      variant: 'danger',
      icon: RotateCcw,
      onConfirm: () => {
        const updated = kgyService.restartKgy()
        setState(updated)
      }
    })
  }

  const handleClearPolls = () => {
    setConfirmConfig({
      title: 'Kérdések törlése',
      message: 'Biztosan törlöd az összes szavazási kérdést?',
      details: 'Az összes létrehozott kérdés és az eddigi szavazatok törlődnek a rendszerből.',
      confirmText: 'Igen, kérdések törlése',
      cancelText: 'Mégse',
      variant: 'danger',
      icon: Trash2,
      onConfirm: () => {
        const updated = kgyService.clearPolls()
        setState(updated)
      }
    })
  }

  const handleAddPoll = () => {
    const updated = kgyService.addPoll()
    setState(updated)
  }

  const handleRemoveLastPoll = () => {
    const updated = kgyService.removeLastPoll()
    setState(updated)
  }

  // Poll management
  const handleTitleChange = (pollId, title) => {
    const updated = kgyService.updatePollTitle(pollId, title)
    setState(updated)
  }

  const handleAddOption = (pollId) => {
    const text = (optionInputs[pollId] || '').trim()
    if (!text) return
    const updated = kgyService.addOption(pollId, text)
    setState(updated)
    setOptionInputs((prev) => ({ ...prev, [pollId]: '' }))
  }

  const handleRemoveOption = (pollId, optIdx) => {
    const updated = kgyService.removeOption(pollId, optIdx)
    setState(updated)
  }

  // 3-way toggle per poll: Inaktív -> Aktív -> Eredmények -> Inaktív
  const handleCyclePoll = (pollId) => {
    const updated = kgyService.cyclePollStatus(pollId)
    setState(updated)
  }

  // Direct status set for segmented control
  const handleSetPollStatus = (pollId, nextStatus) => {
    const currentState = kgyService.getState()
    currentState.polls = currentState.polls.map((p) => {
      if (p.id === pollId) {
        return { ...p, status: nextStatus }
      } else {
        if (nextStatus === 'active' && p.status === 'active') {
          return { ...p, status: 'deactivated' }
        }
        return p
      }
    })
    kgyService.saveState(currentState)
    setState(currentState)
  }

  // Top bar quick toggle for active poll
  const handleTogglePollActive = (pollId) => {
    const updated = kgyService.togglePollActive(pollId)
    setState(updated)
  }

  const quorum = getQuorumInfo(state.attendees.length, animators)
  const activePoll = state.polls.find((p) => p.status === 'active')
  const totalVotesCast = state.polls.reduce((acc, p) => acc + Object.keys(p.votes || {}).length, 0)
  const quorumPercent = Math.min(100, Math.round((quorum.presentCount / quorum.totalActive) * 100))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header matching existing site design */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Közgyűlés Adminisztráció</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: state.isAttendanceActive ? 'rgba(22, 163, 74, 0.12)' : 'var(--color-surface-hover)',
                color: state.isAttendanceActive ? '#15803d' : 'var(--color-text-secondary)',
                border: `1px solid ${state.isAttendanceActive ? 'rgba(22, 163, 74, 0.3)' : 'var(--color-border)'}`
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: state.isAttendanceActive ? '#16a34a' : '#94a3b8'
                }}
              />
              {state.isFinalized
                ? `Közgyűlés Lezárva (ID: #${state.finalizedEventId})`
                : state.isAttendanceActive
                ? 'Jelenléti ív Aktív'
                : 'Jelenléti ív Inaktív'}
            </span>
          </div>
          <p style={{ marginTop: '4px', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
            Közgyűlési jelenléti ív vezetése, határozatképesség élő számítása, szavazások indítása és összegzése.
          </p>
        </div>

        {/* Top Action Buttons matching design tokens */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* External link to User Side (/kgy) */}
          <NavLink
            to="/kgy"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            title="Felhasználói nézet megnyitása új ablakban (/kgy)"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={16} />
            <span>Felhasználói oldal (/kgy)</span>
          </NavLink>

          {/* Toggle Summary Button */}
          <button
            type="button"
            onClick={handleToggleSummary}
            className="btn"
            style={{
              backgroundColor: state.isSummaryActive ? 'var(--color-primary-600)' : 'var(--color-surface)',
              color: state.isSummaryActive ? '#ffffff' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <BarChart2 size={16} />
            <span>{state.isSummaryActive ? 'Összegzés elrejtése' : 'Összegzés megjelenítése'}</span>
          </button>

          {/* Restart KGY */}
          <button
            type="button"
            onClick={handleRestartKgy}
            className="btn btn-secondary"
            title="Közgyűlés újraindítása (jelenlét és szavazatok törlése)"
          >
            <RotateCcw size={16} />
            <span>(Újra)kezdés</span>
          </button>
        </div>
      </div>

      {/* Finalize Success Notification Banner */}
      {finalizeSuccess && (
        <div
          className="alert alert-success"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            color: '#15803d',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#14532d' }}>
                Közgyűlés sikeresen lezárva és elmentve az adatbázisba!
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '2px', color: '#166534' }}>
                Létrehozott esemény: <strong>Közgyűlés (ID: #{finalizeSuccess.eventId})</strong> | Dátum: {finalizeSuccess.datum} | <strong>{finalizeSuccess.count} fő</strong> jelenléte rögzítve lett az idővonalakra.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NavLink
              to="/timeline"
              className="btn btn-primary"
              style={{
                backgroundColor: '#15803d',
                borderColor: '#15803d',
                padding: '6px 14px',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Ugrás az Idővonalra</span>
              <ArrowRight size={14} />
            </NavLink>
            <button
              type="button"
              onClick={() => setFinalizeSuccess(null)}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.875rem', color: '#15803d' }}
              title="Értesítés bezárása"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Card 1: Attendance & Quorum */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Users size={18} color="var(--color-primary-600)" />
              <span>Jelenlét & Határozatképesség</span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: quorum.isQuorum ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                color: quorum.isQuorum ? '#15803d' : '#b45309',
                border: `1px solid ${quorum.isQuorum ? 'rgba(22, 163, 74, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`
              }}
            >
              {quorum.isQuorum ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {quorum.isQuorum ? 'Határozatképes' : 'Nem határozatképes'}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                {quorum.presentCount}
              </span>
              <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
                / {quorum.totalActive} aktív animátorból
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: quorum.isQuorum ? '#15803d' : '#b45309', fontWeight: 500 }}>
              {quorum.quorumText} (Szükséges: legalább {Math.floor(quorum.totalActive / 2) + 1} fő)
            </p>
          </div>

          {/* Quorum Progress Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: '9999px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${quorumPercent}%`,
                  height: '100%',
                  backgroundColor: quorum.isQuorum ? '#16a34a' : '#d97706',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
              {/* 50% Threshold marker */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  zIndex: 2
                }}
                title="50% határozatképességi küszöb"
              />
            </div>
          </div>

          {/* Attendance Toggle Button */}
          <button
            type="button"
            onClick={handleToggleAttendance}
            className="btn"
            style={{
              width: '100%',
              marginTop: '4px',
              backgroundColor: state.isAttendanceActive ? 'var(--color-surface)' : 'var(--color-primary-600)',
              color: state.isAttendanceActive ? '#b45309' : '#ffffff',
              border: state.isAttendanceActive ? '1px solid #fde68a' : 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {state.isAttendanceActive ? (
              <>
                <PowerOff size={16} />
                <span>Jelenléti ív deaktiválása</span>
              </>
            ) : (
              <>
                <Power size={16} />
                <span>Jelenléti ív aktiválása</span>
              </>
            )}
          </button>

          {/* Dedicated Finalize Box inside Attendance Card */}
          <div
            style={{
              marginTop: '6px',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {state.isFinalized ? 'Státusz: Lezárva & rögzítve' : `${state.attendees.length} fő regisztrálva jelenlétre`}
              </span>
              {state.finalizedEventId && (
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  Esemény ID: #{state.finalizedEventId}
                </span>
              )}
            </div>

            {!state.isFinalized ? (
              <button
                type="button"
                onClick={handleOpenFinalizeConfirm}
                disabled={finalizing || state.attendees.length === 0}
                className="btn"
                style={{
                  width: '100%',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-xs)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: state.attendees.length === 0 ? 0.6 : 1
                }}
                title={state.attendees.length === 0 ? 'Nincs jelenlévő rögzítve' : 'Közgyűlés lezárása és jelenlétek rögzítése az idővonalakra'}
              >
                <CalendarCheck size={16} />
                <span>Közgyűlés lezárása & rögzítés az idővonalakra</span>
              </button>
            ) : (
              <NavLink
                to="/timeline"
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ArrowRight size={16} />
                <span>Megtekintés az Idővonalon</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Card 2: Active Poll Status & Quick Toggle */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Vote size={18} color="#d97706" />
              <span>Szavazás állapota</span>
            </div>
            {activePoll ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  color: '#b45309',
                  border: '1px solid rgba(217, 119, 6, 0.3)'
                }}
              >
                ● Aktív
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-surface-hover)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)'
                }}
              >
                Inaktív
              </span>
            )}
          </div>

          <div>
            {activePoll ? (
              <>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  #{activePoll.id}. {activePoll.title || '(Cím nélkül)'}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  A tagok jelenleg szavazhatnak a /kgy felületen.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Nincs aktív szavazás
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Válassz ki egy kérdést a listából és kapcsold át "Aktív" állapotra!
                </p>
              </>
            )}
          </div>

          <div style={{ marginTop: 'auto' }}>
            {activePoll ? (
              <button
                type="button"
                onClick={() => handleTogglePollActive(activePoll.id)}
                className="btn btn-secondary"
                style={{ width: '100%', borderColor: '#d97706', color: '#b45309' }}
              >
                <PowerOff size={16} />
                <span>#{activePoll.id}. Szavazás deaktiválása</span>
              </button>
            ) : state.polls.length > 0 ? (
              <button
                type="button"
                onClick={() => handleTogglePollActive(state.polls[0].id)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <Power size={16} />
                <span>1. Szavazás aktiválása</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddPoll}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <Plus size={16} />
                <span>Új szavazás létrehozása</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Quick Stats & Management */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
            <Sparkles size={18} color="var(--color-primary-600)" />
            <span>Kérdések & Szavazatok</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Kérdések
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {state.polls.length} db
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Leadott szavazat
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {totalVotesCast} db
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={handleAddPoll}
              className="btn btn-primary"
              style={{ flex: 1, backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <Plus size={16} />
              <span>Új szavazás</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveLastPoll}
              disabled={state.polls.length === 0}
              className="btn btn-secondary"
              title="Utolsó szavazás törlése"
              style={{ color: 'var(--color-danger-text)' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary View matching screenshot requirement */}
      {state.isSummaryActive && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--color-primary-600)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={20} color="var(--color-primary-600)" />
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
                Összegzés megjelenítése megtörtént.
              </h2>
            </div>
            <button
              type="button"
              onClick={handleToggleSummary}
              className="btn btn-ghost"
              style={{ fontSize: '0.8125rem' }}
            >
              Bezárás
            </button>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            <div><strong>Jelenlevők száma:</strong> {quorum.presentCount}</div>
            <div>{quorum.totalActive} aktív animátorból {quorum.presentCount} fő van jelen.</div>
            <div style={{ fontWeight: 600, color: quorum.isQuorum ? '#15803d' : '#b45309' }}>
              {quorum.quorumText}
            </div>
          </div>

          {/* Polls Summary List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {state.polls.map((poll) => {
              const res = getPollResults(poll)
              return (
                <div key={poll.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                      #{poll.id}. Szavazás: {poll.title || '(Cím nélkül)'}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {res.totalVotes} szavazat érkezett
                    </span>
                  </div>

                  {!res.hasVotes ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Nem érkezett be szavazat.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {Object.entries(res.counts).map(([opt, count]) => {
                        const pct = res.totalVotes > 0 ? Math.round((count / res.totalVotes) * 100) : 0
                        return (
                          <div key={opt} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                              <span>
                                {opt === 'Tartózkodom' ? <em>Tartózkodom</em> : opt}
                              </span>
                              <strong>{count} szavazat ({pct}%)</strong>
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor: opt === 'Tartózkodom' ? '#94a3b8' : 'var(--color-primary-600)',
                                  borderRadius: '9999px'
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Polls Management Section matching existing site cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              Közgyűlési szavazások ({state.polls.length})
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              A 3-állapotú gombbal válthatsz Inaktív, Aktív és Eredmény nézet között.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleClearPolls}
              className="btn btn-ghost"
              style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}
            >
              Kérdések törlése
            </button>
            <button
              type="button"
              onClick={handleAddPoll}
              className="btn btn-primary"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <Plus size={16} />
              <span>+ Új szavazás beszúrása</span>
            </button>
          </div>
        </div>

        {/* List of Polls in Cards */}
        {state.polls.length === 0 ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Vote size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Jelenleg nincs létrehozott szavazás.</p>
            <p style={{ margin: '6px 0 16px', fontSize: '0.875rem' }}>Hozz létre új szavazást a fenti gombra kattintva.</p>
            <button type="button" onClick={handleAddPoll} className="btn btn-primary">
              <Plus size={16} />
              <span>Új szavazás beszúrása</span>
            </button>
          </div>
        ) : (
          state.polls.map((poll) => {
            const results = getPollResults(poll)
            const isActive = poll.status === 'active'
            const isResults = poll.status === 'results'

            return (
              <div
                key={poll.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  borderLeft: isActive
                    ? '4px solid #d97706'
                    : isResults
                    ? '4px solid #16a34a'
                    : '4px solid var(--color-border)',
                  boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                }}
              >
                {/* Poll Header: Number, Title input & 3-way segmented toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--color-surface-hover)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        {poll.id}. Szavazás
                      </span>

                      {/* Status indicator badge */}
                      {isActive && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(217, 119, 6, 0.15)',
                            color: '#b45309',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                          Válaszolható a felhasználóknak
                        </span>
                      )}

                      {isResults && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(22, 163, 74, 0.15)',
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Eredmények megtekintése
                        </span>
                      )}
                    </div>

                    {/* Question / Title Input */}
                    <input
                      type="text"
                      value={poll.title}
                      onChange={(e) => handleTitleChange(poll.id, e.target.value)}
                      placeholder="Add meg a szavazás kérdését..."
                      style={{
                        fontWeight: 600,
                        fontSize: '1.0625rem'
                      }}
                    />
                  </div>

                  {/* 3-way Segmented Button matching user requirement */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        padding: '3px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSetPollStatus(poll.id, 'deactivated')}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-xs)',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: poll.status === 'deactivated' ? 'var(--color-surface)' : 'transparent',
                          color: poll.status === 'deactivated' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          boxShadow: poll.status === 'deactivated' ? 'var(--shadow-xs)' : 'none'
                        }}
                      >
                        Inaktív (Zárt)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetPollStatus(poll.id, 'active')}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-xs)',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: poll.status === 'active' ? '#d97706' : 'transparent',
                          color: poll.status === 'active' ? '#ffffff' : 'var(--color-text-secondary)',
                          boxShadow: poll.status === 'active' ? 'var(--shadow-xs)' : 'none'
                        }}
                      >
                        Aktív (Szavazható)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetPollStatus(poll.id, 'results')}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-xs)',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: poll.status === 'results' ? 'var(--color-primary-600)' : 'transparent',
                          color: poll.status === 'results' ? '#ffffff' : 'var(--color-text-secondary)',
                          boxShadow: poll.status === 'results' ? 'var(--shadow-xs)' : 'none'
                        }}
                      >
                        Eredmény nézet
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCyclePoll(poll.id)}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '2px 6px', color: 'var(--color-text-muted)' }}
                      title="Kattints az állapotok léptetéséhez: Inaktív -> Aktív -> Eredmény nézet"
                    >
                      <RotateCcw size={11} />
                      <span>Állapot léptetése (3-way cycle)</span>
                    </button>
                  </div>
                </div>

                {/* Options Manager */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Válasz-opciók:
                  </div>

                  {/* Options Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {/* User-defined options */}
                    {poll.options.map((opt, optIdx) => (
                      <span
                        key={optIdx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-surface-hover)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(poll.id, optIdx)}
                          title="Opció törlése"
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: '0 2px',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            lineHeight: 1
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {/* Automatic Default Tartózkodom Option */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(100, 116, 139, 0.12)',
                        border: '1px dashed var(--color-border)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)'
                      }}
                      title="Alapértelmezett, nem törölhető opció"
                    >
                      <Lock size={12} />
                      <span>Tartózkodom</span>
                    </span>
                  </div>

                  {/* Add Option Input Row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '420px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="Új válasz-opció megadása (pl. Igen, Nem)..."
                      value={optionInputs[poll.id] || ''}
                      onChange={(e) => setOptionInputs({ ...optionInputs, [poll.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddOption(poll.id)
                        }
                      }}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.875rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOption(poll.id)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                    >
                      <Plus size={16} />
                      <span>Hozzáadás</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    <Info size={14} />
                    <span>+ A rendszer a "tartózkodom" opciót automatikusan hozzáadja.</span>
                  </div>
                </div>

                {/* Vote Results Breakdown on the Card */}
                {(isResults || results.hasVotes) && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface-hover)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        Szavazás állása ({results.totalVotes} szavazat)
                      </span>
                      {results.totalVotes === 0 && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          Nem érkezett be szavazat.
                        </span>
                      )}
                    </div>

                    {results.hasVotes && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(results.counts).map(([opt, count]) => {
                          const pct = results.totalVotes > 0 ? Math.round((count / results.totalVotes) * 100) : 0
                          return (
                            <div key={opt} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                <span>{opt}</span>
                                <strong>{count} szavazat ({pct}%)</strong>
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-surface)', borderRadius: '9999px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    backgroundColor: opt === 'Tartózkodom' ? '#94a3b8' : 'var(--color-primary-600)',
                                    borderRadius: '9999px'
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      {/* Unique Custom Confirmation Modal */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={Boolean(confirmConfig)}
          onClose={() => setConfirmConfig(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          details={confirmConfig.details}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          variant={confirmConfig.variant}
          icon={confirmConfig.icon}
        />
      )}
    </div>
  )
}

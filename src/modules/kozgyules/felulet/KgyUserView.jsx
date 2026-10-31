import { useState, useEffect } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ShieldAlert, BarChart2, Check, RefreshCw, LogOut } from 'lucide-react'
import BrandLogo from '../../../common/components/BrandLogo.jsx'
import { useAuth } from '../../../common/context/AuthContext.jsx'
import { kgyService, getPollResults } from '../szolgaltatas/kgyService.js'

export default function KgyUserView() {
  const { currentUser, loading, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const [state, setState] = useState(() => kgyService.getState())
  const [selectedOption, setSelectedOption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)

  

  // Listen to state changes from other tabs, incognito windows or server
  useEffect(() => {
    const stopAutoSync = kgyService.startAutoSync((remoteState) => {
      setState(remoteState)
    }, 1200)

    const handleStateChange = (e) => {
      if (e?.detail) {
        setState(e.detail)
      } else {
        setState(kgyService.getState())
      }
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

  // Automatically register attendance if attendance sheet is active
  useEffect(() => {
    if (currentUser?.animator_ID && state.isAttendanceActive) {
      if (!state.attendees.includes(currentUser.animator_ID)) {
        const updated = kgyService.registerAttendance(currentUser.animator_ID)
        setState(updated)
      }
    }
  }, [currentUser?.animator_ID, state.isAttendanceActive, state.attendees])

  // Sync selectedOption with existing vote if available
  const activePoll = state.polls.find((p) => p.status === 'active')
  const resultsPolls = state.polls.filter((p) => p.status === 'results')
  const currentUserVote = activePoll?.votes?.[currentUser?.animator_ID]

  useEffect(() => {
    if (currentUserVote && !selectedOption) {
      setSelectedOption(currentUserVote)
    }
  }, [currentUserVote, selectedOption])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F6F4E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333'
        }}
      >
        Betöltés...
      </div>
    )
  }

  // Permission Check:
  // "In the user side, basic users can access it that are in the database, and not 'ex' státusz"
  // "If they do not have permission, then there is a dark blue and text that says they do not have permission"
  const isEx = (currentUser?.statusz || '').toLowerCase() === 'ex'
  const hasPermission = Boolean(currentUser && currentUser.animator_ID && !isEx)

  if (!hasPermission) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#060E20',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <BrandLogo width={90} height={66} showText={false} color="#f43f5e" />
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '480px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
            <ShieldAlert size={28} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Nincs jogosultságod
            </h1>
          </div>
          <p style={{ fontSize: '1.0625rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
            {isEx
              ? "A közgyűlés felületét 'ex' státuszú tagok nem látogathatják."
              : 'A közgyűlés felületéhez csak az adatbázisban szereplő animátorok férhetnek hozzá.'}
          </p>
          <NavLink
            to="/timeline"
            style={{
              marginTop: '16px',
              color: '#38bdf8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
              fontWeight: 500
            }}
          >
            ← Vissza az Idővonalra
          </NavLink>
        </div>
      </div>
    )
  }

  const hasVotedActivePoll = Boolean(currentUserVote)
  const activePollOptions = activePoll ? [...(activePoll.options || []), 'Tartózkodom'] : []
  const hasChangedSelection = Boolean(hasVotedActivePoll && selectedOption && selectedOption !== currentUserVote)

  const handleVoteSubmit = (e) => {
    e.preventDefault()
    if (!activePoll || !selectedOption) return
    setSubmitting(true)
    const updated = kgyService.submitVote(activePoll.id, currentUser.animator_ID, selectedOption)
    setState(updated)
    setSubmitting(false)
    setJustUpdated(true)
    setTimeout(() => setJustUpdated(false), 3000)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F6F4E8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative'
      }}
    >
      {/* Discreet top bar navigation */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <NavLink
          to="/timeline"
          style={{
            fontSize: '0.8125rem',
            color: '#666',
            textDecoration: 'none'
          }}
        >
          ← Idővonal
        </NavLink>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '0.8125rem', color: '#666' }}>
            Bejelentkezve: <strong>{currentUser?.nev}</strong>
          </span>
          <button
            type="button"
            onClick={logout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8125rem',
              color: '#dc2626',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '2px 4px'
            }}
            title="Kijelentkezés"
          >
            <LogOut size={13} />
            <span>Kilépés</span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '540px',
          width: '100%'
        }}
      >
        {/* Animated Brand Logo in solid black matching screenshot */}
        <BrandLogo width={96} height={70} showText={false} color="#000000" />

        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#000000',
            marginTop: '28px',
            marginBottom: '16px',
            letterSpacing: '-0.02em'
          }}
        >
          Közgyűlés
        </h1>

        {/* State A: Attendance sheet active and registered */}
        {state.isAttendanceActive && !activePoll && resultsPolls.length === 0 && (
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#000000',
              margin: 0,
              lineHeight: 1.3
            }}
          >
            Jelenléted regisztráltuk.
          </h2>
        )}

        {/* Attendance Registered Confirmation when other cards are visible */}
        {state.isAttendanceActive && (activePoll || resultsPolls.length > 0) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#e6f4ea',
              color: '#137333',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '16px'
            }}
          >
            <CheckCircle2 size={16} />
            <span>Jelenléted regisztrálva</span>
          </div>
        )}

        {/* State B: Active Poll (Szavazás folyamatban & módosítható válasz) */}
        {activePoll && (
          <div
            style={{
              width: '100%',
              marginTop: '10px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
              textAlign: 'left',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#e67e22',
                    color: '#ffffff'
                  }}
                >
                  Aktív szavazás
                </span>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
                  #{activePoll.id}. Szavazás
                </span>
              </div>

              {hasVotedActivePoll && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={12} />
                  Szavazat leadva
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 16px' }}>
              {activePoll.title || '(Nincs megadva kérdés)'}
            </h3>

            {/* Notification / Feedback Banner */}
            {justUpdated ? (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#15803d',
                  fontSize: '0.9375rem',
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={18} />
                <span>Szavazatodat sikeresen rögzítettük / módosítottuk!</span>
              </div>
            ) : hasVotedActivePoll ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Jelenlegi szavazatod: <strong style={{ color: '#0f172a' }}>{currentUserVote}</strong></span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  A szavazás lezárásáig bármikor módosíthatod
                </span>
              </div>
            ) : null}

            {/* Voting Form - Always changeable while active */}
            <form onSubmit={handleVoteSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {activePollOptions.map((opt) => {
                  const isChecked = selectedOption === opt
                  const isPreviouslyVoted = currentUserVote === opt

                  return (
                    <label
                      key={opt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: isChecked ? '2px solid #3182ce' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="poll_option"
                          value={opt}
                          checked={isChecked}
                          onChange={() => setSelectedOption(opt)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          required
                        />
                        <span style={{ fontSize: '1rem', fontWeight: isChecked ? 700 : 500, color: '#1e293b' }}>
                          {opt}
                        </span>
                      </div>

                      {isPreviouslyVoted && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#e2e8f0',
                            color: '#475569'
                          }}
                        >
                          Eddigi választásod
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedOption || (hasVotedActivePoll && !hasChangedSelection)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor:
                    hasChangedSelection
                      ? '#d97706'
                      : !hasVotedActivePoll && selectedOption
                      ? '#3182ce'
                      : '#cbd5e1',
                  color: '#ffffff',
                  cursor:
                    hasChangedSelection || (!hasVotedActivePoll && selectedOption)
                      ? 'pointer'
                      : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {submitting ? (
                  <span>Rögzítés...</span>
                ) : hasChangedSelection ? (
                  <>
                    <RefreshCw size={18} />
                    <span>Szavazat módosítása → {selectedOption}</span>
                  </>
                ) : hasVotedActivePoll ? (
                  <>
                    <Check size={18} />
                    <span>Szavazatod rögzítve ({currentUserVote})</span>
                  </>
                ) : (
                  <span>Szavazat leadása</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* State C: Eredmény nézet (Polls in results status) */}
        {resultsPolls.length > 0 && (
          <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {resultsPolls.map((poll) => {
              const res = getPollResults(poll)
              const userVote = poll.votes?.[currentUser.animator_ID]

              return (
                <div
                  key={poll.id}
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Szavazás eredménye
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                        #{poll.id}. Szavazás
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
                      Összesen {res.totalVotes} szavazat
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 16px' }}>
                    {poll.title || '(Nincs megadva kérdés)'}
                  </h3>

                  {!res.hasVotes ? (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9375rem', padding: '10px 0' }}>
                      Nem érkezett be szavazat erre a kérdésre.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {Object.entries(res.counts).map(([opt, count]) => {
                        const pct = res.totalVotes > 0 ? Math.round((count / res.totalVotes) * 100) : 0
                        const isUserChoice = userVote === opt

                        return (
                          <div key={opt} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9375rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: isUserChoice ? 700 : 600, color: '#1e293b' }}>
                                  {opt}
                                </span>
                                {isUserChoice && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#eff6ff',
                                      color: '#2563eb',
                                      border: '1px solid #bfdbfe'
                                    }}
                                  >
                                    A te szavazatod
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, color: '#334155' }}>
                                {count} szavazat <span style={{ color: '#64748b', fontWeight: 500 }}>({pct}%)</span>
                              </span>
                            </div>

                            {/* Option Percentage Bar */}
                            <div
                              style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '9999px',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor:
                                    opt === 'Tartózkodom'
                                      ? '#94a3b8'
                                      : isUserChoice
                                      ? '#2563eb'
                                      : '#3b82f6',
                                  borderRadius: '9999px',
                                  transition: 'width 0.4s ease'
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
        )}

        {/* State D: Finalized OR Neither attendance nor active poll nor results */}
        {!state.isAttendanceActive && !activePoll && resultsPolls.length === 0 && (
          state.isFinalized ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.8125rem',
                  fontWeight: 700
                }}
              >
                <CheckCircle2 size={15} />
                <span>Közgyűlés lezárva</span>
              </div>
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: '#000000',
                  margin: 0,
                  lineHeight: 1.3
                }}
              >
                A közgyűlés lezárult.
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', color: '#64748b', maxWidth: '420px', lineHeight: 1.5 }}>
                {state.attendees.includes(currentUser?.animator_ID)
                  ? 'Köszönjük a részvételt! A jelenléted be lett jegyezve a személyes Idővonaladra.'
                  : 'A mai közgyűlés hivatalosan véget ért.'}
              </p>
              <NavLink
                to="/timeline"
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  backgroundColor: '#060e20',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <span>Idővonal megtekintése</span>
                <span style={{ fontSize: '1.1rem' }}>→</span>
              </NavLink>
            </div>
          ) : (
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#000000',
                margin: 0,
                lineHeight: 1.3
              }}
            >
              Egyelőre nincs semmi teendőd.
            </h2>
          )
        )}

        {/* Global Summary Active (when toggled from admin) */}
        {state.isSummaryActive && state.polls.length > 0 && resultsPolls.length === 0 && (
          <div
            style={{
              marginTop: '32px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              textAlign: 'left',
              boxSizing: 'border-box'
            }}
          >
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
              Szavazási Összegzés
            </h3>
            {state.polls.map((p) => {
              const res = getPollResults(p)
              return (
                <div key={p.id} style={{ marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#334155' }}>
                    {p.id}. Szavazás: {p.title || '(Cím nélkül)'}
                  </div>
                  {!res.hasVotes ? (
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Nem érkezett be szavazat.</span>
                  ) : (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.entries(res.counts).map(([opt, count]) => (
                        <div key={opt} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>{opt}:</span>
                          <strong>{count} szavazat</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

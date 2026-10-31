import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Save,
  Check,
  Clock,
  Sparkles,
  MoveHorizontal
} from 'lucide-react'
import { statuszujitasService } from '../szolgaltatas/statuszujitasService.js'
import { STATUSZ_OPTIONS, isStatuszujitasPeriodActive } from '../modell/statuszujitasModels.js'
import './statuszujitas.css'

export default function StatuszujitasAdminView() {
  const [kerelmek, setKerelmek] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL, SUBMITTED, NOT_SUBMITTED, FAILED

  // Admin Period Controls State
  const [isPeriodActive, setIsPeriodActive] = useState(true)
  const [startDate, setStartDate] = useState('2026-01-15')
  const [endDate, setEndDate] = useState('2026-03-31')
  const [savingConfig, setSavingConfig] = useState(false)
  const [showConfigPanel, setShowConfigPanel] = useState(false)

  // Status selections for each row: { [animator_ID]: 'Kizárás' | 'Aktív' | ... }
  const [selectedStatuses, setSelectedStatuses] = useState({})
  const [savingRows, setSavingRows] = useState({})

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [conf, list] = await Promise.all([
        statuszujitasService.getConfig(),
        statuszujitasService.getKerelmek()
      ])
      setConfig(conf)
      setIsPeriodActive(conf.isActive ?? true)
      setStartDate(conf.startDate || '2026-01-15')
      setEndDate(conf.endDate || '2026-03-31')
      setKerelmek(list || [])

      // Initialize selected statuses for each row
      const initialMap = {}
        ; (list || []).forEach((row) => {
          // If user hasn't requested or is not approved, default to 'Kizárás' (as in portal screenshot) or their current status
          initialMap[row.animator_ID] = row.megadott_statusz || (row.hasSubmitted ? row.igenyelt_statusz : 'Kizárás')
        })
      setSelectedStatuses(initialMap)
    } catch (err) {
      console.error('Error loading admin statuszujitas:', err)
      setError(err.message || 'Nem sikerült betölteni a kérelmeket.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Check whether the status renewal period is currently open (active toggle AND current date in range)
  const isCurrentlyOpen = useMemo(() => {
    return isStatuszujitasPeriodActive({
      isActive: isPeriodActive,
      startDate,
      endDate
    })
  }, [isPeriodActive, startDate, endDate])

  // Filtered rows
  const filteredRows = useMemo(() => {
    return kerelmek.filter((row) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (row.nev || '').toLowerCase().includes(q) ||
        (row.shibboleth || '').toLowerCase().includes(q) ||
        String(row.animator_ID || '').includes(q)

      let matchesFilter = true
      if (statusFilter === 'SUBMITTED') {
        matchesFilter = row.hasSubmitted
      } else if (statusFilter === 'NOT_SUBMITTED') {
        matchesFilter = !row.hasSubmitted
      } else if (statusFilter === 'FAILED') {
        matchesFilter = row.hasSubmitted && !row.evaluation?.passed
      } else if (statusFilter === 'PASSED') {
        matchesFilter = row.hasSubmitted && row.evaluation?.passed
      }

      return matchesSearch && matchesFilter
    })
  }, [kerelmek, searchQuery, statusFilter])

  // Save admin decision for a single animator
  const handleDecision = async (animatorId) => {
    const choice = selectedStatuses[animatorId] || 'Kizárás'
    setSavingRows((prev) => ({ ...prev, [animatorId]: true }))
    try {
      const res = await statuszujitasService.decideKerelem(animatorId, choice)
      const targetAnim = kerelmek.find((k) => k.animator_ID === animatorId)
      setToastMessage(`${targetAnim?.nev || 'Animátor'} státusza sikeresen mentve: ${choice}`)

      // Update local state
      setKerelmek((prev) =>
        prev.map((k) =>
          k.animator_ID === animatorId
            ? {
              ...k,
              jelenlegi_statusz: choice.toLowerCase(),
              megadott_statusz: choice,
              status: 'elbirálva',
              dontes_datum: new Date().toISOString()
            }
            : k
        )
      )
    } catch (err) {
      alert(err.message || 'Hiba történt a státusz mentésekor.')
    } finally {
      setSavingRows((prev) => ({ ...prev, [animatorId]: false }))
    }
  }

  // Save period config
  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const updated = await statuszujitasService.updateConfig({
        isActive: isPeriodActive,
        startDate,
        endDate
      })
      setConfig(updated)
      setToastMessage('Státuszújítási időszak beállításai sikeresen elmentve!')
      setShowConfigPanel(false)
    } catch (err) {
      alert(err.message || 'Nem sikerült menteni a beállításokat.')
    } finally {
      setSavingConfig(false)
    }
  }

  // Counts for statistics
  const totalCount = kerelmek.length
  const submittedCount = kerelmek.filter((k) => k.hasSubmitted).length
  const notSubmittedCount = totalCount - submittedCount
  const passedCount = kerelmek.filter((k) => k.hasSubmitted && k.evaluation?.passed).length
  const failedCount = kerelmek.filter((k) => k.hasSubmitted && !k.evaluation?.passed).length

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', minWidth: 0 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Title & Period Status Header */}
      <div className="statusz-header">
        <div className="statusz-title-row">
          <div>
            <h1 className="statusz-page-title">Státuszújítási kérelmek</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '0.9375rem' }}>
              Aktív, ifjú és passzív tagok éves státuszújítási kérelmeinek elbírálása és jóváhagyása.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`statusz-period-badge ${isCurrentlyOpen ? 'active' : 'inactive'}`}>
              <Calendar size={14} />
              {isCurrentlyOpen
                ? `Időszak aktív (${startDate} – ${endDate})`
                : !isPeriodActive
                  ? 'Időszak lezárva'
                  : `Időszak inaktív (dátumon kívül: ${startDate} – ${endDate})`}
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              style={{ fontSize: '0.8125rem', padding: '6px 12px' }}
            >
              {showConfigPanel ? 'Beállítások elrejtése' : 'Időszak kezelése'}
            </button>
          </div>
        </div>
      </div>

      {/* Period Configuration Panel (Collapsible) */}
      {showConfigPanel && (
        <div className="statusz-card" style={{ marginBottom: '20px', borderColor: 'var(--color-primary-300)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 14px 0' }}>
            Státuszújítási Időszak Beállításai (Vezetőségi kezelőfelület)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Státuszújítás állapota
              </label>
              <button
                type="button"
                onClick={() => setIsPeriodActive(!isPeriodActive)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: isPeriodActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isPeriodActive ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {isPeriodActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                <span>{isPeriodActive ? 'Aktív (Beküldhető)' : 'Lezárt (Inaktív)'}</span>
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Kezdő dátum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Záró határidő
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              style={{ padding: '8px 18px', backgroundColor: '#851b22', borderColor: '#851b22', color: '#fff' }}
            >
              <Save size={15} style={{ marginRight: '6px' }} />
              <span>{savingConfig ? 'Mentés...' : 'Időszak Mentése'}</span>
            </button>
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <Sparkles size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
            <span>
              <strong>Megjegyzés:</strong> A tagi Státuszújítás oldal és menüpont csak akkor jelenik meg az animátoroknak, ha az időszak állapota 'Aktív' ÉS az aktuális mai dátum a kezdő és záró határidő közé esik.
            </span>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>ÖSSZES ÉRINTETT</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>{totalCount} fő</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>BEKÜLDÖTT KÉRELEM</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>{submittedCount} fő</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>NEM IGÉNYELT STÁTUSZT</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: '4px' }}>{notSubmittedCount} fő</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>FELTÉTELT TELJESÍTETTE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{passedCount} fő</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>HIÁNYZÓ FELTÉTELES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>{failedCount} fő</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '240px', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Keresés név alapján..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--color-text-muted)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '0.8125rem'
            }}
          >
            <option value="ALL">Összes érintett ({totalCount})</option>
            <option value="SUBMITTED">Beküldött kérelmek ({submittedCount})</option>
            <option value="NOT_SUBMITTED">Nem igényelt státuszt ({notSubmittedCount})</option>
            <option value="PASSED">Feltételt teljesített ({passedCount})</option>
            <option value="FAILED">Nem teljesülő feltételes ({failedCount})</option>
          </select>
        </div>
      </div>

      {/* Mobile Scroll Hint */}
      <div className="statusz-mobile-scroll-hint">
        <MoveHorizontal size={14} />
        <span>Vízszintesen görgethető táblázat</span>
      </div>

      {/* Main Table Matching User Screenshot */}
      <div className="statusz-admin-table-container">
        <table className="statusz-table">
          <thead>
            <tr>
              <th style={{ width: '22%', minWidth: '160px' }}>Név</th>
              <th style={{ width: '18%', minWidth: '140px' }}>Igényelt státusz</th>
              <th style={{ width: '38%', minWidth: '260px' }}>Nem teljesülő feltételek a kérelem beküldésekor</th>
              <th style={{ width: '22%', minWidth: '220px', textAlign: 'right' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Megadni kívánt státusz kiválasztása</span>
                  <span
                    title="Válaszd ki a tag új hivatalos státuszát a lenyíló listából, majd kattints az OK gombra a mentéshez."
                    style={{ cursor: 'help', display: 'inline-flex' }}
                  >
                    <HelpCircle size={14} color="var(--color-text-muted)" />
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                  Nem található a feltételeknek megfelelő státuszújítási kérelem.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isSelected = selectedStatuses[row.animator_ID] || 'Kizárás'
                const isSaving = savingRows[row.animator_ID]

                return (
                  <tr key={row.animator_ID}>
                    {/* 1. Név */}
                    <td>
                      <span className="animator-name-link">
                        {row.nev}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Jelenleg: <strong style={{ textTransform: 'capitalize' }}>{row.jelenlegi_statusz}</strong>
                      </div>
                    </td>

                    {/* 2. Igényelt státusz */}
                    <td>
                      {row.hasSubmitted ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              backgroundColor:
                                row.igenyelt_statusz === 'Veterán'
                                  ? 'rgba(217, 119, 6, 0.15)'
                                  : row.igenyelt_statusz === 'Vén'
                                    ? 'rgba(124, 58, 237, 0.15)'
                                    : row.igenyelt_statusz === 'Ex'
                                      ? 'rgba(148, 163, 184, 0.15)'
                                      : 'rgba(59, 130, 246, 0.15)',
                              color:
                                row.igenyelt_statusz === 'Veterán'
                                  ? '#d97706'
                                  : row.igenyelt_statusz === 'Vén'
                                    ? '#a78bfa'
                                    : row.igenyelt_statusz === 'Ex'
                                      ? '#94a3b8'
                                      : '#3b82f6',
                              border: '1px solid',
                              borderColor:
                                row.igenyelt_statusz === 'Veterán'
                                  ? 'rgba(217, 119, 6, 0.3)'
                                  : row.igenyelt_statusz === 'Vén'
                                    ? 'rgba(124, 58, 237, 0.3)'
                                    : row.igenyelt_statusz === 'Ex'
                                      ? 'rgba(148, 163, 184, 0.3)'
                                      : 'rgba(59, 130, 246, 0.3)'
                            }}
                          >
                            {row.igenyelt_statusz}
                          </span>
                          {row.submittedAt && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Beküldve: {row.submittedAt.split('T')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                          Nem igényelt státuszt
                        </span>
                      )}
                    </td>

                    {/* 3. Nem teljesülő feltételek a kérelem beküldésekor */}
                    <td>
                      {!row.hasSubmitted ? (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                          —
                        </span>
                      ) : row.evaluation?.passed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#10b981',
                            fontSize: '0.8125rem',
                            fontWeight: 600
                          }}
                        >
                          <CheckCircle size={14} />
                          <span>Minden feltétel teljesült</span>
                        </span>
                      ) : (
                        <div>
                          {/* Missing list */}
                          <div style={{ color: '#ef4444', fontSize: '0.8125rem', fontWeight: 600 }}>
                            {row.evaluation?.missing?.join(' • ') || 'Hiányzó feltételek'}
                          </div>

                          {/* User Szövegdoboz explanation */}
                          {row.indoklas && (
                            <div className="user-indoklas-quote" title="A tag által megadott indoklás / kérelem">
                              <span style={{ fontWeight: 600, fontStyle: 'normal' }}>Indoklás: </span>
                              "{row.indoklas}"
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. Megadni kívánt státusz kiválasztása ❓ */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="statusz-select-cell">
                        <select
                          className="statusz-dropdown"
                          value={isSelected}
                          onChange={(e) =>
                            setSelectedStatuses({
                              ...selectedStatuses,
                              [row.animator_ID]: e.target.value
                            })
                          }
                          disabled={isSaving}
                        >
                          {STATUSZ_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="statusz-btn-ok"
                          onClick={() => handleDecision(row.animator_ID)}
                          disabled={isSaving}
                          title="Státusz jóváhagyása és elmentése"
                        >
                          {isSaving ? '...' : 'OK'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

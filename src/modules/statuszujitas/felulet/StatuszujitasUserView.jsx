import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Info
} from 'lucide-react'
import { useAuth } from '../../../common/context/AuthContext.jsx'
import { statuszujitasService } from '../szolgaltatas/statuszujitasService.js'
import {
  REQUESTABLE_STATUSES,
  isEligibleForStatuszujitas,
  isStatuszujitasPeriodActive
} from '../modell/statuszujitasModels.js'
import './statuszujitas.css'

export default function StatuszujitasUserView() {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [config, setConfig] = useState(null)
  const [progress, setProgress] = useState(null)
  const [igenyeltStatusz, setIgenyeltStatusz] = useState('Aktív')
  const [indoklas, setIndoklas] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const loadData = async () => {
    if (!currentUser?.animator_ID) return
    try {
      setLoading(true)
      setError(null)
      const data = await statuszujitasService.getUserProgress(currentUser.animator_ID)
      setConfig(data.config)
      setProgress(data)

      if (data.request) {
        setIgenyeltStatusz(data.request.igenyelt_statusz || 'Aktív')
        setIndoklas(data.request.indoklas || '')
      } else if (data.animator?.statusz) {
        // Default to current status if in requestable list
        const norm = (data.animator.statusz || '').toLowerCase()
        const match = REQUESTABLE_STATUSES.find((s) => s.toLowerCase() === norm)
        if (match) setIgenyeltStatusz(match)
        else setIgenyeltStatusz('Aktív')
      }
    } catch (err) {
      console.error('Error loading statuszujitas data:', err)
      setError(err.message || 'Nem sikerült betölteni a státuszújítás adatait.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentUser])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-text-muted)' }}>
        <Clock size={20} className="spin" style={{ marginRight: '8px' }} />
        <span>Státuszújítási adatok betöltése...</span>
      </div>
    )
  }

  const isEligible = progress?.isEligible ?? isEligibleForStatuszujitas(currentUser?.statusz)
  const evaluation = progress?.evaluation
  const hasPassed = evaluation?.passed ?? false
  const isPeriodActive = Boolean(config?.isPeriodActive ?? isStatuszujitasPeriodActive(config))
  const isExOrPassziv = (igenyeltStatusz || '').toLowerCase() === 'ex' || (igenyeltStatusz || '').toLowerCase() === 'passzív'
  const isIndoklasRequired = !hasPassed && !isExOrPassziv

  // If status renewal period is not active (current date not in date range or admin disabled),
  // this whole page should not appear -> immediately redirect to timeline
  if (!isPeriodActive) {
    return <Navigate to="/timeline" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})
    setSuccessMsg(null)

    // Validation
    const errors = {}
    if (!igenyeltStatusz) {
      errors.igenyeltStatusz = 'Kérlek válassz igényelt státuszt!'
    }

    console.log(isIndoklasRequired)
    console.log(isExOrPassziv)
    if (isIndoklasRequired) {
      if (!indoklas || indoklas.trim().length < 10) {
        errors.indoklas = 'Mivel nem teljesült minden feltétel, a kérelem beküldéséhez kötelező indoklást írnod (min. 10 karakter)!'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      setSubmitting(true)
      const res = await statuszujitasService.submitKerelem({
        animator_ID: currentUser.animator_ID,
        igenyelt_statusz: igenyeltStatusz,
        indoklas: indoklas.trim()
      })
      setSuccessMsg(res.message || 'Státuszújítási kérelem sikeresen elküldve a vezetőség felé!')
      await loadData()
    } catch (err) {
      setError(err.message || 'Nem sikerült beküldeni a kérelmet.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div className="statusz-header">
        <div className="statusz-title-row">
          <div>
            <h1 className="statusz-page-title">Státuszújítás {config?.ev || 2026}</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '0.9375rem' }}>
              Éves animátori státusz felülvizsgálat és kötelező részvételi feltételek ellenőrzése.
            </p>
          </div>
          <div>
            <span className={`statusz-period-badge ${isPeriodActive ? 'active' : 'inactive'}`}>
              <Calendar size={14} />
              {isPeriodActive
                ? `Aktív időszak: ${config?.startDate || '2026-01-15'} – ${config?.endDate || '2026-03-31'}`
                : 'A státuszújítás jelenleg lezárva'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Non-eligible notice */}
      {!isEligible && (
        <div className="statusz-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <Info size={24} color="#3b82f6" />
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 6px 0' }}>
                Nem kötelezett a státuszújításra
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                A státuszújítás kizárólag <strong>aktív</strong>, <strong>ifjú</strong> és <strong>passzív</strong> státuszú tagok számára szükséges.
                Jelenlegi regisztrált státuszod: <strong style={{ textTransform: 'capitalize' }}>{progress?.animator?.statusz || currentUser?.statusz || 'Veterán/Vén'}</strong>,
                ezért nem szükséges kérelmet benyújtanod.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* When Inactive Period */}
      {isEligible && !isPeriodActive && (
        <div className="statusz-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <Clock size={24} color="#f59e0b" />
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 6px 0' }}>
                A státuszújítási időszak jelenleg zárva van
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                A vezetőség még nem nyitotta meg, vagy már lezárta az idei státuszújítási periódust.
                Kérdés esetén fordulj az elnökséghez!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form & Requirement Checks for Eligible Users when Period is Active */}
      {isEligible && (
        <>
          {/* Progress & Requirements Grid */}
          <div className="statusz-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 4px 0' }}>
              Kötelező Részvételi Feltételek Ellenőrzése
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
              A rendszer az Idővonaladon rögzített jelenléteid alapján automatikusan ellenőrzi a megújuláshoz szükséges eseményeket.
            </p>

            <div className="statusz-grid">
              {/* 1. KGY requirement */}
              <div className={`requirement-box ${evaluation?.kgyMet ? 'passed' : 'missing'}`}>
                <div className="requirement-header">
                  <span className="requirement-title">1. Közgyűlés jelenlét</span>
                  <span className={`requirement-count ${evaluation?.kgyMet ? 'passed' : 'missing'}`}>
                    {evaluation?.kgyCount || 0} / 2
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: evaluation?.kgyMet ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {evaluation?.kgyMet ? '✓ Teljesítve (min. 2 db)' : '✗ Hiányzik (min. 2 db kötelező)'}
                </div>
                {evaluation?.matchedEvents?.kgy?.length > 0 && (
                  <div className="requirement-list">
                    {evaluation.matchedEvents.kgy.map((e, idx) => (
                      <div key={idx}>• {e.cim} ({e.datum})</div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Egyetemi Rendezvény requirement */}
              <div className={`requirement-box ${evaluation?.egyetemiMet ? 'passed' : 'missing'}`}>
                <div className="requirement-header">
                  <span className="requirement-title">2. Egyetemi rendezvény</span>
                  <span className={`requirement-count ${evaluation?.egyetemiMet ? 'passed' : 'missing'}`}>
                    {evaluation?.egyetemiCount || 0} / 1
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: evaluation?.egyetemiMet ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {evaluation?.egyetemiMet ? '✓ Teljesítve (min. 1 db)' : '✗ Hiányzik (min. 1 db kötelező)'}
                </div>
                {evaluation?.matchedEvents?.egyetemi?.length > 0 && (
                  <div className="requirement-list">
                    {evaluation.matchedEvents.egyetemi.map((e, idx) => (
                      <div key={idx}>• {e.cim} ({e.datum})</div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. További Egyetemi VAGY Nagyrendezvény */}
              <div className={`requirement-box ${evaluation?.egyetemiOrNagyMet ? 'passed' : 'missing'}`}>
                <div className="requirement-header">
                  <span className="requirement-title">3. Egyetemi v. Nagyrendezvény</span>
                  <span className={`requirement-count ${evaluation?.egyetemiOrNagyMet ? 'passed' : 'missing'}`}>
                    {evaluation?.egyetemiOrNagyCount || 0} / 2
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: evaluation?.egyetemiOrNagyMet ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {evaluation?.egyetemiOrNagyMet ? '✓ Teljesítve (összesen min. 2)' : '✗ Hiányzik (min. 1 további)'}
                </div>
                <div className="requirement-list" style={{ color: 'var(--color-text-muted)' }}>
                  Egyetemi: {evaluation?.egyetemiCount || 0} db | Nagyrendezvény: {evaluation?.nagyCount || 0} db
                </div>
              </div>

              {/* 4. Tréning requirement */}
              <div className={`requirement-box ${evaluation?.treningMet ? 'passed' : 'missing'}`}>
                <div className="requirement-header">
                  <span className="requirement-title">4. Tréning</span>
                  <span className={`requirement-count ${evaluation?.treningMet ? 'passed' : 'missing'}`}>
                    {evaluation?.treningCount || 0} / 1
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: evaluation?.treningMet ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {evaluation?.treningMet ? '✓ Teljesítve (min. 1 db)' : '✗ Hiányzik (min. 1 db kötelező)'}
                </div>
                {evaluation?.matchedEvents?.trening?.length > 0 && (
                  <div className="requirement-list">
                    {evaluation.matchedEvents.trening.map((e, idx) => (
                      <div key={idx}>• {e.cim} ({e.datum})</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Evaluation Summary Banner */}
            {hasPassed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981'
                }}
              >
                <CheckCircle size={20} />
                <div>
                  <strong>Minden feltétel sikeresen teljesült!</strong>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    Jogosult vagy a kérelem közvetlen beküldésére. Válassz igényelt státuszt és küldd be a kérelmed.
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444'
                }}
              >
                <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>
                    Nem minden feltétel teljesül a státusz megújításához!
                  </strong>
                  <ul style={{ margin: '0 0 6px 0', paddingLeft: '18px', fontSize: '0.8125rem' }}>
                    {evaluation?.missing?.map((m, idx) => (
                      <li key={idx} style={{ color: 'var(--color-text-primary)' }}>{m}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                    {isExOrPassziv ? (
                      <span style={{ color: '#94a3b8' }}>
                        ℹ️ <strong>Ex státusz:</strong> Mivel az aktív tagság befejezését (Ex státuszt) kéred, a részvételi feltételek hiányában sem kötelező indoklást megadnod.
                      </span>
                    ) : (
                      <>
                        A kérelem beküldéséhez <strong>kötelező megadnod egy indoklást a lenti szövegdobozban</strong>,
                        hogy a vezetőség méltányossági elbírálás keretében megvizsgálhassa a státusz igénylésed.
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submission Form */}
          <div className="statusz-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 16px 0' }}>
              Státuszújítási Kérelem Beküldése
            </h2>

            {progress?.request && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '0.875rem' }}>
                  <strong>Beküldött kérelem állapota:</strong>{' '}
                  <span
                    style={{
                      fontWeight: 600,
                      color: progress.request.status === 'elbirálva' ? '#10b981' : '#f59e0b'
                    }}
                  >
                    {progress.request.status === 'elbirálva'
                      ? `Elbírálva (Megadott státusz: ${progress.request.megadott_statusz})`
                      : 'Bírálatra vár a vezetőség részéről'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Beküldve: {progress.request.submittedAt ? progress.request.submittedAt.split('T')[0] : '-'}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Jelenlegi Státuszod
                </label>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}
                >
                  {progress?.animator?.statusz || currentUser?.statusz || 'aktív'}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Igényelt Státusz a következő időszakra *
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {REQUESTABLE_STATUSES.map((stat) => (
                    <label
                      key={stat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: igenyeltStatusz === stat ? '#851b22' : 'var(--color-border)',
                        backgroundColor: igenyeltStatusz === stat ? 'rgba(133, 27, 34, 0.1)' : 'var(--color-surface)',
                        color: igenyeltStatusz === stat ? '#ffffff' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      <input
                        type="radio"
                        name="igenyelt_statusz"
                        value={stat}
                        checked={igenyeltStatusz === stat}
                        onChange={() => setIgenyeltStatusz(stat)}
                        style={{ accentColor: '#851b22' }}
                      />
                      <span>{stat}</span>
                    </label>
                  ))}
                </div>

                {igenyeltStatusz === 'Vén' && (
                  <div style={{ marginTop: '10px', fontSize: '0.8125rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(124, 58, 237, 0.08)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                    <Info size={15} style={{ flexShrink: 0 }} />
                    <span><strong>Vén státusz:</strong> Megelőző aktív animátor év után igényelhető státusz, amivel továbbra is jelentkezhetsz rendezvényekre, de a főnök pozíció lehetőségét, és a szavazati jogot elveszted.</span>
                  </div>
                )}
                {igenyeltStatusz === 'Veterán' && (
                  <div style={{ marginTop: '10px', fontSize: '0.8125rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(217, 119, 6, 0.08)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                    <Info size={15} style={{ flexShrink: 0 }} />
                    <span><strong>Veterán státusz:</strong> 3 év egybefüggő aktív státusz után, és diploma szerzést követően igényelhető.</span>
                  </div>
                )}
                {igenyeltStatusz === 'Ex' && (
                  <div style={{ marginTop: '10px', fontSize: '0.8125rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(148, 163, 184, 0.08)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <Info size={15} style={{ flexShrink: 0 }} />
                    <span><strong>Ex státusz:</strong> Az aktív animátori feladatvállalás befejezése / leköszönő tagság.</span>
                  </div>
                )}
                {fieldErrors.igenyeltStatusz && (
                  <span style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.igenyeltStatusz}
                  </span>
                )}
              </div>

              {/* Szövegdoboz: Indoklás / Megjegyzés */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  {isIndoklasRequired ? (
                    <span style={{ color: '#ef4444' }}>
                      Indoklás a nem teljesülő feltételekhez * (Kötelező szövegdoboz)
                    </span>
                  ) : isExOrPassziv ? (
                    <span>
                      Megjegyzés a(z) {igenyeltStatusz} státuszhoz (Opcionális szövegdoboz - {igenyeltStatusz} státusznál nem kötelező)
                    </span>
                  ) : (
                    <span>Megjegyzés a vezetőségnek (Opcionális)</span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={indoklas}
                  onChange={(e) => {
                    setIndoklas(e.target.value)
                    if (fieldErrors.indoklas) {
                      setFieldErrors({ ...fieldErrors, indoklas: undefined })
                    }
                  }}
                  placeholder={
                    isIndoklasRequired
                      ? 'Kérlek írd le részletesen az indoklást a hiányzó feltétel(ek)hez (pl. Erasmus félév, külföldi tanulmányok, vizsgaidőszak, egészségügyi ok), hogy az elnökség méltányosságot gyakorolhasson...'
                      : igenyeltStatusz === 'Ex'
                        ? 'Opcionális búcsúüzenet, megjegyzés vagy visszajelzés a vezetőség részére (nem kötelező)...'
                        : 'Opcionális üzenet, megjegyzés vagy vállalás a vezetőség részére...'
                  }
                  required={isIndoklasRequired}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: fieldErrors.indoklas ? '#ef4444' : 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {isIndoklasRequired
                      ? 'Legalább 10 karakter hosszú indoklás szükséges a kérelem beküldéséhez.'
                      : isExOrPassziv
                        ? 'Ex státusz igénylése esetén az indoklás nem kötelező.'
                        : 'Nem kötelező, ha minden feltételt teljesítettél.'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: indoklas.length < 10 && isIndoklasRequired ? '#ef4444' : 'var(--color-text-muted)' }}>
                    {indoklas.length} karakter
                  </span>
                </div>
                {fieldErrors.indoklas && (
                  <span style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.indoklas}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  fontSize: '0.9375rem',
                  backgroundColor: '#851b22',
                  borderColor: '#851b22',
                  color: '#ffffff',
                  fontWeight: 600
                }}
              >
                <Send size={16} />
                <span>{submitting ? 'Beküldés folyamatban...' : progress?.request ? 'Kérelem Frissítése' : 'Kérelem Beküldése'}</span>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

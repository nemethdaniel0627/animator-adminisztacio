import { useState, useEffect } from 'react'
import {
  GraduationCap,
  MessageSquare,
  Rocket,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react'
import { eventService } from '../../events/szolgaltatas/eventService.js'
import { apiClient } from '../../../common/api/apiClient.js'
import { useAuth } from '../../../common/context/AuthContext.jsx'

// 16-point scalloped starburst rosette icon (FontAwesome fa-certificate equivalent matching portal screenshot)
function RosetteIcon({ size = 18, color = 'currentColor', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
      {...props}
    >
      <path d="M240.2 6.6c-9.1-8.8-23.4-8.8-32.5 0l-37 35.8-51.1-7.1c-12.6-1.7-24.1 6.6-26.6 19.1l-10.1 50.6L36.3 125.6c-12.1 4.2-19.1 16.9-16.1 29.4l12.4 50.1-30.8 41.5c-7.6 10.2-6.5 24.5 2.5 33.5l36.9 36.9-12.4 50.1c-3.1 12.5 3.9 25.2 16.1 29.4l46.6 20.6 10.1 50.6c2.5 12.5 14 20.8 26.6 19.1l51.1-7.1 37 35.8c9.1 8.8 23.4 8.8 32.5 0l37-35.8 51.1 7.1c12.6 1.7 24.1-6.6 26.6-19.1l10.1-50.6 46.6-20.6c12.1-4.2 19.1-16.9 16.1-29.4l-12.4-50.1 36.9-36.9c9-9 10.1-23.3 2.5-33.5l-30.8-41.5 12.4-50.1c3.1-12.5-3.9-25.2-16.1-29.4l-46.6-20.6-10.1-50.6c-2.5-12.5-14-20.8-26.6-19.1l-51.1 7.1-37-35.8z" />
    </svg>
  )
}

// Solid white paper plane icon (FontAwesome fa-paper-plane matching portal screenshot)
function PaperPlaneIcon({ size = 16, color = 'currentColor', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
      {...props}
    >
      <path d="M476 3.2L12.5 270.6c-18.1 10.4-15.8 35.6 2.2 43.2L121 358.4l287.3-253.2c5.5-4.9 13.3 2.6 8.6 8.3L176 407v80.5c0 23.6 28.5 32.9 42.5 15.8L282 426l124.6 52.2c14.2 6 30.4-2.9 33-18.2l72-432C515 7.8 493.3-6.8 476 3.2z" />
    </svg>
  )
}

export default function TimelineView() {
  const { currentUser } = useAuth()
  const [events, setEvents] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobileStatsExpanded, setIsMobileStatsExpanded] = useState(true)
  const [attendances, setAttendances] = useState([])

  const loadData = async () => {
    try {
      setLoading(true)
      const [list, posList, attList] = await Promise.all([
        eventService.getEvents(),
        apiClient.getPositions().catch(() => []),
        currentUser?.animator_ID
          ? apiClient.getAnimatorAttendances(currentUser.animator_ID).catch(() => [])
          : Promise.resolve([])
      ])
      // Sort chronologically descending
      const sorted = [...list].sort((a, b) => new Date(b.datum) - new Date(a.datum))
      setEvents(sorted)
      setPositions(posList || [])
      setAttendances(attList || [])
    } catch (err) {
      console.error('Failed to load timeline events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Node icon and style based on event item
  const getNodeConfig = (ev) => {
    if (ev.badgeText) {
      return {
        isPill: true,
        text: ev.badgeText
      }
    }

    const t = (ev.tipus || '').toLowerCase()
    const cim = (ev.cim || '').toLowerCase()

    // 1. Any Közgyűlés (including "Tisztújító Közgyűlés") is a basic közgyűlés -> Amber node with MessageSquare
    if (
      t.includes('közgyűlés') ||
      t.includes('kozgyules') ||
      cim.includes('közgyűlés') ||
      cim.includes('kozgyules') ||
      t.includes('státuszújítás')
    ) {
      return {
        className: 'timeline-node-kozgyules',
        icon: <MessageSquare size={16} />
      }
    }

    // 2. Pure Tisztújítás (e.g. "Tisztújítás 2025") -> Signature crimson circle node with white 16-point rosette
    if (
      t.includes('tisztújítás') ||
      t.includes('tisztujit') ||
      cim.includes('tisztújítás') ||
      cim.includes('tisztujit')
    ) {
      return {
        className: 'timeline-node-tisztujitas',
        icon: <RosetteIcon size={18} color="#ffffff" />
      }
    }

    if (t.includes('tréning') || cim.includes('képzés')) {
      return {
        className: 'timeline-node-trening',
        icon: <GraduationCap size={16} />
      }
    }
    // 3. Egyetemi rendezvény -> Petrol blue circle node (#02577e) with solid white paper plane icon
    if (
      t.includes('egyetemi') ||
      cim.includes('egyetemi') ||
      cim.includes('pázmány') ||
      cim.includes('gólyanap') ||
      cim.includes('golyanap')
    ) {
      return {
        className: 'timeline-node-egyetemi',
        icon: <PaperPlaneIcon size={16} color="#ffffff" />
      }
    }

    // 4. Nagyrendezvény -> Deep emerald / teal circle node (#0f766e) with Rocket icon
    if (
      t.includes('nagyrendezvény') ||
      t.includes('nagyrendezveny') ||
      cim.includes('gólyatábor') ||
      cim.includes('golyatabor') ||
      t.includes('rendezvény') ||
      t.includes('rendezveny')
    ) {
      return {
        className: 'timeline-node-rendezveny',
        icon: <Rocket size={16} />
      }
    }
    return {
      className: 'timeline-node-egyeb',
      icon: <Calendar size={16} />
    }
  }

  // Set of events attended by the logged-in user
  const myAttendedEventIds = new Set(attendances.map((a) => Number(a.esemeny_ID)))

  // Calculate dynamic stats for newly recorded events beyond baseline seed
  const initialEventIds = new Set([762, 761, 760, 759, 758, 757, 756, 755, 754, 753, 752, 711, 710])
  const newEvents = events.filter((e) => !initialEventIds.has(Number(e.esemeny_ID)))

  let newKgyAttended = 0
  let newKgyTotal = 0
  newEvents.forEach((ev) => {
    const isKgy =
      (ev.tipus || '').toLowerCase().includes('közgyűlés') ||
      (ev.tipus || '').toLowerCase().includes('kozgyules') ||
      (ev.cim || '').toLowerCase().includes('közgyűlés') ||
      (ev.cim || '').toLowerCase().includes('kozgyules')
    if (isKgy) {
      newKgyTotal++
      if (myAttendedEventIds.has(Number(ev.esemeny_ID))) {
        newKgyAttended++
      }
    }
  })

  // Format date to Hungary format: 2026.10.13.
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const clean = dateStr.split(' ')[0]
    const parts = clean.split('-')
    if (parts.length === 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.`
    }
    return dateStr
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner matching original portal screenshot */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Idővonal
        </h1>
      </div>

      {/* Two Column Layout matching screenshot on PC, responsive stack on Mobile */}
      <div className="timeline-layout">
        {/* Left Column: Personal Attendance Statistics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Mobile Collapsible Header */}
          <div
            className="mobile-stats-toggle"
            onClick={() => setIsMobileStatsExpanded(!isMobileStatsExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Részvételi statisztika</span>
            {isMobileStatsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          <div className={`stats-container ${isMobileStatsExpanded ? 'expanded' : ''}`}>
            {/* Card 1: 2026. animátor-évi jelenléteid */}
            <div className="stats-card">
              <div className="stats-card-header">2026. animátor-évi jelenléteid:</div>
              <table className="stats-table">
                <tbody>
                  <tr>
                    <td>Nagyrendezvények:</td>
                    <td className="stats-value">3</td>
                  </tr>
                  <tr>
                    <td>Egyetemi rendezvények:</td>
                    <td className="stats-value">0</td>
                  </tr>
                  <tr>
                    <td>Tréningek:</td>
                    <td className="stats-value">2/3</td>
                  </tr>
                  <tr>
                    <td>Közgyűlések:</td>
                    <td className="stats-value">{3 + newKgyAttended}/{4 + newKgyTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Card 2: Összesített jelenléteid */}
            <div className="stats-card">
              <div className="stats-card-header">Összesített jelenléteid:</div>
              <table className="stats-table">
                <tbody>
                  <tr>
                    <td>Nagyrendezvények:</td>
                    <td className="stats-value">12</td>
                  </tr>
                  <tr>
                    <td>Egyetemi rendezvények:</td>
                    <td className="stats-value">7</td>
                  </tr>
                  <tr>
                    <td>Tréningek:</td>
                    <td className="stats-value">6</td>
                  </tr>
                  <tr>
                    <td>Közgyűlések:</td>
                    <td className="stats-value">{12 + newKgyAttended}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Vertical Timeline Track (Read-Only) */}
        <div>
          {loading ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Idővonal betöltése...
            </div>
          ) : events.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              Nincsenek rögzített események.
            </div>
          ) : (
            <div className="timeline-track">
              {events.map((ev) => {
                const node = getNodeConfig(ev)
                // Check if this is a Közgyűlés (including "Tisztújító Közgyűlés" which is a basic közgyűlés without position subtitle)
                const isKozgyules =
                  (ev.tipus || '').toLowerCase().includes('közgyűlés') ||
                  (ev.tipus || '').toLowerCase().includes('kozgyules') ||
                  (ev.cim || '').toLowerCase().includes('közgyűlés') ||
                  (ev.cim || '').toLowerCase().includes('kozgyules')

                // Position subtitle is strictly for Tisztújítás events, never on standard/tisztújító közgyűlés
                const userPos = !isKozgyules
                  ? positions.find(
                      (p) => Number(p.esemeny_ID) === Number(ev.esemeny_ID) && Number(p.animator_ID) === Number(currentUser?.animator_ID)
                    )
                  : null

                const subtitleText = userPos
                  ? `Pozíciód: ${userPos.pozicio}`
                  : ev.subtitle || null

                return (
                  <div key={ev.esemeny_ID} className="timeline-item">
                    {/* Node circle badge or Year pill */}
                    {node.isPill ? (
                      <div className="timeline-node-year" title={ev.tipus}>
                        {node.text}
                      </div>
                    ) : (
                      <div className={`timeline-node ${node.className}`} title={ev.tipus}>
                        {node.icon}
                      </div>
                    )}

                    {/* Timeline card: purely display matching portal screenshot */}
                    <div className="timeline-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <h4 className="timeline-card-title">{ev.cim}</h4>
                        {subtitleText && (
                          <span className="timeline-card-subtitle">{subtitleText}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span className="timeline-card-date">{formatDate(ev.datum)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

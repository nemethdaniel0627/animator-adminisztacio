import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { animatorService } from '../szolgaltatas/animatorService.js'
import { useAuth } from '../../../common/context/AuthContext.jsx'
import { Search, ChevronDown, ArrowUpDown, Mail, Phone, Users, Clock } from 'lucide-react'

export default function AnimatorList() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [animators, setAnimators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('nev') // 'nev' | 'statusz'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')

  useEffect(() => {
    setLoading(true)
    animatorService
      .getAnimators()
      .then((data) => setAnimators(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleSortByName = () => {
    if (sortField === 'nev') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField('nev')
      setSortOrder('asc')
    }
  }

  const handleSortByStatus = (status = null) => {
    if (status) {
      setSelectedStatusFilter(status)
      setIsStatusDropdownOpen(false)
    } else {
      if (sortField === 'statusz') {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortField('statusz')
        setSortOrder('asc')
      }
    }
  }

  const filteredAndSortedAnimators = useMemo(() => {
    let list = animators.filter((a) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        (a.nev || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.telefonszam || '').toLowerCase().includes(q)

      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (a.statusz || '').toLowerCase() === selectedStatusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })

    list.sort((a, b) => {
      let valA = (a[sortField] || '').toLowerCase()
      let valB = (b[sortField] || '').toLowerCase()
      const comp = valA.localeCompare(valB, 'hu')
      return sortOrder === 'asc' ? comp : -comp
    })

    return list
  }, [animators, searchQuery, sortField, sortOrder, selectedStatusFilter])

  const activeCount = useMemo(() => {
    return animators.filter((a) => {
      const s = (a.statusz || '').trim().toLowerCase()
      return s === 'aktív' || s === 'aktiv'
    }).length
  }, [animators])

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'aktív') {
      return { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }
    }
    if (s === 'szenior') {
      return { backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }
    }
    if (s === 'öregdiák') {
      return { backgroundColor: '#f5f3ff', color: '#6b21a8', border: '1px solid #ddd6fe' }
    }
    return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Toolbar matching user screenshot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Search input */}
        <div style={{ flex: '0 1 240px' }}>
          <input
            type="search"
            placeholder="Keresés"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              minHeight: '38px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* RENDEZÉS NÉV SZERINT Button */}
        <button
          type="button"
          onClick={handleSortByName}
          style={{
            backgroundColor: sortField === 'nev' ? '#060e20' : '#1e293b',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            minHeight: '36px'
          }}
        >
          <span>Rendezés név szerint</span>
          {sortField === 'nev' && (
            <span style={{ fontSize: '10px' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
          )}
        </button>

        {/* RENDEZÉS STÁTUSZ SZERINT Dropdown Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            style={{
              backgroundColor: sortField === 'statusz' || selectedStatusFilter !== 'ALL' ? '#060e20' : '#1e293b',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              minHeight: '36px'
            }}
          >
            <span>
              {selectedStatusFilter !== 'ALL'
                ? `Státusz: ${selectedStatusFilter}`
                : 'Rendezés státusz szerint'}
            </span>
            <ChevronDown size={14} />
          </button>

          {isStatusDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 20,
                minWidth: '180px',
                overflow: 'hidden'
              }}
            >
              <div
                onClick={() => handleSortByStatus()}
                style={{ padding: '8px 14px', fontSize: '0.8125rem', cursor: 'pointer', borderBottom: '1px solid var(--color-border-subtle)' }}
              >
                Rendezés (A-Z)
              </div>
              {['ALL', 'aktív', 'szenior', 'inaktív', 'öregdiák'].map((s) => (
                <div
                  key={s}
                  onClick={() => handleSortByStatus(s)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    backgroundColor: selectedStatusFilter === s ? 'var(--color-surface-hover)' : 'transparent',
                    fontWeight: selectedStatusFilter === s ? 600 : 400
                  }}
                >
                  {s === 'ALL' ? 'Minden státusz' : s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Counter & Hint */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {isAdmin && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
              (Kattints egy sorra az idővonal megtekintéséhez)
            </span>
          )}
          <span>
            Összesen:{' '}
            <strong>
              {filteredAndSortedAnimators.length !== animators.length
                ? `${filteredAndSortedAnimators.length} / ${animators.length}`
                : animators.length}
            </strong>{' '}
            tag
            <span style={{ marginLeft: '6px', color: 'var(--color-text-muted, #94a3b8)' }}>
              ({activeCount} aktív)
            </span>
          </span>
        </div>
      </div>

      {/* Table matching user screenshot headers: Név, Email, Telefonszám, Státusz, Kategória */}
      <div className="table-wrapper" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700 }}>Név</th>
              <th style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700 }}>Email</th>
              <th style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700 }}>Telefonszám</th>
              <th style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700 }}>Státusz</th>
              <th style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700 }}>Kategória</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                  Taglista betöltése...
                </td>
              </tr>
            ) : filteredAndSortedAnimators.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px' }}>
                  Nem található tag a megadott feltételekkel.
                </td>
              </tr>
            ) : (
              filteredAndSortedAnimators.map((animator) => (
                <tr
                  key={animator.animator_ID}
                  onClick={() => {
                    if (isAdmin) {
                      navigate(`/timeline?animatorId=${animator.animator_ID}`)
                    }
                  }}
                  style={{
                    cursor: isAdmin ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease'
                  }}
                  title={isAdmin ? `${animator.nev} idővonalának megtekintése` : undefined}
                >
                  <td style={{ fontWeight: 600 }}>{animator.nev}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {animator.email || '-'}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {animator.telefonszam || '-'}
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        ...getStatusBadgeStyle(animator.statusz)
                      }}
                    >
                      {animator.statusz || 'aktív'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8125rem',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {animator.kategoria || '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

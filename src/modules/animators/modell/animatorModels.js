/**
 * Animator Models & Search Utilities
 * Pure functions for animators directory and selection logic.
 */

/**
 * Validates and sanitizes an animator record.
 * @param {object} input 
 * @returns {{ animator_ID: number, nev: string, shibboleth: string, telefonszam: string, email: string, kategoria: string }}
 */
export function createAnimatorModel(input = {}) {
  return {
    animator_ID: Number(input.animator_ID) || 0,
    nev: typeof input.nev === 'string' ? input.nev.trim() : '',
    shibboleth: typeof input.shibboleth === 'string' ? input.shibboleth.trim() : '',
    telefonszam: typeof input.telefonszam === 'string' ? input.telefonszam.trim() : '',
    email: typeof input.email === 'string' ? input.email.trim() : '',
    kategoria: typeof input.kategoria === 'string' ? input.kategoria.trim() : ''
  }
}

/**
 * Filters a list of animators by search term (name, shibboleth, or ID) and category.
 * @param {Array<object>} list 
 * @param {string} [searchQuery=''] 
 * @param {string} [categoryFilter=''] 
 * @returns {Array<object>}
 */
export function filterAnimators(list = [], searchQuery = '', categoryFilter = '') {
  if (!Array.isArray(list)) return []

  const query = typeof searchQuery === 'string' ? searchQuery.trim().toLowerCase() : ''
  const category = typeof categoryFilter === 'string' ? categoryFilter.trim().toLowerCase() : ''

  return list.filter((item) => {
    if (category && (item.kategoria || '').toLowerCase() !== category) {
      return false
    }

    if (!query) return true

    const nameMatch = (item.nev || '').toLowerCase().includes(query)
    const idMatch = String(item.animator_ID || '').includes(query)
    const shibMatch = (item.shibboleth || '').toLowerCase().includes(query)

    return nameMatch || idMatch || shibMatch
  })
}

/**
 * Matches raw pasted text (e.g. from Google Sheets or attendance lists) to animator records.
 * @param {Array<object>} animatorList 
 * @param {string} rawText 
 * @returns {{ matched: Array<object>, unmatched: Array<string> }}
 */
export function matchAnimatorsByNames(animatorList = [], rawText = '') {
  if (!rawText || typeof rawText !== 'string') {
    return { matched: [], unmatched: [] }
  }

  // Split by newlines, semicolons, or commas
  const lines = rawText
    .split(/[\r\n,;]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const matched = []
  const unmatched = []
  const matchedIds = new Set()

  lines.forEach((name) => {
    const normalized = name.toLowerCase().replace(/\s+/g, ' ')
    const found = animatorList.find((a) => (a.nev || '').toLowerCase().replace(/\s+/g, ' ') === normalized)

    if (found) {
      if (!matchedIds.has(found.animator_ID)) {
        matchedIds.add(found.animator_ID)
        matched.push(found)
      }
    } else {
      unmatched.push(name)
    }
  })

  return { matched, unmatched }
}

/**
 * Checks if an animator has admin rights based on the 'pozicio' table.
 * Rule: An animator has admin rights IF they have a row in 'pozicio' linked to the latest 'tisztújítás' event.
 * @param {number|string} animatorId 
 * @param {Array<object>} pozicioRecords 
 * @param {Array<object>} events 
 * @returns {{ isAdmin: boolean, pozicio: string|null, latestTisztujitas: object|null }}
 */
export function checkAdminPermission(animatorId, pozicioRecords = [], events = []) {
  const numericId = Number(animatorId)
  if (isNaN(numericId) || numericId <= 0) {
    return { animator_ID: numericId, isAdmin: false, pozicio: null, latestTisztujitas: null }
  }

  // Helper to match 'tisztújítás' or 'tisztujitas' with or without accents
  const isTisztujitasType = (t) => {
    if (!t || typeof t !== 'string') return false
    const normalized = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    return normalized === 'tisztujitas' || normalized.includes('tisztujit')
  }

  // 1. Find the latest event of type 'tisztújítás'
  const tisztujitasEvents = (events || [])
    .filter((e) => isTisztujitasType(e.tipus))
    .sort((a, b) => new Date(b.datum) - new Date(a.datum) || Number(b.esemeny_ID) - Number(a.esemeny_ID))

  const latestTisztujitas = tisztujitasEvents[0] || null
  if (!latestTisztujitas) {
    return { animator_ID: numericId, isAdmin: false, pozicio: null, latestTisztujitas: null }
  }

  // 2. Check if the animator has a position record for this latest event
  const positionRecord = (pozicioRecords || []).find(
    (p) =>
      Number(p.animator_ID) === numericId &&
      Number(p.esemeny_ID) === Number(latestTisztujitas.esemeny_ID)
  )

  return {
    animator_ID: numericId,
    isAdmin: Boolean(positionRecord),
    pozicio: positionRecord?.pozicio || null,
    latestTisztujitas: {
      esemeny_ID: latestTisztujitas.esemeny_ID,
      cim: latestTisztujitas.cim,
      datum: latestTisztujitas.datum
    }
  }
}

/**
 * Determines the prominent display badge role for an animator in the topbar and profile.
 * Hierarchy:
 * 1. Elected leadership position from the latest tisztújítás (e.g. 'Elnök', 'Gazdasági felelős')
 * 2. Serious community status/category: 'Veterán' or 'Vén'
 * 3. Default: 'Animátor' (never displays negative labels like "(Nem admin)")
 * @param {object} animator - Animator record (with kategoria, statusz)
 * @param {string|null} position - Position held in the latest tisztújítás (if any)
 * @returns {{ roleLabel: string, roleType: 'position' | 'veteran' | 'ven' | 'default' }}
 */
export function getAnimatorDisplayRole(animator = {}, position = null) {
  // 1. If holding an active position in the latest tisztújítás
  if (position && typeof position === 'string' && position.trim().length > 0) {
    return {
      roleLabel: position.trim(),
      roleType: 'position'
    }
  }

  // 2. Check for serious community roles: Veterán or Vén
  const kat = (animator?.kategoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const stat = (animator?.statusz || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (kat.includes('veteran') || stat.includes('veteran')) {
    return {
      roleLabel: 'Veterán',
      roleType: 'veteran'
    }
  }

  if (kat.includes('ven') || stat.includes('ven')) {
    return {
      roleLabel: 'Vén',
      roleType: 'ven'
    }
  }

  if (kat.includes('ex') || stat.includes('ex')) {
    return {
      roleLabel: 'Ex',
      roleType: 'ex'
    }
  }

  // 3. Default fallback: simply 'Animátor'
  return {
    roleLabel: 'Animátor',
    roleType: 'default'
  }
}


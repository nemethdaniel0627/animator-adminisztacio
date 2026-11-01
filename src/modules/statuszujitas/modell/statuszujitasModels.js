/**
 * Státuszújítás Domain Models & Evaluation Logic
 * 
 * Rules:
 * - Eligible roles: 'aktív', 'ifjú', 'passzív'
 * - Requirements for renewal:
 *   1. 2 Közgyűlés jelenlét
 *   2. 1 Egyetemi rendezvény
 *   3. 1 További Egyetemi rendezvény VAGY Nagyrendezvény (összesen legalább 2 egyetemi/nagy, amiből min. 1 egyetemi)
 *   4. 1 Tréning
 * - If any requirement fails, user MUST provide a Szövegdoboz explanation (indoklás).
 */

export const ELIGIBLE_STATUSES = ['aktív', 'ifjú', 'vén', 'veterán']

export const STATUSZ_OPTIONS = [
  'Ex',
  'Aktív',
  'Passzív',
  'Ifjú',
  'Veterán',
  'Vén',
]

export const REQUESTABLE_STATUSES = ['Aktív', 'Passzív', 'Vén', 'Veterán', 'Ex']

/**
 * Matches any status string case-insensitively to the canonical STATUSZ_OPTIONS value.
 * Defaults to 'Ex' if invalid or missing.
 */
export function matchStatusOption(status) {
  if (!status) return 'Ex'
  const found = STATUSZ_OPTIONS.find((opt) => opt.toLowerCase() === String(status).trim().toLowerCase())
  return found || 'Ex'
}

/**
 * Normalizes a status string (lowercase, accent-tolerant).
 */
export function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return ''
  return status.trim().toLowerCase()
}

/**
 * Checks if an animator is eligible / required to fill out status renewal.
 */
export function isEligibleForStatuszujitas(statusz) {
  const norm = normalizeStatus(statusz)
  return ELIGIBLE_STATUSES.includes(norm)
}

/**
 * Determines whether the status renewal period is currently active.
 * Both the admin isActive flag MUST be true, AND the current date must fall within [startDate, endDate].
 * @param {object} config - { isActive: boolean, startDate: string, endDate: string }
 * @param {string|Date} [customDate] - Optional date to check against (defaults to today)
 * @returns {boolean}
 */
export function isStatuszujitasPeriodActive(config, customDate = null) {
  if (!config) return false
  if (config.isActive === false) return false
  if (!config.startDate || !config.endDate) return false

  const d = customDate ? new Date(customDate) : new Date()
  if (isNaN(d.getTime())) return false

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`

  return todayStr >= config.startDate && todayStr <= config.endDate
}

/**
 * Evaluates an animator's attendances against the 4 mandatory requirements.
 * @param {Array<object>} attendances - List of attendances with event details (cim, tipus, datum)
 * @returns {object} Full evaluation result
 */
export function checkStatuszRequirements(attendances = []) {
  const safeAtts = Array.isArray(attendances) ? attendances : []

  const kgyAtts = []
  const egyetemiAtts = []
  const nagyrendezvenyAtts = []
  const treningAtts = []

  safeAtts.forEach((att) => {
    const tipus = (att.tipus || '').toLowerCase()
    const cim = (att.cim || '').toLowerCase()

    if (tipus.includes('közgyűlés') || tipus.includes('kozgyules') || cim.includes('közgyűlés') || cim.includes('kozgyules')) {
      kgyAtts.push(att)
    } else if (tipus.includes('egyetemi') || cim.includes('egyetemi') || cim.includes('pázmány') || cim.includes('gólyanap')) {
      egyetemiAtts.push(att)
    } else if (tipus.includes('nagyrendezvény') || tipus.includes('nagyrendezveny') || cim.includes('gólyatábor')) {
      nagyrendezvenyAtts.push(att)
    } else if (tipus.includes('tréning') || tipus.includes('trening') || cim.includes('tréning') || cim.includes('képzés')) {
      treningAtts.push(att)
    }
  })

  const kgyCount = kgyAtts.length
  const egyetemiCount = egyetemiAtts.length
  const nagyCount = nagyrendezvenyAtts.length
  const egyetemiOrNagyCount = egyetemiCount + nagyCount
  const treningCount = treningAtts.length

  // Check the 4 requirements:
  // 1. 2 kgy attendance
  const kgyMet = kgyCount >= 2

  // 2. 1 "egyetemi rendezvény"
  const egyetemiMet = egyetemiCount >= 1

  // 3. 1 "egyetemi rendezvény" or "nagy rendezvény" (meaning total egyetemi + nagy is at least 2)
  const egyetemiOrNagyMet = egyetemiCount >= 1 && egyetemiOrNagyCount >= 2

  // 4. 1 "tréning"
  const treningMet = treningCount >= 1

  const passed = kgyMet && egyetemiMet && egyetemiOrNagyMet && treningMet

  const missing = []
  if (!kgyMet) {
    missing.push(`Közgyűlés: ${kgyCount}/2 teljesítve (hiányzik: ${2 - kgyCount})`)
  }
  if (!egyetemiMet) {
    missing.push(`Egyetemi rendezvény: ${egyetemiCount}/1 teljesítve (hiányzik: 1)`)
  } else if (!egyetemiOrNagyMet) {
    missing.push(`További Egyetemi vagy Nagyrendezvény: ${egyetemiOrNagyCount}/2 teljesítve (hiányzik: 1)`)
  }
  if (!treningMet) {
    missing.push(`Tréning: ${treningCount}/1 teljesítve (hiányzik: 1)`)
  }

  return {
    passed,
    kgyCount,
    egyetemiCount,
    nagyCount,
    egyetemiOrNagyCount,
    treningCount,
    kgyMet,
    egyetemiMet,
    egyetemiOrNagyMet,
    treningMet,
    missing,
    counts: {
      kgy: kgyCount,
      egyetemi: egyetemiCount,
      nagyrendezveny: nagyCount,
      trening: treningCount
    },
    matchedEvents: {
      kgy: kgyAtts,
      egyetemi: egyetemiAtts,
      nagyrendezveny: nagyrendezvenyAtts,
      trening: treningAtts
    }
  }
}

/**
 * Validates a status renewal submission.
 * If requirements are not met, 'indoklas' is strictly mandatory.
 */
export function validateStatuszSubmission({ passed, igenyeltStatusz, indoklas }) {
  const errors = {}

  if (!igenyeltStatusz || !REQUESTABLE_STATUSES.map(s => s.toLowerCase()).includes(igenyeltStatusz.toLowerCase())) {
    errors.igenyeltStatusz = 'Kérlek válassz egy érvényes igényelt státuszt (Aktív, Passzív, Veterán, Vén, Ex).'
  }

  const isExOrPassziv = (igenyeltStatusz || '').toLowerCase() === 'ex' || (igenyeltStatusz || '').toLowerCase() === 'passzív'

  // If requirements are not met, indoklás is mandatory EXCEPT for 'Ex' status
  if (!passed && !isExOrPassziv) {
    if (!indoklas || typeof indoklas !== 'string' || indoklas.trim().length < 10) {
      errors.indoklas = 'Mivel nem teljesült minden feltétel, kötelező részletes indoklást megadnod a vezetőség számára (legalább 10 karakter).'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Event Models & Validation Rules
 * Pure functions for event data structures and calculations.
 */

export const EVENT_TYPES = [
  'egyetemi rendezvény',
  'nagyrendezvény',
  'egyéb',
  'státuszújítás',
  'tisztújítás',
  'közgyűlés',
  'tréning'
]

/**
 * Validates whether a given string is one of the 7 valid event types.
 * @param {string} type 
 * @returns {boolean}
 */
export function isValidEventType(type) {
  return EVENT_TYPES.includes(type)
}

/**
 * Computes the next upcoming sequential event ID.
 * Formula: MAX(esemeny_ID) + 1 (defaults to 1 if no events exist).
 * @param {Array<{esemeny_ID: number|string}>} existingEvents 
 * @returns {number}
 */
export function calculateNextEventId(existingEvents = []) {
  if (!Array.isArray(existingEvents) || existingEvents.length === 0) {
    return 1
  }
  const maxId = existingEvents.reduce((max, event) => {
    const id = Number(event?.esemeny_ID) || 0
    return id > max ? id : max
  }, 0)
  return maxId + 1
}

/**
 * Validates and sanitizes event input data.
 * @param {{ esemeny_ID?: number|string, cim: string, datum: string, tipus: string }} input 
 * @returns {{ isValid: boolean, errors: Record<string, string>, value: { esemeny_ID?: number, cim: string, datum: string, tipus: string } }}
 */
export function createEventModel(input = {}) {
  const errors = {}

  const cim = typeof input.cim === 'string' ? input.cim.trim() : ''
  if (!cim) {
    errors.cim = 'Az esemény neve kötelező.'
  } else if (cim.length > 100) {
    errors.cim = 'Az esemény neve legfeljebb 100 karakter lehet.'
  }

  const datum = typeof input.datum === 'string' ? input.datum.trim() : ''
  if (!datum || isNaN(Date.parse(datum))) {
    errors.datum = 'Érvényes dátum megadása kötelező.'
  }

  const tipus = typeof input.tipus === 'string' ? input.tipus.trim() : ''
  if (!isValidEventType(tipus)) {
    errors.tipus = `Érvénytelen eseménytípus. Válasszon a 7 standard típus közül.`
  }

  const value = {
    cim,
    datum,
    tipus
  }

  if (input.esemeny_ID !== undefined && input.esemeny_ID !== null) {
    value.esemeny_ID = Number(input.esemeny_ID)
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value
  }
}

/**
 * Attendance (Jelenlét) Models & Batch Payload Helpers
 * Pure functions for attendance registration and duplicate prevention.
 */

/**
 * Computes the next upcoming sequential attendance ID.
 * Formula: MAX(jelenlet_ID) + 1 (defaults to 1 if empty).
 * @param {Array<{jelenlet_ID: number|string}>} existingAttendances 
 * @returns {number}
 */
export function calculateNextJelenletId(existingAttendances = []) {
  if (!Array.isArray(existingAttendances) || existingAttendances.length === 0) {
    return 1
  }
  const maxId = existingAttendances.reduce((max, item) => {
    const id = Number(item?.jelenlet_ID) || 0
    return id > max ? id : max
  }, 0)
  return maxId + 1
}

/**
 * Validates that animators are not recorded twice for the same event.
 * Checks against both already recorded attendances and within the new selection.
 * @param {Array<{animator_ID: number|string}|number|string>} existingAttendances 
 * @param {Array<number|string>} newAnimatorIds 
 * @returns {{ isValid: boolean, duplicateIds: number[], uniqueNewIds: number[] }}
 */
export function validateNoDuplicates(existingAttendances = [], newAnimatorIds = []) {
  const existingSet = new Set(
    (existingAttendances || []).map((item) => {
      return typeof item === 'object' && item !== null
        ? Number(item.animator_ID)
        : Number(item)
    }).filter((id) => !isNaN(id) && id > 0)
  )

  const seenInBatch = new Set()
  const duplicateIds = []
  const uniqueNewIds = []

  ;(newAnimatorIds || []).forEach((rawId) => {
    const id = Number(rawId)
    if (isNaN(id) || id <= 0) return

    if (existingSet.has(id) || seenInBatch.has(id)) {
      if (!duplicateIds.includes(id)) {
        duplicateIds.push(id)
      }
    } else {
      seenInBatch.add(id)
      uniqueNewIds.push(id)
    }
  })

  return {
    isValid: duplicateIds.length === 0,
    duplicateIds,
    uniqueNewIds
  }
}

/**
 * Builds the payload for batch inserting attendances.
 * Can optionally assign consecutive preview/mock IDs.
 * @param {number|string} eventId 
 * @param {Array<number|string>} animatorIds 
 * @param {number} [startingJelenletId=null] 
 * @returns {Array<{jelenlet_ID?: number, esemeny_ID: number, animator_ID: number}>}
 */
export function buildBatchAttendancePayload(eventId, animatorIds = [], startingJelenletId = null) {
  const numericEventId = Number(eventId)
  const hasStartingId = startingJelenletId !== null && !isNaN(Number(startingJelenletId))
  const startId = hasStartingId ? Number(startingJelenletId) : 0

  return (animatorIds || []).map((animatorId, index) => {
    const payload = {
      esemeny_ID: numericEventId,
      animator_ID: Number(animatorId)
    }
    if (hasStartingId) {
      payload.jelenlet_ID = startId + index
    }
    return payload
  })
}

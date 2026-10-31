/**
 * Attendance Service (Szolgáltatás réteg)
 * Encapsulates attendance records and batch transaction API communications.
 */

import { apiClient } from '../../../common/api/apiClient.js'

export const jelenletService = {
  /**
   * Fetches all recorded attendances for a specific event.
   * @param {number|string} eventId 
   * @returns {Promise<Array<object>>}
   */
  async getAttendancesByEvent(eventId) {
    return apiClient.get(`/api/events/${eventId}/attendances`)
  },

  /**
   * Batch records attendances for an event in a single atomic transaction.
   * @param {number|string} eventId 
   * @param {Array<number>} animatorIds 
   * @returns {Promise<{ success: boolean, count: number, createdJelenletIds: Array<number>, attendances: Array<object> }>}
   */
  async saveBatchAttendance(eventId, animatorIds) {
    return apiClient.post(`/api/events/${eventId}/attendances`, {
      animator_ids: animatorIds
    })
  },

  /**
   * Deletes a single attendance record by jelenlet_ID.
   * @param {number|string} jelenletId 
   * @returns {Promise<{ success: boolean }>}
   */
  async deleteAttendance(jelenletId) {
    return apiClient.delete(`/api/attendances/${jelenletId}`)
  }
}

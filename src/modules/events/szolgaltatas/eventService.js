/**
 * Event Service (Szolgáltatás réteg)
 * Encapsulates all event API communications.
 */

import { apiClient } from '../../../common/api/apiClient.js'

export const eventService = {
  /**
   * Fetches all events with attendee counts.
   * @returns {Promise<Array<object>>}
   */
  async getEvents() {
    return apiClient.get('/api/events')
  },

  /**
   * Fetches upcoming sequential event ID.
   * @returns {Promise<number>}
   */
  async getNextEventId() {
    const res = await apiClient.get('/api/events/next-id')
    return res.next_esemeny_ID
  },

  /**
   * Creates a new event record.
   * @param {{ cim: string, datum: string, tipus: string }} eventData 
   * @returns {Promise<{ esemeny_ID: number, message: string }>}
   */
  async createEvent(eventData) {
    return apiClient.post('/api/events', eventData)
  },

  /**
   * Updates an existing event record.
   * @param {number|string} eventId 
   * @param {{ cim: string, datum: string, tipus: string }} eventData 
   * @returns {Promise<{ esemeny_ID: number, event: object, message: string }>}
   */
  async updateEvent(eventId, eventData) {
    return apiClient.put(`/api/events/${eventId}`, eventData)
  }
};

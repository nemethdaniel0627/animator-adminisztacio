/**
 * Animator Service (Szolgáltatás réteg)
 * Encapsulates animator directory API communications.
 */

import { apiClient } from '../../../common/api/apiClient.js'

export const animatorService = {
  /**
   * Fetches all registered animators.
   * @returns {Promise<Array<object>>}
   */
  async getAnimators() {
    return apiClient.get('/api/animators')
  }
}

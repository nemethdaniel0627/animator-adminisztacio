/**
 * Státuszújítás Service
 * Communicates with backend / mockStore for status renewal configurations,
 * attendee requirement checks, submissions, and admin approvals.
 */

import { apiClient } from '../../../common/api/apiClient.js'
import { mockStore } from '../../../common/api/mockData.js'
import {
  checkStatuszRequirements,
  isEligibleForStatuszujitas,
  isStatuszujitasPeriodActive,
  validateStatuszSubmission
} from '../modell/statuszujitasModels.js'

export const statuszujitasService = {
  /**
   * Fetches the current status renewal configuration (isActive, startDate, endDate, ev).
   * First queries the shared backend / Vite dev server endpoint to ensure all tabs,
   * incognito windows, and multi-device sessions stay synchronized.
   */
  async getConfig() {
    let cfg = null

    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/statuszujitas/config')
        if (res.ok) {
          const remote = await res.json()
          if (remote && typeof remote === 'object' && remote.startDate && remote.endDate) {
            cfg = remote
            mockStore.syncStatuszujitasConfig(remote)
          }
        }
      } catch (err) {
        // Fall back to client / mock store
      }
    }

    if (!cfg) {
      cfg = await apiClient.getStatuszujitasConfig()
    }

    return {
      ...cfg,
      isPeriodActive: isStatuszujitasPeriodActive(cfg)
    }
  },

  /**
   * Updates the status renewal configuration (Admin only).
   * Persists to shared endpoint and updates local stores.
   */
  async updateConfig(config) {
    let updated = config

    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/statuszujitas/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        })
        if (res.ok) {
          updated = await res.json()
        }
      } catch (err) {
        // Network fallback
      }
    }

    const clientResult = await apiClient.updateStatuszujitasConfig(updated)
    const finalCfg = { ...(clientResult || {}), ...(updated || {}) }
    mockStore.syncStatuszujitasConfig(finalCfg)

    return {
      ...finalCfg,
      isPeriodActive: isStatuszujitasPeriodActive(finalCfg)
    }
  },

  /**
   * Fetches all eligible animators and their status renewal requests (Admin only).
   */
  async getKerelmek() {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/statuszujitas/kerelmek')
        if (res.ok) {
          const remoteKerelmek = await res.json()
          if (Array.isArray(remoteKerelmek)) {
            mockStore.syncStatuszujitasKerelmek(remoteKerelmek)
          }
        }
      } catch (err) {
        // Silent fallback
      }
    }
    return apiClient.getStatuszujitasKerelmek()
  },

  /**
   * Fetches the current user's status renewal progress and requirements check.
   */
  async getUserProgress(animatorId) {
    const config = await this.getConfig()

    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/statuszujitas/kerelmek')
        if (res.ok) {
          const remoteKerelmek = await res.json()
          if (Array.isArray(remoteKerelmek)) {
            mockStore.syncStatuszujitasKerelmek(remoteKerelmek)
          }
        }
      } catch (err) {
        // Silent fallback
      }
    }

    const progress = await apiClient.getStatuszujitasUserProgress(animatorId)
    return {
      ...progress,
      config
    }
  },

  /**
   * Submits a status renewal request.
   * If attendance requirements fail, 'indoklas' is mandatory.
   */
  async submitKerelem({ animator_ID, igenyelt_statusz, indoklas = '' }) {
    if (typeof fetch !== 'undefined') {
      try {
        await fetch('/api/statuszujitas/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animator_ID, igenyelt_statusz, indoklas })
        })
      } catch (err) {
        // Fall back
      }
    }

    return apiClient.submitStatuszujitasKerelem({
      animator_ID,
      igenyelt_statusz,
      indoklas
    })
  },

  /**
   * Admin approves / updates an animator's status.
   */
  async decideKerelem(animatorId, megadottStatusz) {
    if (typeof fetch !== 'undefined') {
      try {
        await fetch(`/api/statuszujitas/decision/${animatorId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ megadott_statusz: megadottStatusz })
        })
      } catch (err) {
        // Fall back
      }
    }

    return apiClient.decideStatuszujitasKerelem(animatorId, {
      megadott_statusz: megadottStatusz
    })
  }
}

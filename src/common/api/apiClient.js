/**
 * API Client Bridge
 * Routes requests to Mock Data Store or Backend REST API based on VITE_USE_MOCK environment variable.
 */

import { mockStore } from './mockData.js'

// Defaults to true (Mock Mode) unless explicitly set to 'false'
const IS_MOCK_MODE =
  typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_USE_MOCK === 'false'
    ? false
    : true

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api'

/**
 * Dispatches simulated mock network requests with a slight natural delay (30-80ms).
 */
async function handleMockRequest(method, endpoint, body = null) {
  await new Promise((resolve) => setTimeout(resolve, 50))

  const cleanEndpoint = endpoint.replace(/^\/api/, '')

  // GET /events
  if (method === 'GET' && cleanEndpoint === '/events') {
    return mockStore.getEvents()
  }

  // GET /events/next-id
  if (method === 'GET' && cleanEndpoint === '/events/next-id') {
    return { next_esemeny_ID: mockStore.getNextEventId() }
  }

  // POST /events
  if (method === 'POST' && cleanEndpoint === '/events') {
    return mockStore.createEvent(body)
  }


  // Státuszújítás Endpoints
  if (method === 'GET' && cleanEndpoint === '/statuszujitas/config') {
    return mockStore.getStatuszujitasConfig()
  }

  if (method === 'PUT' && cleanEndpoint === '/statuszujitas/config') {
    return mockStore.updateStatuszujitasConfig(body)
  }

  if (method === 'GET' && cleanEndpoint === '/statuszujitas/kerelmek') {
    return mockStore.getStatuszujitasKerelmek()
  }

  const matchStatuszProgress = cleanEndpoint.match(/^\/statuszujitas\/progress\/(\d+)$/)
  if (method === 'GET' && matchStatuszProgress) {
    const animId = Number(matchStatuszProgress[1])
    return mockStore.getStatuszujitasUserProgress(animId)
  }

  if (method === 'POST' && cleanEndpoint === '/statuszujitas/submit') {
    return mockStore.submitStatuszujitasKerelem(body)
  }

  const matchStatuszDecision = cleanEndpoint.match(/^\/statuszujitas\/decision\/(\d+)$/)
  if (method === 'POST' && matchStatuszDecision) {
    const animId = Number(matchStatuszDecision[1])
    return mockStore.decideStatuszujitasKerelem(animId, body)
  }

  // GET /animators
  if (method === 'GET' && cleanEndpoint === '/animators') {
    return mockStore.getAnimators()
  }

  // GET /animators/:id/attendances
  const matchAnimatorAttendances = cleanEndpoint.match(/^\/animators\/(\d+)\/attendances$/)
  if (method === 'GET' && matchAnimatorAttendances) {
    const animId = Number(matchAnimatorAttendances[1])
    return mockStore.getAttendancesByAnimator(animId)
  }

  // PUT /events/:id or POST /events/:id
  const matchEventUpdate = cleanEndpoint.match(/^\/events\/(\d+)$/)
  if ((method === 'PUT' || method === 'POST') && matchEventUpdate) {
    const eventId = Number(matchEventUpdate[1])
    return mockStore.updateEvent(eventId, body)
  }

  // GET /events/:id/attendances
  const matchEventAttendances = cleanEndpoint.match(/^\/events\/(\d+)\/attendances$/)
  if (method === 'GET' && matchEventAttendances) {
    const eventId = Number(matchEventAttendances[1])
    return mockStore.getAttendancesByEvent(eventId)
  }

  // POST /events/:id/attendances
  if (method === 'POST' && matchEventAttendances) {
    const eventId = Number(matchEventAttendances[1])
    const animatorIds = Array.isArray(body?.animator_ids) ? body.animator_ids : []
    return mockStore.saveBatchAttendance(eventId, animatorIds)
  }

  // GET /profile
  if (method === 'GET' && cleanEndpoint === '/profile') {
    return mockStore.getProfile()
  }

  // POST /profile or PUT /profile
  if ((method === 'POST' || method === 'PUT') && cleanEndpoint === '/profile') {
    return mockStore.updateProfile(body)
  }

  // GET /stats
  if (method === 'GET' && cleanEndpoint === '/stats') {
    return mockStore.getStats()
  }

  // GET /kgy/state
  if (method === 'GET' && cleanEndpoint === '/kgy/state') {
    return {
      isAttendanceActive: true,
      isSummaryActive: false,
      attendees: [1001],
      polls: []
    }
  }

  // GET /permissions/:id
  const matchPermission = cleanEndpoint.match(/^\/permissions\/(\d+)$/)
  if (method === 'GET' && matchPermission) {
    const animatorId = Number(matchPermission[1])
    return mockStore.checkAdminPermission(animatorId)
  }

  // GET /positions
  if (method === 'GET' && cleanEndpoint === '/positions') {
    return mockStore.getPoziciok()
  }

  // POST /tisztujitas
  if (method === 'POST' && (cleanEndpoint === '/tisztujitas' || cleanEndpoint === '/events/tisztujitas')) {
    return mockStore.createTisztujitas(body)
  }

  // GET /events/:id/positions
  const matchEventPositions = cleanEndpoint.match(/^\/events\/(\d+)\/positions$/)
  if (method === 'GET' && matchEventPositions) {
    const eventId = Number(matchEventPositions[1])
    return mockStore.getPoziciokByEvent(eventId)
  }

  // POST /events/:id/positions
  if (method === 'POST' && matchEventPositions) {
    const eventId = Number(matchEventPositions[1])
    return mockStore.addPozicio(eventId, body)
  }

  // PUT /positions/:id
  const matchUpdatePosition = cleanEndpoint.match(/^\/positions\/(\d+)$/)
  if (method === 'PUT' && matchUpdatePosition) {
    const posId = Number(matchUpdatePosition[1])
    return mockStore.updatePozicio(posId, body)
  }

  // DELETE /positions/:id
  if (method === 'DELETE' && matchUpdatePosition) {
    const posId = Number(matchUpdatePosition[1])
    return mockStore.deletePozicio(posId)
  }

  // DELETE /attendances/:id
  const matchDeleteAttendance = cleanEndpoint.match(/^\/attendances\/(\d+)$/)
  if (method === 'DELETE' && matchDeleteAttendance) {
    const jelenletId = Number(matchDeleteAttendance[1])
    return mockStore.deleteAttendance(jelenletId)
  }

  throw new Error(`Mock endpoint not found: ${method} ${endpoint}`)
}

/**
 * Live HTTP request handler
 */
async function handleLiveRequest(method, endpoint, body = null) {
  // Normalize path to prevent double `/api/api`
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const base = String(API_BASE_URL || '').trim().replace(/\/+$/, '')

  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice(4) // remove duplicate '/api'
  }
  const url = `${base}${cleanEndpoint}`

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`
    try {
      const errorJson = await response.json()
      if (errorJson.message) errorMsg = errorJson.message
    } catch {
      // silent
    }
    throw new Error(errorMsg)
  }

  return response.json()
}

export const apiClient = {
  isMockMode: IS_MOCK_MODE,

  async get(endpoint) {
    if (this.isMockMode) {
      return handleMockRequest('GET', endpoint)
    }
    return handleLiveRequest('GET', endpoint)
  },

  async post(endpoint, body) {
    if (this.isMockMode) {
      return handleMockRequest('POST', endpoint, body)
    }
    return handleLiveRequest('POST', endpoint, body)
  },

  async put(endpoint, body) {
    if (this.isMockMode) {
      return handleMockRequest('PUT', endpoint, body)
    }
    return handleLiveRequest('PUT', endpoint, body)
  },

  async delete(endpoint) {
    if (this.isMockMode) {
      return handleMockRequest('DELETE', endpoint)
    }
    return handleLiveRequest('DELETE', endpoint)
  },

  async getAnimatorAttendances(animatorId) {
    return this.get(`/api/animators/${animatorId}/attendances`)
  },

  async checkPermissions(animatorId) {
    return this.get(`/api/permissions/${animatorId}`)
  },

  async createTisztujitas(payload) {
    return this.post('/api/tisztujitas', payload)
  },

  async getEventPositions(eventId) {
    return this.get(`/api/events/${eventId}/positions`)
  },

  async getPositions() {
    return this.get('/api/positions')
  },

  async addEventPosition(eventId, payload) {
    return this.post(`/api/events/${eventId}/positions`, payload)
  },

  async updatePosition(pozicioId, payload) {
    return this.put(`/api/positions/${pozicioId}`, payload)
  },

  async deletePosition(pozicioId) {
    return this.delete(`/api/positions/${pozicioId}`)
  },

  async getStatuszujitasConfig() {
    return this.get('/api/statuszujitas/config')
  },

  async updateStatuszujitasConfig(config) {
    return this.put('/api/statuszujitas/config', config)
  },

  async getStatuszujitasKerelmek() {
    return this.get('/api/statuszujitas/kerelmek')
  },

  async getStatuszujitasUserProgress(animatorId) {
    return this.get(`/api/statuszujitas/progress/${animatorId}`)
  },

  async submitStatuszujitasKerelem(payload) {
    return this.post('/api/statuszujitas/submit', payload)
  },

  async decideStatuszujitasKerelem(animatorId, payload) {
    return this.post(`/api/statuszujitas/decision/${animatorId}`, payload)
  }
}

const KGY_STORAGE_KEY = 'animator_kgy_state_v1'

const DEFAULT_STATE = {
  isAttendanceActive: false,
  isFinalized: false,
  finalizedEventId: null,
  finalizedAt: null,
  isSummaryActive: false,
  attendees: [1001],
  polls: [
    {
      id: 1,
      title: 'asd',
      options: ['Igen'],
      status: 'deactivated',
      votes: {}
    }
  ]
}

export const kgyService = {
  getState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(KGY_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && Array.isArray(parsed.polls) && Array.isArray(parsed.attendees)) {
            return parsed
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse kgy state', e)
    }
    return DEFAULT_STATE
  },

  saveState(state) {
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          localStorage.setItem(KGY_STORAGE_KEY, JSON.stringify(state))
        }
        window.dispatchEvent(new CustomEvent('kgy_state_change', { detail: state }))

        // Sync with shared backend / Vite dev server endpoint
        if (typeof fetch !== 'undefined') {
          fetch('/api/kgy/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
          }).catch(() => {})
        }
      }
    } catch (e) {
      console.error('Failed to save kgy state', e)
    }
  },

  async fetchRemoteState() {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
      return this.getState()
    }

    try {
      const res = await fetch('/api/kgy/state')
      if (res.ok) {
        const remote = await res.json()
        if (remote && Array.isArray(remote.polls) && Array.isArray(remote.attendees)) {
          if (window.localStorage) {
            localStorage.setItem(KGY_STORAGE_KEY, JSON.stringify(remote))
          }
          window.dispatchEvent(new CustomEvent('kgy_state_change', { detail: remote }))
          return remote
        }
      }
    } catch (err) {
      // Offline or network error - gracefully fall back to local state
    }
    return this.getState()
  },

  startAutoSync(callback, intervalMs = 1500) {
    if (typeof window === 'undefined') return () => {}

    // Initial fetch
    this.fetchRemoteState().then((s) => {
      if (typeof callback === 'function') callback(s)
    })

    // Periodic poll to sync incognito windows and multi-device sessions
    const timer = setInterval(() => {
      this.fetchRemoteState().then((s) => {
        if (typeof callback === 'function') callback(s)
      })
    }, intervalMs)

    return () => clearInterval(timer)
  },

  toggleAttendance() {
    const state = this.getState()
    state.isAttendanceActive = !state.isAttendanceActive
    this.saveState(state)
    return state
  },

  registerAttendance(animatorId) {
    const id = Number(animatorId)
    if (!id) return this.getState()
    const state = this.getState()
    if (!state.attendees.includes(id)) {
      state.attendees = [...state.attendees, id]
      this.saveState(state)
    }
    return state
  },

  toggleSummary() {
    const state = this.getState()
    state.isSummaryActive = !state.isSummaryActive
    this.saveState(state)
    return state
  },

  addPoll(title = '', options = []) {
    const state = this.getState()
    const nextId = state.polls.length > 0 ? Math.max(...state.polls.map((p) => p.id)) + 1 : 1
    const newPoll = {
      id: nextId,
      title: title || '',
      options: options.length > 0 ? options : ['Igen'],
      status: 'deactivated',
      votes: {}
    }
    state.polls = [...state.polls, newPoll]
    this.saveState(state)
    return state
  },

  removeLastPoll() {
    const state = this.getState()
    if (state.polls.length > 0) {
      state.polls = state.polls.slice(0, -1)
      this.saveState(state)
    }
    return state
  },

  finalizeKgy(eventId) {
    const state = this.getState()
    state.isAttendanceActive = false
    state.isFinalized = true
    state.finalizedEventId = Number(eventId)
    state.finalizedAt = new Date().toISOString()
    // Move any active poll to results view
    state.polls = state.polls.map((p) => (p.status === 'active' ? { ...p, status: 'results' } : p))
    this.saveState(state)
    return state
  },

  clearPolls() {
    const state = this.getState()
    state.polls = []
    this.saveState(state)
    return state
  },

  restartKgy() {
    const state = this.getState()
    state.isAttendanceActive = false
    state.isSummaryActive = false
    state.isFinalized = false
    state.finalizedEventId = null
    state.finalizedAt = null
    state.attendees = []
    state.polls = state.polls.map((p) => ({
      ...p,
      status: 'deactivated',
      votes: {}
    }))
    this.saveState(state)
    return state
  },

  updatePollTitle(pollId, title) {
    const state = this.getState()
    state.polls = state.polls.map((p) => (p.id === pollId ? { ...p, title } : p))
    this.saveState(state)
    return state
  },

  addOption(pollId, optionText) {
    const opt = (optionText || '').trim()
    if (!opt || opt.toLowerCase() === 'tartózkodom' || opt.toLowerCase() === 'tartozkodom') return this.getState()
    const state = this.getState()
    state.polls = state.polls.map((p) => {
      if (p.id === pollId) {
        if (!p.options.includes(opt)) {
          return { ...p, options: [...p.options, opt] }
        }
      }
      return p
    })
    this.saveState(state)
    return state
  },

  removeOption(pollId, optionIdx) {
    const state = this.getState()
    state.polls = state.polls.map((p) => {
      if (p.id === pollId) {
        return { ...p, options: p.options.filter((_, idx) => idx !== optionIdx) }
      }
      return p
    })
    this.saveState(state)
    return state
  },

  // 3-way cycle toggle for poll status:
  // 'deactivated' -> 'active' -> 'results' -> 'deactivated'
  cyclePollStatus(pollId) {
    const state = this.getState()
    state.polls = state.polls.map((p) => {
      if (p.id === pollId) {
        let nextStatus = 'active'
        if (p.status === 'deactivated') nextStatus = 'active'
        else if (p.status === 'active') nextStatus = 'results'
        else if (p.status === 'results') nextStatus = 'deactivated'
        return { ...p, status: nextStatus }
      } else {
        // Only one poll can be answerable (active) at a time
        if (p.status === 'active') {
          return { ...p, status: 'deactivated' }
        }
        return p
      }
    })
    this.saveState(state)
    return state
  },

  // Toggle active / deactivated
  togglePollActive(pollId) {
    const state = this.getState()
    state.polls = state.polls.map((p) => {
      if (p.id === pollId) {
        const nextStatus = p.status === 'active' ? 'deactivated' : 'active'
        return { ...p, status: nextStatus }
      } else {
        return p.status === 'active' ? { ...p, status: 'deactivated' } : p
      }
    })
    this.saveState(state)
    return state
  },

  submitVote(pollId, animatorId, option) {
    const animId = Number(animatorId)
    if (!animId) return this.getState()
    const state = this.getState()
    state.polls = state.polls.map((p) => {
      if (p.id === pollId) {
        return {
          ...p,
          votes: { ...p.votes, [animId]: option }
        }
      }
      return p
    })
    this.saveState(state)
    return state
  }
}

export function getPollResults(poll) {
  const votes = poll?.votes || {}
  const totalVotes = Object.keys(votes).length
  const allOptions = [...(poll?.options || []), 'Tartózkodom']
  const counts = {}
  allOptions.forEach((opt) => {
    counts[opt] = 0
  })
  Object.values(votes).forEach((selected) => {
    if (counts[selected] !== undefined) {
      counts[selected]++
    } else {
      counts[selected] = 1
    }
  })
  return {
    totalVotes,
    counts,
    hasVotes: totalVotes > 0
  }
}

export function getQuorumInfo(attendeesCount, allAnimators = []) {
  // Active animators count; fallback to 5 or animators length
  const activeAnimators = allAnimators.filter((a) => (a.statusz || '').toLowerCase() === 'aktív')
  const totalActive = activeAnimators.length > 0 ? activeAnimators.length : 5
  const isQuorum = attendeesCount > totalActive / 2
  return {
    totalActive,
    presentCount: attendeesCount,
    isQuorum,
    quorumText: isQuorum ? 'A közgyűlés határozatképes.' : 'A közgyűlés nem határozatképes.'
  }
}

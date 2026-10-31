import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

/**
 * Shared KGY State Plugin
 * Allows regular windows, incognito sessions, and multiple devices to share
 * real-time attendance and poll status.
 */
function kgyApiPlugin() {
  const KGY_FILE = path.resolve(process.cwd(), 'server/kgy_state.json')

  function getSharedState() {
    try {
      if (fs.existsSync(KGY_FILE)) {
        const raw = fs.readFileSync(KGY_FILE, 'utf8')
        return JSON.parse(raw)
      }
    } catch (e) {
      console.error('[kgy-api] Error reading kgy_state.json:', e)
    }
    return {
      isAttendanceActive: true,
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
  }

  function setSharedState(newState) {
    try {
      const dir = path.dirname(KGY_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(KGY_FILE, JSON.stringify(newState, null, 2), 'utf8')
    } catch (e) {
      console.error('[kgy-api] Error writing kgy_state.json:', e)
    }
  }

  return {
    name: 'kgy-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url.split('?')[0]
        if (urlPath === '/api/kgy/state') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(getSharedState()))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                setSharedState(parsed)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(parsed))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }
        next()
      })
    }
  }
}

/**
 * Shared Státuszújítás State Plugin
 * Synchronizes status renewal config and requests across regular windows,
 * incognito sessions, and multiple devices.
 */
function statuszujitasApiPlugin() {
  const STATUSZ_FILE = path.resolve(process.cwd(), 'server/statuszujitas_state.json')
  let cachedState = null

  function getSharedState() {
    if (cachedState) return cachedState
    try {
      if (fs.existsSync(STATUSZ_FILE)) {
        const raw = fs.readFileSync(STATUSZ_FILE, 'utf8')
        cachedState = JSON.parse(raw)
        return cachedState
      }
    } catch (e) {
      console.error('[statusz-api] Error reading statuszujitas_state.json:', e)
    }
    cachedState = {
      config: {
        isActive: true,
        startDate: '2026-10-30',
        endDate: '2026-11-02',
        ev: 2026
      },
      kerelmek: []
    }
    return cachedState
  }

  function setSharedState(newState) {
    cachedState = newState
    try {
      const dir = path.dirname(STATUSZ_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(STATUSZ_FILE, JSON.stringify(newState, null, 2), 'utf8')
    } catch (e) {
      console.error('[statusz-api] Error writing statuszujitas_state.json:', e)
    }
  }

  return {
    name: 'statuszujitas-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url.split('?')[0]
        if (urlPath === '/api/statuszujitas/config') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          const state = getSharedState()
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(state.config || {}))
            return
          }

          if (req.method === 'PUT' || req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                state.config = { ...(state.config || {}), ...parsed }
                setSharedState(state)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(state.config))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }

        if (urlPath === '/api/statuszujitas/kerelmek') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          const state = getSharedState()
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(state.kerelmek || []))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                if (Array.isArray(parsed)) {
                  state.kerelmek = parsed
                } else if (parsed && parsed.animator_ID) {
                  if (!state.kerelmek) state.kerelmek = []
                  const existingIdx = state.kerelmek.findIndex(
                    (k) => Number(k.animator_ID) === Number(parsed.animator_ID)
                  )
                  if (existingIdx !== -1) {
                    state.kerelmek[existingIdx] = { ...state.kerelmek[existingIdx], ...parsed }
                  } else {
                    const nextId = state.kerelmek.reduce((max, k) => Math.max(max, Number(k.kerelem_ID) || 0), 0) + 1
                    state.kerelmek.push({ ...parsed, kerelem_ID: parsed.kerelem_ID || nextId })
                  }
                }
                setSharedState(state)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(state.kerelmek))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }

        if (urlPath === '/api/statuszujitas/submit') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const state = getSharedState()
              if (!state.kerelmek) state.kerelmek = []
              const idx = state.kerelmek.findIndex(
                (k) => Number(k.animator_ID) === Number(payload.animator_ID)
              )
              const now = new Date().toISOString()
              let record
              if (idx !== -1) {
                state.kerelmek[idx] = {
                  ...state.kerelmek[idx],
                  igenyelt_statusz: payload.igenyelt_statusz,
                  indoklas: (payload.indoklas || '').trim(),
                  submittedAt: now,
                  status: 'fuggoben'
                }
                record = state.kerelmek[idx]
              } else {
                const nextId = state.kerelmek.reduce((max, k) => Math.max(max, Number(k.kerelem_ID) || 0), 0) + 1
                record = {
                  kerelem_ID: nextId,
                  animator_ID: Number(payload.animator_ID),
                  igenyelt_statusz: payload.igenyelt_statusz,
                  indoklas: (payload.indoklas || '').trim(),
                  submittedAt: now,
                  status: 'fuggoben',
                  megadott_statusz: payload.igenyelt_statusz,
                  dontes_datum: null
                }
                state.kerelmek.push(record)
              }
              setSharedState(state)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, kerelem: record }))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        const matchDecision = urlPath.match(/^\/api\/statuszujitas\/decision\/(\d+)$/)
        if (matchDecision) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          const animId = Number(matchDecision[1])
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const state = getSharedState()
              if (!state.kerelmek) state.kerelmek = []
              const idx = state.kerelmek.findIndex((k) => Number(k.animator_ID) === animId)
              const now = new Date().toISOString()
              let record
              if (idx !== -1) {
                state.kerelmek[idx] = {
                  ...state.kerelmek[idx],
                  megadott_statusz: payload.megadott_statusz,
                  status: 'elbirálva',
                  dontes_datum: now
                }
                record = state.kerelmek[idx]
              } else {
                const nextId = state.kerelmek.reduce((max, k) => Math.max(max, Number(k.kerelem_ID) || 0), 0) + 1
                record = {
                  kerelem_ID: nextId,
                  animator_ID: animId,
                  igenyelt_statusz: null,
                  indoklas: 'Adminisztrátori közvetlen státuszmegadás',
                  submittedAt: null,
                  status: 'elbirálva',
                  megadott_statusz: payload.megadott_statusz,
                  dontes_datum: now
                }
                state.kerelmek.push(record)
              }
              setSharedState(state)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, kerelem: record }))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    kgyApiPlugin(),
    statuszujitasApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'pwa-icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png'
      ],
      manifest: {
        name: 'Animátor Adminisztráció',
        short_name: 'Animátorok',
        description: 'Animátor adminisztrációs és jelenléti rendszer',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})

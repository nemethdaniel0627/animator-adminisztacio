/**
 * Backend REST API Bridge for Live MySQL (anim_uj Database)
 * Secure intermediary between React frontend and MySQL/MariaDB server.
 */

import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve, isAbsolute } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json())

// Approved 7 Event Types per Design Specification
const VALID_EVENT_TYPES = [
  'egyetemi rendezvény',
  'nagyrendezvény',
  'egyéb',
  'státuszújítás',
  'tisztújítás',
  'közgyűlés',
  'tréning'
]

// SSL / TLS Certificate handling (e.g. for TiDB Cloud or Aiven)
let sslConfig = null
const rawCaPath = process.env.DB_SSL_CA || (fs.existsSync(join(__dirname, 'certs/isrgrootx1.pem')) ? 'certs/isrgrootx1.pem' : null)
if (rawCaPath) {
  const resolvedCa = isAbsolute(rawCaPath) ? rawCaPath : resolve(__dirname, rawCaPath)
  if (fs.existsSync(resolvedCa)) {
    sslConfig = {
      ca: fs.readFileSync(resolvedCa),
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  }
} else if (process.env.DB_SSL === 'true') {
  sslConfig = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
}

// MySQL Connection Pool Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'anim_uj',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...(sslConfig ? { ssl: sslConfig } : {})
}

let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// --------------------------------------------------------------------------
// Health & Diagnostic Endpoint
// --------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const connection = await getPool().getConnection()
    await connection.ping()
    connection.release()
    res.json({
      status: 'ok',
      database: 'connected',
      dbName: dbConfig.database,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
      help: 'Ensure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME are configured in server/.env'
    })
  }
})

// --------------------------------------------------------------------------
// GET /api/permissions/:animator_ID - Check admin rights based on pozicio table
// Rule: Animator has admin rights IF they have a row in 'pozicio' linked to the latest 'tisztújítás' event.
// --------------------------------------------------------------------------
app.get('/api/permissions/:animator_ID', async (req, res) => {
  const animatorId = Number(req.params.animator_ID)
  if (isNaN(animatorId) || animatorId <= 0) {
    return res.status(400).json({ message: 'Érvénytelen animátor azonosító.' })
  }

  try {
    // 1. Find latest event of type 'tisztújítás'
    const [latestEvents] = await getPool().execute(`
      SELECT esemeny_ID, cim, DATE_FORMAT(datum, '%Y-%m-%d') AS datum
      FROM esemeny
      WHERE LOWER(tipus) = 'tisztújítás' OR LOWER(tipus) = 'tisztujitas'
      ORDER BY datum DESC, esemeny_ID DESC
      LIMIT 1
    `)

    if (latestEvents.length === 0) {
      return res.json({
        animator_ID: animatorId,
        isAdmin: false,
        pozicio: null,
        latestTisztujitas: null
      })
    }

    const latestEvent = latestEvents[0]

    // 2. Check if animator has a row in pozicio for this latest event
    const [positions] = await getPool().execute(`
      SELECT pozicio_ID, animator_ID, esemeny_ID, pozicio
      FROM pozicio
      WHERE animator_ID = ? AND esemeny_ID = ?
      LIMIT 1
    `, [animatorId, latestEvent.esemeny_ID])

    const hasPosition = positions.length > 0

    res.json({
      animator_ID: animatorId,
      isAdmin: hasPosition,
      pozicio: hasPosition ? positions[0].pozicio : null,
      latestTisztujitas: {
        esemeny_ID: Number(latestEvent.esemeny_ID),
        cim: latestEvent.cim,
        datum: latestEvent.datum
      }
    })
  } catch (err) {
    console.error('Error checking permissions:', err)
    res.status(500).json({ message: 'Hiba a jogosultság ellenőrzésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 1. GET /api/events - List events with attendee counts
// --------------------------------------------------------------------------
app.get('/api/events', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.esemeny_ID, 
        e.cim, 
        DATE_FORMAT(e.datum, '%Y-%m-%d %H:%i:%s') AS datum, 
        e.tipus,
        COUNT(j.jelenlet_ID) AS attendeeCount
      FROM esemeny e
      LEFT JOIN jelenlet j ON e.esemeny_ID = j.esemeny_ID
      GROUP BY e.esemeny_ID, e.cim, e.datum, e.tipus
      ORDER BY e.datum DESC, e.esemeny_ID DESC
    `
    const [rows] = await getPool().query(query)
    res.json(rows)
  } catch (err) {
    console.error('Error fetching events:', err)
    res.status(500).json({ message: 'Hiba történt az események lekérdezésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 2. GET /api/events/next-id - Preview upcoming sequential event ID
// --------------------------------------------------------------------------
app.get('/api/events/next-id', async (req, res) => {
  try {
    const query = `SELECT COALESCE(MAX(esemeny_ID), 0) + 1 AS next_esemeny_ID FROM esemeny`
    const [rows] = await getPool().query(query)
    res.json({ next_esemeny_ID: Number(rows[0]?.next_esemeny_ID) || 1 })
  } catch (err) {
    console.error('Error fetching next event ID:', err)
    res.status(500).json({ message: 'Hiba a következő esemény ID lekérésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 3. POST /api/events - Create new event
// --------------------------------------------------------------------------
app.post('/api/events', async (req, res) => {
  const { cim, datum, tipus } = req.body || {}

  if (!cim || typeof cim !== 'string' || !cim.trim()) {
    return res.status(400).json({ message: 'Az esemény neve (cim) kötelező.' })
  }
  if (!datum || isNaN(Date.parse(datum))) {
    return res.status(400).json({ message: 'Érvényes dátum (datum) megadása kötelező.' })
  }
  if (!tipus || !VALID_EVENT_TYPES.includes(tipus.trim())) {
    return res.status(400).json({
      message: `Érvénytelen eseménytípus. Válasszon a jóváhagyott 7 típus közül: ${VALID_EVENT_TYPES.join(', ')}`
    })
  }

  try {
    const query = `INSERT INTO esemeny (cim, datum, tipus) VALUES (?, ?, ?)`
    const [result] = await getPool().execute(query, [cim.trim(), datum.trim(), tipus.trim()])

    res.status(201).json({
      esemeny_ID: result.insertId,
      message: 'Esemény sikeresen létrehozva.'
    })
  } catch (err) {
    console.error('Error creating event:', err)
    res.status(500).json({ message: 'Hiba az esemény mentésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 3.1 POST /api/tisztujitas - Create Tisztújítás event and assign leadership positions
// --------------------------------------------------------------------------
app.post('/api/tisztujitas', async (req, res) => {
  const { cim, datum, poziciok } = req.body || {}
  const cleanCim = (cim || '').trim() || 'Tisztújítás'
  const cleanDatum = (datum || '').trim()

  if (!cleanDatum || isNaN(Date.parse(cleanDatum))) {
    return res.status(400).json({ message: 'Érvényes dátum megadása kötelező.' })
  }

  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()

    // 1. Get next event ID
    const [idRows] = await connection.execute('SELECT COALESCE(MAX(esemeny_ID), 0) + 1 AS next_id FROM esemeny')
    const nextEventId = idRows[0].next_id

    // 2. Insert event
    await connection.execute(
      'INSERT INTO esemeny (esemeny_ID, cim, datum, tipus) VALUES (?, ?, ?, ?)',
      [nextEventId, cleanCim, cleanDatum, 'tisztújítás']
    )

    // 3. Insert positions
    if (Array.isArray(poziciok) && poziciok.length > 0) {
      const [posIdRows] = await connection.execute('SELECT COALESCE(MAX(pozicio_ID), 0) + 1 AS next_pos_id FROM pozicio')
      let nextPosId = posIdRows[0].next_pos_id

      for (const p of poziciok) {
        const animId = Number(p.animator_ID)
        const posTitle = String(p.pozicio || '').trim()
        if (animId > 0 && posTitle) {
          await connection.execute(
            'INSERT INTO pozicio (pozicio_ID, animator_ID, esemeny_ID, pozicio) VALUES (?, ?, ?, ?)',
            [nextPosId++, animId, nextEventId, posTitle]
          )
        }
      }
    }

    await connection.commit()

    res.status(201).json({
      success: true,
      esemeny_ID: nextEventId,
      event: {
        esemeny_ID: nextEventId,
        cim: cleanCim,
        datum: cleanDatum,
        tipus: 'tisztújítás',
        attendeeCount: 0
      },
      message: 'Tisztújítás és a pozíciók sikeresen létrehozva.'
    })
  } catch (err) {
    await connection.rollback()
    console.error('Error creating tisztujitas:', err)
    res.status(500).json({ message: 'Hiba a tisztújítás mentésekor.', error: err.message })
  } finally {
    connection.release()
  }
})

// --------------------------------------------------------------------------
// 3.2 GET /api/events/:id/positions - Get positions assigned at an event
// --------------------------------------------------------------------------
app.get('/api/events/:id/positions', async (req, res) => {
  const eventId = Number(req.params.id)
  try {
    const query = `
      SELECT p.pozicio_ID, p.animator_ID, p.esemeny_ID, p.pozicio, a.nev AS animator_nev
      FROM pozicio p
      LEFT JOIN animator a ON p.animator_ID = a.animator_ID
      WHERE p.esemeny_ID = ?
      ORDER BY p.pozicio_ID ASC
    `
    const [rows] = await getPool().execute(query, [eventId])
    res.json(rows)
  } catch (err) {
    console.error('Error fetching event positions:', err)
    res.status(500).json({ message: 'Hiba a pozíciók lekérésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 3.3 GET /api/positions - Get all leadership positions
// --------------------------------------------------------------------------
app.get('/api/positions', async (req, res) => {
  try {
    const query = `
      SELECT p.pozicio_ID, p.animator_ID, p.esemeny_ID, p.pozicio, a.nev AS animator_nev
      FROM pozicio p
      LEFT JOIN animator a ON p.animator_ID = a.animator_ID
      ORDER BY p.pozicio_ID ASC
    `
    const [rows] = await getPool().query(query)
    res.json(rows)
  } catch (err) {
    console.error('Error fetching all positions:', err)
    res.status(500).json({ message: 'Hiba a pozíciók lekérésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 4. GET /api/animators - Animator directory
// --------------------------------------------------------------------------
app.get('/api/animators', async (req, res) => {
  try {
    const query = `
      SELECT animator_ID, nev, shibboleth, telefonszam, email, kategoria, statusz, password 
      FROM animator 
      ORDER BY nev ASC
    `
    const [rows] = await getPool().query(query)
    res.json(rows)
  } catch (err) {
    console.error('Error fetching animators:', err)
    res.status(500).json({ message: 'Hiba az animátorok lekérésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 4.1 GET /api/animators/:id/attendances - Attendances for specific animator
app.get('/api/animators/:id/attendances', async (req, res) => {
  const animatorId = Number(req.params.id)
  try {
    const query = `
      SELECT j.jelenlet_ID, j.esemeny_ID, j.animator_ID, e.cim, DATE_FORMAT(e.datum, '%Y-%m-%d') AS datum, e.tipus
      FROM jelenlet j
      JOIN esemeny e ON j.esemeny_ID = e.esemeny_ID
      WHERE j.animator_ID = ?
      ORDER BY e.datum DESC
    `
    const [rows] = await getPool().execute(query, [animatorId])
    res.json(rows)
  } catch (err) {
    console.error('Error fetching animator attendances:', err)
    res.status(500).json({ message: 'Hiba a jelenlétek lekérésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 5. GET /api/events/:esemeny_ID/attendances - Attendee records for event
// --------------------------------------------------------------------------
app.get('/api/events/:esemeny_ID/attendances', async (req, res) => {
  const eventId = Number(req.params.esemeny_ID)
  if (isNaN(eventId) || eventId <= 0) {
    return res.status(400).json({ message: 'Érvénytelen esemény azonosító.' })
  }

  try {
    const query = `
      SELECT 
        j.jelenlet_ID, 
        j.esemeny_ID, 
        j.animator_ID, 
        a.nev, 
        a.kategoria, 
        a.shibboleth
      FROM jelenlet j
      JOIN animator a ON j.animator_ID = a.animator_ID
      WHERE j.esemeny_ID = ?
      ORDER BY a.nev ASC
    `
    const [rows] = await getPool().execute(query, [eventId])
    res.json(rows)
  } catch (err) {
    console.error('Error fetching attendances:', err)
    res.status(500).json({ message: 'Hiba a jelenléti lista lekérésekor.', error: err.message })
  }
})

// --------------------------------------------------------------------------
// 6. POST /api/events/:esemeny_ID/attendances - Batch attendance (Transaction)
// --------------------------------------------------------------------------
app.post('/api/events/:esemeny_ID/attendances', async (req, res) => {
  const eventId = Number(req.params.esemeny_ID)
  const { animator_ids } = req.body || {}

  if (isNaN(eventId) || eventId <= 0) {
    return res.status(400).json({ message: 'Érvénytelen esemény azonosító.' })
  }
  if (!Array.isArray(animator_ids) || animator_ids.length === 0) {
    return res.status(400).json({ message: 'Legalább egy animátor azonosító megadása szükséges (animator_ids).' })
  }

  const validIds = [...new Set(animator_ids.map(Number).filter((id) => !isNaN(id) && id > 0))]
  if (validIds.length === 0) {
    return res.status(400).json({ message: 'Érvénytelen animátor azonosítók a kérésben.' })
  }

  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()

    // 1. Verify that event exists
    const [eventRows] = await connection.execute(
      `SELECT esemeny_ID FROM esemeny WHERE esemeny_ID = ?`,
      [eventId]
    )
    if (eventRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: `A megadott esemény nem található (ID: ${eventId}).` })
    }

    // 2. Check for existing attendances to prevent duplicates
    const placeholders = validIds.map(() => '?').join(',')
    const [existingRows] = await connection.query(
      `SELECT animator_ID FROM jelenlet WHERE esemeny_ID = ? AND animator_ID IN (${placeholders})`,
      [eventId, ...validIds]
    )

    if (existingRows.length > 0) {
      await connection.rollback()
      const duplicates = existingRows.map((r) => r.animator_ID).join(', ')
      return res.status(409).json({
        message: `Már rögzítve van jelenlét a következő animátor(ok)hoz ehhez az eseményhez: ${duplicates}`,
        duplicateIds: existingRows.map((r) => r.animator_ID)
      })
    }

    // 3. Batch insert using parameterized query
    const insertValues = []
    const valuePlaceholders = []
    validIds.forEach((animId) => {
      valuePlaceholders.push('(?, ?)')
      insertValues.push(animId, eventId)
    })

    const insertQuery = `INSERT INTO jelenlet (animator_ID, esemeny_ID) VALUES ${valuePlaceholders.join(', ')}`
    const [result] = await connection.execute(insertQuery, insertValues)

    await connection.commit()

    res.status(201).json({
      success: true,
      count: result.affectedRows,
      firstInsertId: result.insertId,
      message: `${result.affectedRows} animátor jelenléte sikeresen rögzítve.`
    })
  } catch (err) {
    await connection.rollback()
    console.error('Error recording batch attendance:', err)
    res.status(500).json({ message: 'Hiba a jelenlétek mentése során.', error: err.message })
  } finally {
    connection.release()
  }
})

// --------------------------------------------------------------------------
// 7. DELETE /api/attendances/:jelenlet_ID - Remove single attendance
// --------------------------------------------------------------------------
app.delete('/api/attendances/:jelenlet_ID', async (req, res) => {
  const jelenletId = Number(req.params.jelenlet_ID)
  if (isNaN(jelenletId) || jelenletId <= 0) {
    return res.status(400).json({ message: 'Érvénytelen jelenlét azonosító.' })
  }

  try {
    const [result] = await getPool().execute(
      `DELETE FROM jelenlet WHERE jelenlet_ID = ?`,
      [jelenletId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Nem található jelenléti bejegyzés a megadott ID-val.' })
    }

    res.json({ success: true, message: 'Jelenléti bejegyzés sikeresen törölve.' })
  } catch (err) {
    console.error('Error deleting attendance:', err)
    res.status(500).json({ message: 'Hiba a jelenlét törlésekor.', error: err.message })
  }
})

// Start server

// --------------------------------------------------------------------------
// Státuszújítás Endpoints
// --------------------------------------------------------------------------
let statuszujitasConfigState = {
  isActive: true,
  startDate: '2026-01-15',
  endDate: '2026-03-31',
  ev: 2026
}

let statuszujitasKerelmekState = []

function checkStatuszujitasPeriodActive(cfg) {
  if (!cfg || cfg.isActive === false) return false
  if (!cfg.startDate || !cfg.endDate) return false
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return todayStr >= cfg.startDate && todayStr <= cfg.endDate
}

app.get('/api/statuszujitas/config', (req, res) => {
  res.json({
    ...statuszujitasConfigState,
    isPeriodActive: checkStatuszujitasPeriodActive(statuszujitasConfigState)
  })
})

app.put('/api/statuszujitas/config', (req, res) => {
  statuszujitasConfigState = {
    ...statuszujitasConfigState,
    ...(req.body || {})
  }
  res.json({
    ...statuszujitasConfigState,
    isPeriodActive: checkStatuszujitasPeriodActive(statuszujitasConfigState)
  })
})

app.get('/api/statuszujitas/kerelmek', async (req, res) => {
  try {
    // If database connection available, query animators
    const [animators] = await getPool().query('SELECT * FROM animator ORDER BY nev ASC')
    res.json(animators.map(a => {
      const existing = statuszujitasKerelmekState.find(k => Number(k.animator_ID) === Number(a.animator_ID))
      return {
        animator_ID: a.animator_ID,
        nev: a.nev,
        shibboleth: a.shibboleth,
        email: a.email,
        jelenlegi_statusz: a.kategoria || a.statusz || 'aktív',
        hasSubmitted: Boolean(existing),
        igenyelt_statusz: existing?.igenyelt_statusz || null,
        submittedAt: existing?.submittedAt || null,
        indoklas: existing?.indoklas || '',
        megadott_statusz: existing?.megadott_statusz || 'Kizárás',
        dontes_datum: existing?.dontes_datum || null
      }
    }))
  } catch (err) {
    res.json(statuszujitasKerelmekState)
  }
})

app.post('/api/statuszujitas/submit', (req, res) => {
  const { animator_ID, igenyelt_statusz, indoklas } = req.body || {}
  const now = new Date().toISOString()
  const idx = statuszujitasKerelmekState.findIndex(k => Number(k.animator_ID) === Number(animator_ID))
  if (idx !== -1) {
    statuszujitasKerelmekState[idx] = {
      ...statuszujitasKerelmekState[idx],
      igenyelt_statusz,
      indoklas: (indoklas || '').trim(),
      submittedAt: now,
      status: 'fuggoben'
    }
  } else {
    statuszujitasKerelmekState.push({
      kerelem_ID: statuszujitasKerelmekState.length + 1,
      animator_ID: Number(animator_ID),
      igenyelt_statusz,
      indoklas: (indoklas || '').trim(),
      submittedAt: now,
      status: 'fuggoben',
      megadott_statusz: igenyelt_statusz
    })
  }
  res.json({ success: true, message: 'Kérelem sikeresen rögzítve.' })
})

app.post('/api/statuszujitas/decision/:id', (req, res) => {
  const animatorId = Number(req.params.id)
  const { megadott_statusz } = req.body || {}
  const idx = statuszujitasKerelmekState.findIndex(k => Number(k.animator_ID) === animatorId)
  if (idx !== -1) {
    statuszujitasKerelmekState[idx].megadott_statusz = megadott_statusz
    statuszujitasKerelmekState[idx].status = 'elbirálva'
    statuszujitasKerelmekState[idx].dontes_datum = new Date().toISOString()
  }
  res.json({ success: true, message: 'Státusz sikeresen jóváhagyva.' })
})

app.listen(PORT, () => {
  console.log(`Animator Admin API Server running on port ${PORT}`)
})

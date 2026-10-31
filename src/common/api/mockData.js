/**
 * Mock Data Store for Offline / Development Mode
 * Pre-populated with realistic animators, statuses, and timeline events from the Animátor Közösség portal.
 */

import { calculateNextEventId, createEventModel } from '../../modules/events/modell/eventModels.js'
import { calculateNextJelenletId, validateNoDuplicates, buildBatchAttendancePayload } from '../../modules/jelenlet/modell/jelenletModels.js'
import { checkAdminPermission } from '../../modules/animators/modell/animatorModels.js'
import {
  isEligibleForStatuszujitas,
  isStatuszujitasPeriodActive,
  checkStatuszRequirements,
  validateStatuszSubmission,
  STATUSZ_OPTIONS
} from '../../modules/statuszujitas/modell/statuszujitasModels.js'

const STORAGE_KEY = 'animator_admin_mock_store_v12'

const INITIAL_DATA = {
  profile: {
    nev: 'Németh Dániel',
    email: 'nem.dani0627@gmail.com',
    telefon: '+36 308-334589',
    avatarUrl: ''
  },
  stats2026: {
    nagyrendezveny: 3,
    egyetemi: 0,
    trening: '2/3',
    kozgyules: '3/4'
  },
  statsTotal: {
    nagyrendezveny: 12,
    egyetemi: 7,
    trening: 6,
    kozgyules: 12
  },
  events: [
    {
      esemeny_ID: 762,
      cim: 'Pázmány nap',
      datum: '2026-10-14',
      tipus: 'egyetemi rendezvény'
    },
    {
      esemeny_ID: 761,
      cim: 'Vezetőségi tréning',
      datum: '2026-10-13',
      tipus: 'tréning'
    },
    {
      esemeny_ID: 760,
      cim: 'Büfé tréning',
      datum: '2026-10-10',
      tipus: 'tréning'
    },
    {
      esemeny_ID: 759,
      cim: 'Közgyűlés',
      datum: '2026-09-08',
      tipus: 'közgyűlés'
    },
    {
      esemeny_ID: 758,
      cim: 'Gólyanapok',
      datum: '2026-08-28',
      tipus: 'egyetemi rendezvény'
    },
    {
      esemeny_ID: 757,
      cim: 'Gólyatábor',
      datum: '2026-07-11',
      tipus: 'nagyrendezvény'
    },
    {
      esemeny_ID: 756,
      cim: 'Közgyűlés',
      datum: '2026-05-21',
      tipus: 'közgyűlés'
    },
    {
      esemeny_ID: 755,
      cim: 'Képzés',
      datum: '2026-04-26',
      tipus: 'tréning'
    },
    {
      esemeny_ID: 754,
      cim: 'Tisztújítás 2026',
      datum: '2026-02-13',
      tipus: 'tisztújítás'
    },
    {
      esemeny_ID: 753,
      cim: 'Státuszújítás 2026',
      datum: '2026-02-12',
      tipus: 'státuszújítás',
      badgeText: '2026',
      subtitle: 'Státuszod: aktív'
    },
    {
      esemeny_ID: 752,
      cim: 'Közgyűlés',
      datum: '2025-12-17',
      tipus: 'közgyűlés'
    },
    {
      esemeny_ID: 711,
      cim: 'Tisztújító Közgyűlés',
      datum: '2025-11-13',
      tipus: 'közgyűlés'
    },
    {
      esemeny_ID: 710,
      cim: 'Tisztújítás 2025',
      datum: '2025-11-13',
      tipus: 'tisztújítás'
    }
  ],
  animators: [
    {
      animator_ID: 1001,
      nev: 'Németh Dániel',
      shibboleth: 'nemda',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'nem.dani@gmail.com',
      telefonszam: '+36 308-334589',
      password: 'DaniTest1234'
    },
    {
      animator_ID: 883,
      nev: 'Bolla Péter',
      shibboleth: 'bolpe',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'bolla.peter@animator.hu',
      telefonszam: '+36 30 123 4567',
      password: 'test1234'
    },
    {
      animator_ID: 963,
      nev: 'Széwald Péter Tamás',
      shibboleth: 'szepe',
      kategoria: 'junior',
      statusz: 'aktív',
      email: 'szewald.peter@animator.hu',
      telefonszam: '+36 30 234 5678',
      password: 'test1234'
    },
    {
      animator_ID: 745,
      nev: 'Kovács Anna',
      shibboleth: 'kovan',
      kategoria: 'jelölt',
      statusz: 'aktív',
      email: 'kovacs.anna@animator.hu',
      telefonszam: '+36 30 345 6789',
      password: 'test1234'
    },
    {
      animator_ID: 812,
      nev: 'Nagy Bence',
      shibboleth: 'nagbe',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'nagy.bence@animator.hu',
      telefonszam: '+36 30 456 7890',
      password: 'test1234'
    },
    {
      animator_ID: 904,
      nev: 'Tóth Zsófia',
      shibboleth: 'totzs',
      kategoria: 'junior',
      statusz: 'aktív',
      email: 'toth.zsofia@animator.hu',
      telefonszam: '+36 30 567 8901',
      password: 'test1234'
    },
    {
      animator_ID: 670,
      nev: 'Balogh Márton',
      shibboleth: 'balma',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'balogh.marton@animator.hu',
      telefonszam: '+36 30 678 9012',
      password: 'test1234'
    },
    {
      animator_ID: 720,
      nev: 'Horváth Eszter',
      shibboleth: 'hores',
      kategoria: 'junior',
      statusz: 'aktív',
      email: 'horvath.eszter@animator.hu',
      telefonszam: '+36 30 789 0123',
      password: 'test1234'
    },
    {
      animator_ID: 915,
      nev: 'Kiss István',
      shibboleth: 'kisis',
      kategoria: 'junior',
      statusz: 'aktív',
      email: 'kiss.istvan@animator.hu',
      telefonszam: '+36 30 890 1234',
      password: 'test1234'
    },
    {
      animator_ID: 928,
      nev: 'Varga Máté',
      shibboleth: 'varma',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'varga.mate@animator.hu',
      telefonszam: '+36 30 901 2345',
      password: 'test1234'
    },
    {
      animator_ID: 1010,
      nev: 'Szabó Vivien Barbara',
      shibboleth: 'szavi',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'szabo.vivien@animator.hu',
      telefonszam: '+36 30 111 2233',
      password: 'test1234'
    },
    {
      animator_ID: 1011,
      nev: 'Kellermann Kinga',
      shibboleth: 'kelki',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'kellermann.kinga@animator.hu',
      telefonszam: '+36 30 222 3344',
      password: 'test1234'
    },
    {
      animator_ID: 1012,
      nev: 'Mészáros Kinga',
      shibboleth: 'meski',
      kategoria: 'junior',
      statusz: 'aktív',
      email: 'meszaros.kinga@animator.hu',
      telefonszam: '+36 30 333 4455',
      password: 'test1234'
    },
    {
      animator_ID: 1013,
      nev: 'Szabó József',
      shibboleth: 'szajo',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'szabo.jozsef@animator.hu',
      telefonszam: '+36 30 444 5566',
      password: 'test1234'
    },
    {
      animator_ID: 1014,
      nev: 'Trencsik Markó',
      shibboleth: 'trema',
      kategoria: 'senior',
      statusz: 'aktív',
      email: 'trencsik.marko@animator.hu',
      telefonszam: '+36 30 555 6677',
      password: 'test1234'
    },
    {
      animator_ID: 1015,
      nev: 'Aszódi Boglárka',
      shibboleth: 'aszbo',
      kategoria: 'junior',
      statusz: 'aktív',
      email: 'aszodi.boglarka@animator.hu',
      telefonszam: '+36 30 666 7788',
      password: 'test1234'
    }
  ],
  attendances: [
    {
      jelenlet_ID: 17701,
      animator_ID: 883,
      esemeny_ID: 759 // KGY
    },
    {
      jelenlet_ID: 17702,
      animator_ID: 883,
      esemeny_ID: 756 // KGY
    },
    {
      jelenlet_ID: 17703,
      animator_ID: 883,
      esemeny_ID: 758 // Egyetemi
    },
    {
      jelenlet_ID: 17704,
      animator_ID: 883,
      esemeny_ID: 757 // Nagyrendezvény
    },
    {
      jelenlet_ID: 17705,
      animator_ID: 883,
      esemeny_ID: 761 // Tréning
    },
    {
      jelenlet_ID: 17706,
      animator_ID: 745, // Kovács Anna: 1 KGY, 1 Egyetemi, 1 Tréning (Missing 1 KGY + 1 Egyetemi/Nagy)
      esemeny_ID: 759
    },
    {
      jelenlet_ID: 17707,
      animator_ID: 745,
      esemeny_ID: 758
    },
    {
      jelenlet_ID: 17708,
      animator_ID: 745,
      esemeny_ID: 761
    },
    {
      jelenlet_ID: 17629,
      animator_ID: 1001,
      esemeny_ID: 761
    },
    {
      jelenlet_ID: 17628,
      animator_ID: 1001,
      esemeny_ID: 760
    },
    {
      jelenlet_ID: 17627,
      animator_ID: 1001,
      esemeny_ID: 759
    },
    {
      jelenlet_ID: 17626,
      animator_ID: 1001,
      esemeny_ID: 757
    }
  ],

  statuszujitasConfig: {
    isActive: true,
    startDate: '2026-10-30',
    endDate: '2026-11-02',
    ev: 2026
  },
  statuszujitasKerelmek: [
    {
      kerelem_ID: 1,
      animator_ID: 883, // Bolla Péter - passed all checks
      igenyelt_statusz: 'Aktív',
      submittedAt: '2026-02-01 14:22:00',
      status: 'fuggoben',
      indoklas: 'Minden feltételt sikeresen teljesítettem, szeretném folytatni az aktív animátori munkát.',
      megadott_statusz: 'Aktív',
      dontes_datum: null
    },
    {
      kerelem_ID: 2,
      animator_ID: 745, // Kovács Anna - missing 1 KGY
      igenyelt_statusz: 'Aktív',
      submittedAt: '2026-02-05 18:40:00',
      status: 'fuggoben',
      indoklas: 'Az őszi közgyűlés idején külföldi tanulmányi versenyen voltam, ezért nem tudtam jelen lenni. A tavaszi félévben vállalok plusz feladatokat a pótlásra.',
      megadott_statusz: 'Aktív',
      dontes_datum: null
    }
  ],
  pozicio: [
    {
      pozicio_ID: 1,
      animator_ID: 1001, // Németh Dániel -> Elnök (has row for latest tisztújítás: 754 -> Admin = true)
      esemeny_ID: 754,
      pozicio: 'Elnök'
    },
    {
      pozicio_ID: 3,
      animator_ID: 670, // Balogh Márton (öregdiák) -> position was for older 2025 event (710), NOT the latest -> Admin = false
      esemeny_ID: 710,
      pozicio: 'Volt Elnök'
    },
    {
      pozicio_ID: 4,
      animator_ID: 1001, // Németh Dániel -> Elnök in Tisztújítás 2025 (matching screenshot)
      esemeny_ID: 710,
      pozicio: 'Elnök'
    }
  ]
}

function loadStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (!parsed.pozicio || !Array.isArray(parsed.pozicio)) {
          parsed.pozicio = JSON.parse(JSON.stringify(INITIAL_DATA.pozicio))
        }
        if (!parsed.statuszujitasConfig) {
          parsed.statuszujitasConfig = JSON.parse(JSON.stringify(INITIAL_DATA.statuszujitasConfig))
        }
        if (!parsed.statuszujitasKerelmek || !Array.isArray(parsed.statuszujitasKerelmek)) {
          parsed.statuszujitasKerelmek = JSON.parse(JSON.stringify(INITIAL_DATA.statuszujitasKerelmek))
        }

        // Ensure every user except Németh Dániel is a basic aktív user with password test1234
        if (Array.isArray(parsed.animators)) {
          parsed.animators = parsed.animators.map((a) => {
            if (a.animator_ID === 1001 || a.nev === 'Németh Dániel' || a.shibboleth === 'nemda') {
              return {
                ...a,
                statusz: 'aktív',
                password: 'DaniTest1234'
              }
            }
            return {
              ...a,
              statusz: 'aktív',
              kategoria: a.kategoria === 'vén' || a.kategoria === 'veterán' ? 'senior' : (a.kategoria || 'junior'),
              password: 'test1234'
            }
          })
        }

        // Ensure only Németh Dániel holds an admin position in the latest event
        parsed.pozicio = JSON.parse(JSON.stringify(INITIAL_DATA.pozicio))
        return parsed
      }
    } catch {
      // fallback to initial data
    }
  }
  return JSON.parse(JSON.stringify(INITIAL_DATA))
}

let store = loadStore()

function persistStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      // silent
    }
  }
}

export const mockStore = {
  reset() {
    store = JSON.parse(JSON.stringify(INITIAL_DATA))
    persistStore()
  },

  getProfile() {
    return { ...store.profile }
  },

  updateProfile(profileData) {
    store.profile = { ...store.profile, ...profileData }
    // Also update Németh Dániel in animators list
    const userIndex = store.animators.findIndex((a) => a.animator_ID === 1001)
    if (userIndex !== -1) {
      if (profileData.nev) store.animators[userIndex].nev = profileData.nev
      if (profileData.email) store.animators[userIndex].email = profileData.email
      if (profileData.telefon) store.animators[userIndex].telefonszam = profileData.telefon
    }
    persistStore()
    return { ...store.profile }
  },

  getStats() {
    return {
      stats2026: { ...store.stats2026 },
      statsTotal: { ...store.statsTotal }
    }
  },

  getEvents() {
    return store.events.map((ev) => {
      const attendeeCount = store.attendances.filter((att) => att.esemeny_ID === ev.esemeny_ID).length
      return {
        ...ev,
        attendeeCount
      }
    })
  },

  getNextEventId() {
    return calculateNextEventId(store.events)
  },

  createEvent(eventData) {
    const validated = createEventModel(eventData)
    if (!validated.isValid) {
      throw new Error(Object.values(validated.errors)[0] || 'Érvénytelen esemény adatok')
    }

    const nextId = calculateNextEventId(store.events)
    const newEvent = {
      ...validated.value,
      esemeny_ID: nextId
    }

    store.events.unshift(newEvent)
    persistStore()

    return {
      esemeny_ID: nextId,
      event: newEvent,
      message: 'Esemény sikeresen mentve.'
    }
  },

  updateEvent(eventId, eventData) {
    const id = Number(eventId)
    const index = store.events.findIndex((e) => e.esemeny_ID === id)
    if (index === -1) {
      throw new Error(`Nem található esemény az azonosítóval: #${id}`)
    }

    const validated = createEventModel({ ...eventData, esemeny_ID: id })
    if (!validated.isValid) {
      throw new Error(Object.values(validated.errors)[0] || 'Érvénytelen esemény adatok')
    }

    const existing = store.events[index]
    const updatedEvent = {
      ...existing,
      cim: validated.value.cim,
      datum: validated.value.datum,
      tipus: validated.value.tipus
    }

    store.events[index] = updatedEvent
    persistStore()

    const attendeeCount = store.attendances.filter((att) => att.esemeny_ID === id).length

    return {
      esemeny_ID: id,
      event: {
        ...updatedEvent,
        attendeeCount
      },
      message: 'Esemény sikeresen módosítva.'
    }
  },

  getAnimators() {
    return [...store.animators]
  },

  getAttendancesByAnimator(animatorId) {
    const id = Number(animatorId)
    const records = store.attendances.filter((a) => a.animator_ID === id)
    return records.map((att) => {
      const event = store.events.find((e) => e.esemeny_ID === att.esemeny_ID) || {}
      return {
        ...att,
        cim: event.cim || '',
        datum: event.datum || '',
        tipus: event.tipus || ''
      }
    })
  },

  getAttendancesByEvent(eventId) {
    const numericEventId = Number(eventId)
    const records = store.attendances.filter((a) => a.esemeny_ID === numericEventId)

    return records.map((att) => {
      const animator = store.animators.find((a) => a.animator_ID === att.animator_ID) || {}
      return {
        ...att,
        nev: animator.nev || `Animátor #${att.animator_ID}`,
        kategoria: animator.kategoria || '',
        statusz: animator.statusz || 'aktív',
        shibboleth: animator.shibboleth || ''
      }
    })
  },

  saveBatchAttendance(eventId, animatorIds) {
    const numericEventId = Number(eventId)
    const existing = store.attendances.filter((a) => a.esemeny_ID === numericEventId)

    const check = validateNoDuplicates(existing, animatorIds)
    if (!check.isValid) {
      throw new Error(`Már rögzített animátor található a kijelölésben (ID: ${check.duplicateIds.join(', ')})`)
    }

    const nextJelenletId = calculateNextJelenletId(store.attendances)
    const newRecords = buildBatchAttendancePayload(numericEventId, check.uniqueNewIds, nextJelenletId)

    store.attendances.push(...newRecords)
    persistStore()

    return {
      success: true,
      count: newRecords.length,
      createdJelenletIds: newRecords.map((r) => r.jelenlet_ID),
      attendances: this.getAttendancesByEvent(numericEventId)
    }
  },

  deleteAttendance(jelenletId) {
    const id = Number(jelenletId)
    const index = store.attendances.findIndex((a) => a.jelenlet_ID === id)
    if (index !== -1) {
      store.attendances.splice(index, 1)
      persistStore()
      return { success: true }
    }
    return { success: false, message: 'Nem található jelenléti bejegyzés.' }
  },

  getPoziciok() {
    return [...(store.pozicio || [])]
  },

  getPoziciokByEvent(eventId) {
    const numericId = Number(eventId)
    return (store.pozicio || [])
      .filter((p) => Number(p.esemeny_ID) === numericId)
      .map((p) => {
        const anim = (store.animators || []).find((a) => a.animator_ID === p.animator_ID)
        return {
          ...p,
          animator_nev: anim?.nev || `Animátor #${p.animator_ID}`
        }
      })
  },

  createTisztujitas({ cim, datum, poziciok = [] }) {
    // 1. Create the event
    const eventRes = this.createEvent({
      cim: cim || `Tisztújítás ${new Date().getFullYear()}`,
      datum: datum || new Date().toISOString().split('T')[0],
      tipus: 'tisztújítás'
    })

    const esemenyId = eventRes.esemeny_ID

    // 2. Add pozicio records
    if (!store.pozicio) store.pozicio = []
    let nextPozicioId = store.pozicio.reduce((max, p) => Math.max(max, Number(p.pozicio_ID) || 0), 0) + 1

    const newPoziciok = (poziciok || [])
      .map((p) => ({
        pozicio_ID: nextPozicioId++,
        animator_ID: Number(p.animator_ID),
        esemeny_ID: esemenyId,
        pozicio: String(p.pozicio || '').trim()
      }))
      .filter((p) => p.animator_ID > 0 && p.pozicio.length > 0)

    store.pozicio.push(...newPoziciok)
    persistStore()

    return {
      success: true,
      esemeny_ID: esemenyId,
      event: eventRes.event,
      poziciok: newPoziciok,
      message: 'Tisztújítás és a pozíciók sikeresen rögzítve.'
    }
  },


  // --------------------------------------------------------------------------
  // Státuszújítás Management
  // --------------------------------------------------------------------------
  syncStatuszujitasConfig(newConfig = {}) {
    if (!newConfig || typeof newConfig !== 'object') return this.getStatuszujitasConfig()
    const current = store.statuszujitasConfig || INITIAL_DATA.statuszujitasConfig
    const hasChanged =
      current.isActive !== newConfig.isActive ||
      current.startDate !== newConfig.startDate ||
      current.endDate !== newConfig.endDate ||
      current.ev !== newConfig.ev

    if (hasChanged) {
      store.statuszujitasConfig = {
        ...current,
        ...newConfig
      }
      persistStore()
    }
    return this.getStatuszujitasConfig()
  },

  syncStatuszujitasKerelmek(kerelmek = []) {
    if (!Array.isArray(kerelmek)) return this.getStatuszujitasKerelmek()
    const current = store.statuszujitasKerelmek || []
    if (JSON.stringify(current) !== JSON.stringify(kerelmek)) {
      store.statuszujitasKerelmek = [...kerelmek]
      persistStore()
    }
    return this.getStatuszujitasKerelmek()
  },

  getStatuszujitasConfig() {
    const conf = { ...(store.statuszujitasConfig || INITIAL_DATA.statuszujitasConfig) }
    return {
      ...conf,
      isPeriodActive: isStatuszujitasPeriodActive(conf)
    }
  },

  updateStatuszujitasConfig(newConfig = {}) {
    if (!store.statuszujitasConfig) {
      store.statuszujitasConfig = { ...INITIAL_DATA.statuszujitasConfig }
    }
    store.statuszujitasConfig = {
      ...store.statuszujitasConfig,
      ...newConfig
    }
    persistStore()
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        window.dispatchEvent(
          new CustomEvent('statuszujitas_config_change', { detail: store.statuszujitasConfig })
        )
      } catch {
        // silent
      }
    }
    return this.getStatuszujitasConfig()
  },

  getStatuszujitasKerelmek() {
    if (!store.statuszujitasKerelmek) {
      store.statuszujitasKerelmek = []
    }

    // Eligible users: aktív, ifjú, passzív
    const eligibleAnimators = (store.animators || []).filter((a) =>
      isEligibleForStatuszujitas(a.statusz)
    )

    return eligibleAnimators.map((animator) => {
      const atts = this.getAttendancesByAnimator(animator.animator_ID)
      const evaluation = checkStatuszRequirements(atts)
      const req = (store.statuszujitasKerelmek || []).find(
        (k) => Number(k.animator_ID) === Number(animator.animator_ID)
      )

      return {
        animator_ID: animator.animator_ID,
        nev: animator.nev,
        shibboleth: animator.shibboleth,
        email: animator.email,
        jelenlegi_statusz: animator.statusz,
        kategoria: animator.kategoria,
        hasSubmitted: Boolean(req),
        kerelem_ID: req?.kerelem_ID || null,
        igenyelt_statusz: req?.igenyelt_statusz || null, // null renders "Nem igényelt státuszt"
        submittedAt: req?.submittedAt || null,
        status: req?.status || 'nem_igenyelt', // 'nem_igenyelt' | 'fuggoben' | 'elbirálva'
        indoklas: req?.indoklas || '',
        megadott_statusz: req?.megadott_statusz || animator.statusz || 'Aktív',
        dontes_datum: req?.dontes_datum || null,
        evaluation
      }
    })
  },

  getStatuszujitasUserProgress(animatorId) {
    const numericId = Number(animatorId)
    const animator = (store.animators || []).find((a) => a.animator_ID === numericId)
    if (!animator) {
      throw new Error(`Animátor nem található: #${numericId}`)
    }

    const atts = this.getAttendancesByAnimator(numericId)
    const evaluation = checkStatuszRequirements(atts)
    const req = (store.statuszujitasKerelmek || []).find(
      (k) => Number(k.animator_ID) === numericId
    )
    const config = this.getStatuszujitasConfig()

    return {
      config,
      animator,
      isEligible: isEligibleForStatuszujitas(animator.statusz),
      evaluation,
      request: req || null
    }
  },

  submitStatuszujitasKerelem({ animator_ID, igenyelt_statusz, indoklas = '' }) {
    const numericId = Number(animator_ID)
    const animator = (store.animators || []).find((a) => a.animator_ID === numericId)
    if (!animator) {
      throw new Error(`Animátor nem található: #${numericId}`)
    }

    if (!isEligibleForStatuszujitas(animator.statusz)) {
      throw new Error('Csak aktív, ifjú és passzív tagok nyújthatnak be státuszújítási kérelmet.')
    }

    const atts = this.getAttendancesByAnimator(numericId)
    const evaluation = checkStatuszRequirements(atts)

    const validation = validateStatuszSubmission({
      passed: evaluation.passed,
      igenyeltStatusz: igenyelt_statusz,
      indoklas
    })

    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0]
      throw new Error(firstErr || 'Érvénytelen kérelem adatok.')
    }

    if (!store.statuszujitasKerelmek) {
      store.statuszujitasKerelmek = []
    }

    const existingIndex = store.statuszujitasKerelmek.findIndex(
      (k) => Number(k.animator_ID) === numericId
    )

    let record
    const now = new Date().toISOString()

    if (existingIndex !== -1) {
      store.statuszujitasKerelmek[existingIndex] = {
        ...store.statuszujitasKerelmek[existingIndex],
        igenyelt_statusz,
        indoklas: indoklas.trim(),
        submittedAt: now,
        status: 'fuggoben'
      }
      record = store.statuszujitasKerelmek[existingIndex]
    } else {
      const nextId = store.statuszujitasKerelmek.reduce((max, k) => Math.max(max, Number(k.kerelem_ID) || 0), 0) + 1
      record = {
        kerelem_ID: nextId,
        animator_ID: numericId,
        igenyelt_statusz,
        indoklas: indoklas.trim(),
        submittedAt: now,
        status: 'fuggoben',
        megadott_statusz: igenyelt_statusz,
        dontes_datum: null
      }
      store.statuszujitasKerelmek.push(record)
    }

    persistStore()
    return {
      success: true,
      kerelem: record,
      evaluation,
      message: 'Státuszújítási kérelem sikeresen beküldve!'
    }
  },

  decideStatuszujitasKerelem(animator_ID, { megadott_statusz }) {
    const numericId = Number(animator_ID)
    const animatorIndex = (store.animators || []).findIndex((a) => a.animator_ID === numericId)
    if (animatorIndex === -1) {
      throw new Error(`Animátor nem található: #${numericId}`)
    }

    const validChoice = STATUSZ_OPTIONS.find((s) => s.toLowerCase() === (megadott_statusz || '').toLowerCase())
    if (!validChoice) {
      throw new Error(`Érvénytelen választott státusz: ${megadott_statusz}`)
    }

    // 1. Update animator record
    store.animators[animatorIndex].statusz = validChoice.toLowerCase()

    // 2. Update request record
    if (!store.statuszujitasKerelmek) {
      store.statuszujitasKerelmek = []
    }
    const reqIndex = store.statuszujitasKerelmek.findIndex((k) => Number(k.animator_ID) === numericId)
    const now = new Date().toISOString()

    let reqRecord
    if (reqIndex !== -1) {
      store.statuszujitasKerelmek[reqIndex] = {
        ...store.statuszujitasKerelmek[reqIndex],
        megadott_statusz: validChoice,
        status: 'elbirálva',
        dontes_datum: now
      }
      reqRecord = store.statuszujitasKerelmek[reqIndex]
    } else {
      const nextId = store.statuszujitasKerelmek.reduce((max, k) => Math.max(max, Number(k.kerelem_ID) || 0), 0) + 1
      reqRecord = {
        kerelem_ID: nextId,
        animator_ID: numericId,
        igenyelt_statusz: null,
        indoklas: 'Adminisztrátori közvetlen státuszmegadás',
        submittedAt: null,
        status: 'elbirálva',
        megadott_statusz: validChoice,
        dontes_datum: now
      }
      store.statuszujitasKerelmek.push(reqRecord)
    }

    persistStore()
    return {
      success: true,
      animator: store.animators[animatorIndex],
      kerelem: reqRecord,
      message: `Státusz sikeresen beállítva: ${validChoice}`
    }
  },

  checkAdminPermission(animatorId) {
    return checkAdminPermission(animatorId, store.pozicio || [], store.events || [])
  }
}

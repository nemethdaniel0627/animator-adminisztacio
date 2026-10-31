import assert from 'node:assert'
import { checkAdminPermission } from '../src/modules/animators/modell/animatorModels.js'
import { mockStore } from '../src/common/api/mockData.js'

console.log('🧪 Starting Permission System Verification Script...\n')

// Test Data
const mockEvents = [
  { esemeny_ID: 762, cim: 'Pázmány nap', datum: '2026-10-14', tipus: 'egyetemi rendezvény' },
  { esemeny_ID: 754, cim: 'Tisztújítás 2026', datum: '2026-02-13', tipus: 'tisztújítás' },
  { esemeny_ID: 752, cim: 'Közgyűlés', datum: '2025-12-17', tipus: 'közgyűlés' },
  { esemeny_ID: 710, cim: 'Tisztújítás 2025', datum: '2025-02-14', tipus: 'tisztújítás' }
]

const mockPoziciok = [
  { pozicio_ID: 1, animator_ID: 1001, esemeny_ID: 754, pozicio: 'Elnök' },
  { pozicio_ID: 2, animator_ID: 883, esemeny_ID: 754, pozicio: 'Gazdasági felelős' },
  { pozicio_ID: 3, animator_ID: 670, esemeny_ID: 710, pozicio: 'Volt Elnök' }
]

// -----------------------------------------------------------------------------
// Test Case 1: Animator in latest tisztújítás has admin rights
// -----------------------------------------------------------------------------
console.log('Test 1: Animator with role in latest tisztújítás gets admin rights')
const result1001 = checkAdminPermission(1001, mockPoziciok, mockEvents)
assert.strictEqual(result1001.isAdmin, true, 'Animator 1001 should be admin')
assert.strictEqual(result1001.pozicio, 'Elnök')
assert.strictEqual(result1001.latestTisztujitas.esemeny_ID, 754)
console.log('  ✅ Németh Dániel (1001): isAdmin=true, pozicio="Elnök", event=754')

const result883 = checkAdminPermission(883, mockPoziciok, mockEvents)
assert.strictEqual(result883.isAdmin, true, 'Animator 883 should be admin')
assert.strictEqual(result883.pozicio, 'Gazdasági felelős')
assert.strictEqual(result883.latestTisztujitas.esemeny_ID, 754)
console.log('  ✅ Bolla Péter (883): isAdmin=true, pozicio="Gazdasági felelős", event=754')

// -----------------------------------------------------------------------------
// Test Case 2: Animator with position in OLDER tisztújítás does NOT have admin rights
// -----------------------------------------------------------------------------
console.log('\nTest 2: Animator with position in OLDER tisztújítás does NOT retain admin rights')
const result670 = checkAdminPermission(670, mockPoziciok, mockEvents)
assert.strictEqual(result670.isAdmin, false, 'Animator 670 should NOT be admin for newer term')
assert.strictEqual(result670.pozicio, null)
assert.strictEqual(result670.latestTisztujitas.esemeny_ID, 754)
console.log('  ✅ Balogh Márton (670): isAdmin=false (older position from event 710 ignored)')

// -----------------------------------------------------------------------------
// Test Case 3: Animator without any position record
// -----------------------------------------------------------------------------
console.log('\nTest 3: Animator without position has no admin rights')
const result745 = checkAdminPermission(745, mockPoziciok, mockEvents)
assert.strictEqual(result745.isAdmin, false)
assert.strictEqual(result745.pozicio, null)
console.log('  ✅ Kovács Anna (745): isAdmin=false')

// -----------------------------------------------------------------------------
// Test Case 4: Accent insensitivity ('tisztújítás' vs 'tisztujitas')
// -----------------------------------------------------------------------------
console.log('\nTest 4: Accent normalization (tisztujitas vs tisztújítás)')
const unaccentedEvents = [
  { esemeny_ID: 800, cim: 'Tisztujitas 2027', datum: '2027-02-10', tipus: 'tisztujitas' }
]
const newPositions = [
  { pozicio_ID: 10, animator_ID: 745, esemeny_ID: 800, pozicio: 'Új Elnök' }
]
const resultUnaccented = checkAdminPermission(745, newPositions, unaccentedEvents)
assert.strictEqual(resultUnaccented.isAdmin, true)
assert.strictEqual(resultUnaccented.pozicio, 'Új Elnök')
assert.strictEqual(resultUnaccented.latestTisztujitas.esemeny_ID, 800)
console.log('  ✅ Unaccented tipus="tisztujitas" correctly recognized and grants admin rights')

// -----------------------------------------------------------------------------
// Test Case 5: mockStore parity
// -----------------------------------------------------------------------------
console.log('\nTest 5: mockStore checkAdminPermission test')
const mockStoreResult = mockStore.checkAdminPermission(1001)
assert.strictEqual(mockStoreResult.isAdmin, true)
assert.strictEqual(mockStoreResult.pozicio, 'Elnök')
console.log('  ✅ mockStore checkAdminPermission(1001) passed')

const mockStoreResultNonAdmin = mockStore.checkAdminPermission(745)
assert.strictEqual(mockStoreResultNonAdmin.isAdmin, false)
console.log('  ✅ mockStore checkAdminPermission(745) passed: non-admin')

console.log('\n🎉 ALL PERMISSION TESTS PASSED SUCCESSFULLY! 100% Verified.')

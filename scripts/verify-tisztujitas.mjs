import assert from 'node:assert'
import { mockStore } from '../src/common/api/mockData.js'

console.log('🧪 Starting Tisztújítás Creation & Dynamic Leadership Election Verification...\n')

// Initial state: Németh Dániel (1001) is president of event 754 (2026) -> Admin: true
const initial1001 = mockStore.checkAdminPermission(1001)
assert.strictEqual(initial1001.isAdmin, true, 'Initial state: Németh Dániel is admin for 2026 term')
console.log('  ✅ Initial state verified: Németh Dániel (1001) has admin rights for 2026 term')

// Initial state: Kovács Anna (745) is a simple tag -> Admin: false
const initial745 = mockStore.checkAdminPermission(745)
assert.strictEqual(initial745.isAdmin, false, 'Initial state: Kovács Anna is not admin')
console.log('  ✅ Initial state verified: Kovács Anna (745) is a simple tag (isAdmin=false)')

// Action: Create a new Tisztújítás (2027) where Kovács Anna is elected Elnök and Széwald Péter is Gazdasági felelős
console.log('\nCreating new Tisztújítás for 2027 with new leadership election...')
const electionResult = mockStore.createTisztujitas({
  cim: 'Tisztújítás 2027',
  datum: '2027-02-15',
  poziciok: [
    { animator_ID: 745, pozicio: 'Elnök' },
    { animator_ID: 963, pozicio: 'Gazdasági felelős' }
  ]
})

assert.strictEqual(electionResult.success, true)
assert.ok(electionResult.esemeny_ID > 0)
console.log(`  ✅ Tisztújítás successfully created with Event ID #${electionResult.esemeny_ID}`)

// Verify positions query
const savedPositions = mockStore.getPoziciokByEvent(electionResult.esemeny_ID)
assert.strictEqual(savedPositions.length, 2)
assert.strictEqual(savedPositions[0].animator_nev, 'Kovács Anna')
assert.strictEqual(savedPositions[0].pozicio, 'Elnök')
assert.strictEqual(savedPositions[1].animator_nev, 'Széwald Péter Tamás')
assert.strictEqual(savedPositions[1].pozicio, 'Gazdasági felelős')
console.log('  ✅ getPoziciokByEvent returned correctly mapped positions with animator names')

// Verify that Kovács Anna (745) now has admin rights!
const post745 = mockStore.checkAdminPermission(745)
assert.strictEqual(post745.isAdmin, true, 'Kovács Anna MUST now be admin')
assert.strictEqual(post745.pozicio, 'Elnök')
assert.strictEqual(post745.latestTisztujitas.esemeny_ID, electionResult.esemeny_ID)
console.log('  ✅ Kovács Anna (745) now has admin rights: isAdmin=true, pozicio="Elnök" (Term 2027)')

// Verify that Széwald Péter (963) now has admin rights!
const post963 = mockStore.checkAdminPermission(963)
assert.strictEqual(post963.isAdmin, true, 'Széwald Péter MUST now be admin')
assert.strictEqual(post963.pozicio, 'Gazdasági felelős')
console.log('  ✅ Széwald Péter (963) now has admin rights: isAdmin=true, pozicio="Gazdasági felelős"')

// Verify that Németh Dániel (1001) has NO admin rights anymore because his position was from 2026, and 2027 is now the latest!
const post1001 = mockStore.checkAdminPermission(1001)
assert.strictEqual(post1001.isAdmin, false, 'Németh Dániel MUST NOT be admin after new term starts')
console.log('  ✅ Previous leadership transition verified: Németh Dániel (1001) automatically stepped down (isAdmin=false)')

console.log('\n🎉 ALL TISZTÚJÍTÁS ELECTION TESTS PASSED WITH 100% SUCCESS!')

import assert from 'assert'
import {
  checkStatuszRequirements,
  isEligibleForStatuszujitas,
  isStatuszujitasPeriodActive,
  validateStatuszSubmission,
  ELIGIBLE_STATUSES,
  STATUSZ_OPTIONS
} from '../src/modules/statuszujitas/modell/statuszujitasModels.js'
import { mockStore } from '../src/common/api/mockData.js'

console.log('🧪 Starting Státuszújítás Verification Suite...\n')

// 1. Eligibility testing
console.log('1. Testing Animator Eligibility...')
assert.strictEqual(isEligibleForStatuszujitas('aktív'), true, 'Aktív should be eligible')
assert.strictEqual(isEligibleForStatuszujitas('ifjú'), true, 'Ifjú should be eligible')
assert.strictEqual(isEligibleForStatuszujitas('passzív'), true, 'Passzív should be eligible')
assert.strictEqual(isEligibleForStatuszujitas('veterán'), false, 'Veterán should not be eligible')
assert.strictEqual(isEligibleForStatuszujitas('vén'), false, 'Vén should not be eligible')
assert.strictEqual(isEligibleForStatuszujitas('inaktív'), false, 'Inaktív should not be eligible')
console.log('  ✅ Eligibility rules verified.')

// 2. Requirement calculation logic
console.log('\n2. Testing 4 Mandatory Requirements Logic...')

// Case A: 2 KGY + 1 Egyetemi + 1 Nagyrendezvény + 1 Tréning -> PASS
const attsPassA = [
  { cim: 'Közgyűlés I.', tipus: 'közgyűlés' },
  { cim: 'Közgyűlés II.', tipus: 'közgyűlés' },
  { cim: 'Pázmány nap', tipus: 'egyetemi rendezvény' },
  { cim: 'Gólyatábor', tipus: 'nagyrendezvény' },
  { cim: 'Büfé tréning', tipus: 'tréning' }
]
const resA = checkStatuszRequirements(attsPassA)
assert.strictEqual(resA.passed, true, 'Case A should pass')
assert.strictEqual(resA.kgyMet, true, 'KGY met')
assert.strictEqual(resA.egyetemiMet, true, 'Egyetemi met')
assert.strictEqual(resA.egyetemiOrNagyMet, true, 'Egyetemi or Nagy met')
assert.strictEqual(resA.treningMet, true, 'Trening met')
assert.strictEqual(resA.missing.length, 0, 'No missing requirements')
console.log('  ✅ Case A (2 KGY + 1 Egyetemi + 1 Nagy + 1 Tréning): PASSED')

// Case B: 2 KGY + 2 Egyetemi + 1 Tréning -> PASS (2 Egyetemi covers both requirements)
const attsPassB = [
  { cim: 'Közgyűlés I.', tipus: 'közgyűlés' },
  { cim: 'Közgyűlés II.', tipus: 'közgyűlés' },
  { cim: 'Pázmány nap', tipus: 'egyetemi rendezvény' },
  { cim: 'Gólyanapok', tipus: 'egyetemi rendezvény' },
  { cim: 'Képzés', tipus: 'tréning' }
]
const resB = checkStatuszRequirements(attsPassB)
assert.strictEqual(resB.passed, true, 'Case B should pass')
console.log('  ✅ Case B (2 KGY + 2 Egyetemi + 1 Tréning): PASSED')

// Case C: Missing 1 KGY and missing additional Egyetemi/Nagy
const attsFailC = [
  { cim: 'Közgyűlés I.', tipus: 'közgyűlés' },
  { cim: 'Pázmány nap', tipus: 'egyetemi rendezvény' },
  { cim: 'Tréning', tipus: 'tréning' }
]
const resC = checkStatuszRequirements(attsFailC)
assert.strictEqual(resC.passed, false, 'Case C should fail')
assert.strictEqual(resC.kgyMet, false, 'KGY should fail (1/2)')
assert.strictEqual(resC.egyetemiOrNagyMet, false, 'Egyetemi/Nagy should fail (1/2)')
assert.strictEqual(resC.egyetemiMet, true, 'Single Egyetemi is met')
assert.strictEqual(resC.treningMet, true, 'Single Trening is met')
assert.strictEqual(resC.missing.length, 2, 'Should have 2 missing requirements')
console.log('  ✅ Case C (Missing 1 KGY + 1 Egyetemi/Nagy): correctly flagged missing conditions')

// 3. Validation and Szövegdoboz requirement
console.log('\n3. Testing Szövegdoboz Enforcement when requirements are not met...')

// When passed: indoklas is optional
const valPass = validateStatuszSubmission({ passed: true, igenyeltStatusz: 'Aktív', indoklas: '' })
assert.strictEqual(valPass.isValid, true, 'Passed submission without indoklas is valid')

// When failed: indoklas is strictly required
const valFailNoMsg = validateStatuszSubmission({ passed: false, igenyeltStatusz: 'Aktív', indoklas: '' })
assert.strictEqual(valFailNoMsg.isValid, false, 'Failed submission without indoklas must be invalid')
assert.ok(valFailNoMsg.errors.indoklas, 'Should return indoklas error message')

const valFailWithMsg = validateStatuszSubmission({
  passed: false,
  igenyeltStatusz: 'Aktív',
  indoklas: 'Erasmuson voltam a félévben, a tavaszi félévben teljesítem a pótlásokat.'
})
assert.strictEqual(valFailWithMsg.isValid, true, 'Failed submission with detailed indoklas is valid')
console.log('  ✅ Mandatory Szövegdoboz validation verified.')

// 4. Mock Store & Service integration
console.log('\n4. Testing Mock Store Statuszujitas Management...')
const config = mockStore.getStatuszujitasConfig()
assert.strictEqual(typeof config.isActive, 'boolean', 'Config isActive is boolean')
console.log('  Config:', config)

const kerelmek = mockStore.getStatuszujitasKerelmek()
assert.ok(kerelmek.length > 0, 'Should return eligible animators')
console.log(`  Found ${kerelmek.length} eligible animators for status renewal`)

// Test submit for user #1010 (Szabó Vivien Barbara)
const submitRes = mockStore.submitStatuszujitasKerelem({
  animator_ID: 1010,
  igenyelt_statusz: 'Aktív',
  indoklas: 'Minden feladatot és rendezvényt szeretnék aktívan vállalni az új félévben.'
})
assert.strictEqual(submitRes.success, true, 'Submission succeeded')
console.log('  ✅ Submitted request for Szabó Vivien Barbara')

// Test admin decision (OK button)
const decisionRes = mockStore.decideStatuszujitasKerelem(1010, { megadott_statusz: 'Aktív' })
assert.strictEqual(decisionRes.success, true, 'Decision succeeded')
assert.strictEqual(decisionRes.animator.statusz, 'aktív', 'Animator status updated')
console.log('  ✅ Admin approval (OK button) successfully updated status to Aktív')

// 5. Status renewal period active range testing
console.log('\n5. Testing Státuszújítás Active Period Date Range Logic...')
const activeRangeConfig = {
  isActive: true,
  startDate: '2026-01-15',
  endDate: '2026-03-31'
}

// In range date (e.g. 2026-02-15) -> TRUE
assert.strictEqual(
  isStatuszujitasPeriodActive(activeRangeConfig, '2026-02-15'),
  true,
  '2026-02-15 should be active'
)

// Out of range date: today in October 2026 -> FALSE
assert.strictEqual(
  isStatuszujitasPeriodActive(activeRangeConfig, '2026-10-31'),
  false,
  '2026-10-31 should be out of range / inactive'
)

// Before start date -> FALSE
assert.strictEqual(
  isStatuszujitasPeriodActive(activeRangeConfig, '2026-01-10'),
  false,
  'Date before startDate should be inactive'
)

// After end date -> FALSE
assert.strictEqual(
  isStatuszujitasPeriodActive(activeRangeConfig, '2026-04-01'),
  false,
  'Date after endDate should be inactive'
)

// When admin deactivates it -> FALSE even if date is within range
assert.strictEqual(
  isStatuszujitasPeriodActive({ ...activeRangeConfig, isActive: false }, '2026-02-15'),
  false,
  'When isActive is false, period must be inactive'
)
console.log('  ✅ Period active date range logic verified 100%.')

console.log('\n🎉 ALL STÁTUSZÚJÍTÁS UNIT & INTEGRATION TESTS PASSED 100%!\n')

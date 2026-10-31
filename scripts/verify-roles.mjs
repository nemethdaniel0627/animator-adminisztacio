import assert from 'node:assert'
import { getAnimatorDisplayRole } from '../src/modules/animators/modell/animatorModels.js'

console.log('🧪 Starting Animator Community Role Hierarchy Verification...\n')

// 1. Position held in latest tisztújítás -> Priority 1: Show Position title
const president = getAnimatorDisplayRole({ nev: 'Németh Dániel', kategoria: 'senior' }, 'Elnök')
assert.strictEqual(president.roleLabel, 'Elnök')
assert.strictEqual(president.roleType, 'position')
console.log('  ✅ Position priority: Elnök -> roleLabel="Elnök"')

const treasurer = getAnimatorDisplayRole({ nev: 'Bolla Péter', kategoria: 'veterán' }, 'Gazdasági felelős')
assert.strictEqual(treasurer.roleLabel, 'Gazdasági felelős')
assert.strictEqual(treasurer.roleType, 'position')
console.log('  ✅ Position priority over category: Gazdasági felelős -> roleLabel="Gazdasági felelős"')

// 2. No active position, but Veterán category or status -> Priority 2: Show "Veterán"
const veteranByCat = getAnimatorDisplayRole({ nev: 'Balogh Márton', kategoria: 'veterán', statusz: 'aktív' }, null)
assert.strictEqual(veteranByCat.roleLabel, 'Veterán')
assert.strictEqual(veteranByCat.roleType, 'veteran')
console.log('  ✅ Veterán category: Balogh Márton -> roleLabel="Veterán"')

const veteranByStat = getAnimatorDisplayRole({ nev: 'Kiss István', kategoria: 'senior', statusz: 'veterán' }, null)
assert.strictEqual(veteranByStat.roleLabel, 'Veterán')
assert.strictEqual(veteranByStat.roleType, 'veteran')
console.log('  ✅ Veterán status: Kiss István -> roleLabel="Veterán"')

// 3. No active position, but Vén category or status -> Priority 2: Show "Vén"
const venByCat = getAnimatorDisplayRole({ nev: 'Nagy Bence', kategoria: 'vén', statusz: 'aktív' }, null)
assert.strictEqual(venByCat.roleLabel, 'Vén')
assert.strictEqual(venByCat.roleType, 'ven')
console.log('  ✅ Vén category: Nagy Bence -> roleLabel="Vén"')

// 4. Default: regular animators (junior, jelölt, senior without position) -> Priority 3: Show "Animátor"
const junior = getAnimatorDisplayRole({ nev: 'Széwald Péter Tamás', kategoria: 'junior', statusz: 'aktív' }, null)
assert.strictEqual(junior.roleLabel, 'Animátor')
assert.strictEqual(junior.roleType, 'default')
console.log('  ✅ Regular junior: Széwald Péter -> roleLabel="Animátor"')

const candidate = getAnimatorDisplayRole({ nev: 'Kovács Anna', kategoria: 'jelölt', statusz: 'aktív' }, null)
assert.strictEqual(candidate.roleLabel, 'Animátor')
assert.strictEqual(candidate.roleType, 'default')
console.log('  ✅ Regular jelölt: Kovács Anna -> roleLabel="Animátor"')

const senior = getAnimatorDisplayRole({ nev: 'Tóth Zsófia', kategoria: 'senior', statusz: 'aktív' }, null)
assert.strictEqual(senior.roleLabel, 'Animátor')
assert.strictEqual(senior.roleType, 'default')
console.log('  ✅ Regular senior: Tóth Zsófia -> roleLabel="Animátor"')

// Verify no '(Nem admin)' substring exists in any labels
assert.ok(!junior.roleLabel.includes('admin'))
assert.ok(!candidate.roleLabel.includes('admin'))

console.log('\n🎉 ALL ROLE DISPLAY TESTS PASSED SUCCESSFULLY! 100% Verified.')

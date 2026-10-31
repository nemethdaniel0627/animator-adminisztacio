import { mockStore } from '../src/common/api/mockData.js'
import { getAnimatorDisplayRole, checkAdminPermission } from '../src/modules/animators/modell/animatorModels.js'

console.log('Testing users, statuses, passwords, and permissions...\n')

// 1. Get all animators from mockStore
const animators = mockStore.getAnimators()
console.log(`Found ${animators.length} animators:`)

let allOthersActive = true
let allPasswordsSet = true
let onlyNemethIsAdmin = true

animators.forEach(a => {
  const isNemeth = a.animator_ID === 1001 || a.nev === 'Németh Dániel'
  const perm = mockStore.checkAdminPermission(a.animator_ID)
  const displayRole = getAnimatorDisplayRole(a, perm.pozicio)

  console.log(`- #${a.animator_ID} ${a.nev}: statusz="${a.statusz}", password="${a.password}", isAdmin=${perm.isAdmin}, role="${displayRole.roleLabel}"`)

  if (!isNemeth && a.statusz !== 'aktív') {
    allOthersActive = false
    console.error(`  FAIL: ${a.nev} has statusz ${a.statusz} instead of 'aktív'!`)
  }

  if (a.password !== 'test1234') {
    allPasswordsSet = false
    console.error(`  FAIL: ${a.nev} does not have password 'test1234'!`)
  }

  if (isNemeth && !perm.isAdmin) {
    onlyNemethIsAdmin = false
    console.error(`  FAIL: Németh Dániel should be Admin!`)
  }

  if (!isNemeth && perm.isAdmin) {
    onlyNemethIsAdmin = false
    console.error(`  FAIL: ${a.nev} is Admin, but should be basic user!`)
  }
})

console.log('\n--- VERIFICATION RESULTS ---')
console.log('All other users are basic aktív users:', allOthersActive ? '✅ PASS' : '❌ FAIL')
console.log('All users have password "test1234":', allPasswordsSet ? '✅ PASS' : '❌ FAIL')
console.log('Only Németh Dániel has Admin rights:', onlyNemethIsAdmin ? '✅ PASS' : '❌ FAIL')

if (!allOthersActive || !allPasswordsSet || !onlyNemethIsAdmin) {
  process.exit(1)
}
console.log('\nAll checks passed successfully!')


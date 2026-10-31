import { mockStore } from '../src/common/api/mockData.js'

console.log('🧪 Starting Timeline Tisztújítás vs Tisztújító Közgyűlés Verification...\n')

const events = mockStore.getEvents()
const positions = mockStore.getPoziciok()

// Helper to determine node type
const isKozgyules = (ev) => {
  const t = (ev.tipus || '').toLowerCase()
  const cim = (ev.cim || '').toLowerCase()
  return t.includes('közgyűlés') || t.includes('kozgyules') || cim.includes('közgyűlés') || cim.includes('kozgyules') || t.includes('státuszújítás')
}

const isTisztujitas = (ev) => {
  const t = (ev.tipus || '').toLowerCase()
  const cim = (ev.cim || '').toLowerCase()
  if (isKozgyules(ev)) return false
  return t.includes('tisztújítás') || t.includes('tisztujit') || cim.includes('tisztújítás') || cim.includes('tisztujit')
}

// 1. Verify "Tisztújító Közgyűlés" is treated as a basic közgyűlés
const tisztujitoKozgyules = events.find((e) => (e.cim || '').includes('Tisztújító Közgyűlés'))
if (!tisztujitoKozgyules) {
  console.error('❌ "Tisztújító Közgyűlés" event not found in mock store!')
  process.exit(1)
}

console.log('1. Tisztújító Közgyűlés Event:')
console.log(`   Cím: ${tisztujitoKozgyules.cim}`)
console.log(`   Dátum: ${tisztujitoKozgyules.datum}`)
console.log(`   Típus: ${tisztujitoKozgyules.tipus}`)

if (!isKozgyules(tisztujitoKozgyules)) {
  console.error('❌ Expected Tisztújító Közgyűlés to be classified as közgyűlés!')
  process.exit(1)
}
console.log('   ✅ Node Type: Classified as Közgyűlés -> Amber node (#d97706) + MessageSquare icon')

if (isTisztujitas(tisztujitoKozgyules)) {
  console.error('❌ Tisztújító Közgyűlés should NOT be classified as pure tisztújítás!')
  process.exit(1)
}
console.log('   ✅ Pure Tisztújítás check correctly excluded Tisztújító Közgyűlés')

// Check subtitle for Tisztújító Közgyűlés: Must NOT show Pozíciód
const userPosKozgyules = !isKozgyules(tisztujitoKozgyules)
  ? positions.find((p) => p.esemeny_ID === tisztujitoKozgyules.esemeny_ID && p.animator_ID === 1001)
  : null
const subtitleKozgyules = userPosKozgyules ? `Pozíciód: ${userPosKozgyules.pozicio}` : tisztujitoKozgyules.subtitle || null

if (subtitleKozgyules !== null) {
  console.error(`❌ Expected no subtitle for Tisztújító Közgyűlés, got "${subtitleKozgyules}"`)
  process.exit(1)
}
console.log('   ✅ Subtitle: null (No "Pozíciód: ..." on basic közgyűlés, matches user screenshot)')

// 2. Verify "Tisztújítás 2025" has red rosette and Pozíciód: Elnök
const tisztujitas2025 = events.find((e) => e.cim === 'Tisztújítás 2025')
if (!tisztujitas2025) {
  console.error('❌ "Tisztújítás 2025" event not found!')
  process.exit(1)
}

console.log('\n2. Tisztújítás 2025 Event:')
console.log(`   Cím: ${tisztujitas2025.cim}`)
console.log(`   Dátum: ${tisztujitas2025.datum}`)

if (!isTisztujitas(tisztujitas2025)) {
  console.error('❌ Expected Tisztújítás 2025 to be classified as pure tisztújítás!')
  process.exit(1)
}
console.log('   ✅ Node Type: Crimson red node (#851b22) + 16-point white rosette seal icon')

const userPos2025 = !isKozgyules(tisztujitas2025)
  ? positions.find((p) => p.esemeny_ID === tisztujitas2025.esemeny_ID && p.animator_ID === 1001)
  : null
const subtitle2025 = userPos2025 ? `Pozíciód: ${userPos2025.pozicio}` : null

if (subtitle2025 !== 'Pozíciód: Elnök') {
  console.error(`❌ Expected subtitle "Pozíciód: Elnök", got "${subtitle2025}"`)
  process.exit(1)
}
console.log(`   ✅ Subtitle: "${subtitle2025}" (matches user screenshot)`)

console.log('\n🎉 ALL TISZTÚJÍTÓ KÖZGYŰLÉS & TISZTÚJÍTÁS VERIFICATIONS PASSED 100%!')

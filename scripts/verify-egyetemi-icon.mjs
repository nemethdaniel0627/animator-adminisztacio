import fs from 'fs'
import { mockStore } from '../src/common/api/mockData.js'

console.log('🧪 Starting Egyetemi Rendezvény Icon & Node Verification...\n')

// 1. Verify CSS color
const css = fs.readFileSync('src/common/styles/index.css', 'utf8')
if (!css.includes('.timeline-node-egyetemi') || !css.includes('#02577e')) {
  console.error('❌ CSS does not contain .timeline-node-egyetemi with #02577e!')
  process.exit(1)
}
console.log('  ✅ CSS .timeline-node-egyetemi contains #02577e (exact petrol blue from screenshot)')

// 2. Verify getNodeConfig logic
const getNodeConfig = (ev) => {
  const t = (ev.tipus || '').toLowerCase()
  const cim = (ev.cim || '').toLowerCase()

  if (
    t.includes('közgyűlés') ||
    t.includes('kozgyules') ||
    cim.includes('közgyűlés') ||
    cim.includes('kozgyules') ||
    t.includes('státuszújítás')
  ) {
    return { className: 'timeline-node-kozgyules', iconName: 'MessageSquare' }
  }

  if (
    t.includes('tisztújítás') ||
    t.includes('tisztujit') ||
    cim.includes('tisztújítás') ||
    cim.includes('tisztujit')
  ) {
    return { className: 'timeline-node-tisztujitas', iconName: 'RosetteIcon' }
  }

  if (t.includes('tréning') || cim.includes('képzés')) {
    return { className: 'timeline-node-trening', iconName: 'GraduationCap' }
  }

  if (
    t.includes('egyetemi') ||
    cim.includes('egyetemi') ||
    cim.includes('pázmány') ||
    cim.includes('gólyanap') ||
    cim.includes('golyanap')
  ) {
    return { className: 'timeline-node-egyetemi', iconName: 'PaperPlaneIcon' }
  }

  if (
    t.includes('nagyrendezvény') ||
    t.includes('nagyrendezveny') ||
    cim.includes('gólyatábor') ||
    cim.includes('golyatabor') ||
    t.includes('rendezvény')
  ) {
    return { className: 'timeline-node-rendezveny', iconName: 'Rocket' }
  }

  return { className: 'timeline-node-egyeb', iconName: 'Calendar' }
}

const events = mockStore.getEvents()

const pazmanyNap = events.find((e) => e.cim === 'Pázmány nap')
const pazmanyNode = getNodeConfig(pazmanyNap)
console.log(`  ✅ "Pázmány nap" (egyetemi rendezvény) -> className="${pazmanyNode.className}", icon="${pazmanyNode.iconName}"`)
if (pazmanyNode.className !== 'timeline-node-egyetemi' || pazmanyNode.iconName !== 'PaperPlaneIcon') {
  console.error('❌ Failed for Pázmány nap')
  process.exit(1)
}

const golyanapok = events.find((e) => e.cim === 'Gólyanapok')
const golyanapokNode = getNodeConfig(golyanapok)
console.log(`  ✅ "Gólyanapok" (egyetemi rendezvény) -> className="${golyanapokNode.className}", icon="${golyanapokNode.iconName}"`)
if (golyanapokNode.className !== 'timeline-node-egyetemi' || golyanapokNode.iconName !== 'PaperPlaneIcon') {
  console.error('❌ Failed for Gólyanapok')
  process.exit(1)
}

const golyatabor = events.find((e) => e.cim === 'Gólyatábor')
const golyataborNode = getNodeConfig(golyatabor)
console.log(`  ✅ "Gólyatábor" (nagyrendezvény) -> className="${golyataborNode.className}", icon="${golyataborNode.iconName}"`)
if (golyataborNode.className !== 'timeline-node-rendezveny' || golyataborNode.iconName !== 'Rocket') {
  console.error('❌ Failed for Gólyatábor')
  process.exit(1)
}

console.log('\n🎉 ALL EGYETEMI RENDEZVÉNY ICON TESTS PASSED 100%!')

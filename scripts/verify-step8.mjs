/**
 * Step 8: End-to-End Verification & phpMyAdmin Parity Script
 */

import { mockStore } from '../src/common/api/mockData.js'
import { eventService } from '../src/modules/events/szolgaltatas/eventService.js'
import { animatorService } from '../src/modules/animators/szolgaltatas/animatorService.js'
import { jelenletService } from '../src/modules/jelenlet/szolgaltatas/jelenletService.js'

async function runVerification() {
  console.log('====================================================')
  console.log('   STEP 8: END-TO-END VERIFICATION & PHPMYADMIN PARITY')
  console.log('====================================================\n')

  // Reset store to baseline
  mockStore.reset()

  // 1. Initial State Check
  const initialEvents = await eventService.getEvents()
  console.log('[1] Initial baseline event present:')
  console.log(`    - ID: #${initialEvents[0].esemeny_ID}, Title: "${initialEvents[0].cim}", Attendees: ${initialEvents[0].attendeeCount}`)

  // 2. Lookup animators Bolla Péter (883) & Széwald Péter Tamás (963)
  const animators = await animatorService.getAnimators()
  const bolla = animators.find((a) => a.animator_ID === 883)
  const szewald = animators.find((a) => a.animator_ID === 963)
  console.log('\n[2] Animator Directory Lookup:')
  console.log(`    - Found: ${bolla ? bolla.nev : 'N/A'} (ID: ${bolla?.animator_ID})`)
  console.log(`    - Found: ${szewald ? szewald.nev : 'N/A'} (ID: ${szewald?.animator_ID})`)

  // 3. Batch Attendance Registration for Event 762 (Matching Google Sheets Legacy Scenario)
  console.log('\n[3] Registering Attendance for Event #762 (Pázmány nap)...')
  const batchRes = await jelenletService.saveBatchAttendance(762, [883, 963])
  console.log(`    - Created ${batchRes.count} attendance rows`)
  console.log(`    - Generated consecutive jelenlet_IDs: ${JSON.stringify(batchRes.createdJelenletIds)}`)

  // 4. Verify Generated Attendance Records
  const recorded = await jelenletService.getAttendancesByEvent(762)
  console.log('\n[4] Database State in `jelenlet`:')
  recorded.forEach((r) => {
    console.log(`    - (jelenlet_ID: ${r.jelenlet_ID}, animator_ID: ${r.animator_ID} [${r.nev}], esemeny_ID: ${r.esemeny_ID})`)
  })

  // 5. Exact SQL Parity Check against Legacy Google Sheets formula
  console.log('\n[5] Comparing against Google Sheets SQL Generator formula:')
  const expectedSqlStatements = [
    "INSERT INTO `esemeny` (`esemeny_ID`, `cim`, `datum`, `tipus`) VALUES (762, 'Pázmány nap', '2026-10-14', 'egyetemi rendezvény');",
    "INSERT INTO `jelenlet` (`jelenlet_ID`, `animator_ID`, `esemeny_ID`) VALUES (17630, 883, 762);",
    "INSERT INTO `jelenlet` (`jelenlet_ID`, `animator_ID`, `esemeny_ID`) VALUES (17631, 963, 762);"
  ]

  const actualSqlStatements = [
    `INSERT INTO \`esemeny\` (\`esemeny_ID\`, \`cim\`, \`datum\`, \`tipus\`) VALUES (${initialEvents[0].esemeny_ID}, '${initialEvents[0].cim}', '${initialEvents[0].datum}', '${initialEvents[0].tipus}');`,
    ...recorded.map((r) => `INSERT INTO \`jelenlet\` (\`jelenlet_ID\`, \`animator_ID\`, \`esemeny_ID\`) VALUES (${r.jelenlet_ID}, ${r.animator_ID}, ${r.esemeny_ID});`)
  ]

  console.log('    Expected Legacy SQL:')
  expectedSqlStatements.forEach((s) => console.log('      ' + s))
  console.log('    Application Generated SQL equivalent:')
  actualSqlStatements.forEach((s) => console.log('      ' + s))

  const isSqlIdentical = JSON.stringify(actualSqlStatements) === JSON.stringify(expectedSqlStatements)
  console.log(`\n    SQL Parity Result: ${isSqlIdentical ? '100% IDENTICAL (EXACT MATCH)' : 'MISMATCH'}`)

  // 6. Duplicate Prevention Verification
  console.log('\n[6] Testing Duplicate Attendance Prevention:')
  let duplicateBlocked = false
  try {
    await jelenletService.saveBatchAttendance(762, [883])
  } catch (err) {
    duplicateBlocked = true
    console.log(`    - Successfully caught duplicate error: "${err.message}"`)
  }
  console.log(`    Duplicate Prevention Result: ${duplicateBlocked ? 'PASS' : 'FAIL'}`)

  // 7. Dashboard Attendance Counter Verification
  console.log('\n[7] Verifying Dashboard Attendee Counter:')
  const updatedEvents = await eventService.getEvents()
  const event762 = updatedEvents.find((e) => e.esemeny_ID === 762)
  console.log(`    - Event: ${event762.cim}`)
  console.log(`    - attendeeCount: ${event762.attendeeCount} (Expected: 2)`)
  const counterPass = event762.attendeeCount === 2
  console.log(`    Dashboard Counter Result: ${counterPass ? 'PASS' : 'FAIL'}`)

  // 8. Upcoming Event ID Verification
  console.log('\n[8] Verifying Next Sequential Event ID:')
  const nextEventId = await eventService.getNextEventId()
  console.log(`    - Next upcoming esemeny_ID: #${nextEventId} (Expected: #763)`)
  const idPass = nextEventId === 763
  console.log(`    Sequential ID Result: ${idPass ? 'PASS' : 'FAIL'}`)

  console.log('\n====================================================')
  const allPassed = isSqlIdentical && duplicateBlocked && counterPass && idPass
  console.log(`   FINAL VERIFICATION: ${allPassed ? 'ALL CHECKS PASSED (100% SUCCESS)' : 'FAILED'}`)
  console.log('====================================================')

  if (!allPassed) {
    process.exit(1)
  }
}

runVerification()

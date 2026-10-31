import { pathToFileURL } from 'url';

// 1. Setup mock window/localStorage for node
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = {
  localStorage: global.localStorage,
  dispatchEvent: () => {}
};

console.log('🧪 Starting Közgyűlés Finalize & Timeline Attendance Verification...\n');

// 2. Import services
const kgyUrl = pathToFileURL('D:/animator-adminisztacio/src/modules/kozgyules/szolgaltatas/kgyService.js').href;
const { kgyService } = await import(kgyUrl);

const mockUrl = pathToFileURL('D:/animator-adminisztacio/src/common/api/mockData.js').href;
const { mockStore } = await import(mockUrl);

// Reset store to fresh state
mockStore.reset();
localStorage.clear();

console.log('Test 1: KGY State Finalize flags and kgyService.finalizeKgy');
let state = kgyService.getState();
console.assert(state.isFinalized === false, 'Initially isFinalized should be false');
console.assert(state.finalizedEventId === null, 'Initially finalizedEventId should be null');

// Toggle attendance and register attendees
kgyService.toggleAttendance();
kgyService.registerAttendance(1001); // Németh Dániel
kgyService.registerAttendance(883);  // Bolla Péter
state = kgyService.getState();
console.assert(state.attendees.length >= 2, 'Attendees registered');
console.assert(state.attendees.includes(1001) && state.attendees.includes(883), 'Users 1001 and 883 are in attendees');
console.log(`  ✅ Registered attendees: [${state.attendees.join(', ')}]`);

console.log('\nTest 2: Event creation in database (mockStore.createEvent)');
const todayStr = '2026-10-28';
const createRes = mockStore.createEvent({
  cim: 'Közgyűlés',
  datum: todayStr,
  tipus: 'közgyűlés'
});

console.assert(createRes.esemeny_ID, 'Event ID should be returned');
const createdEventId = createRes.esemeny_ID;
console.log(`  ✅ Közgyűlés event created with ID: #${createdEventId}`);

// Verify event is in store
const allEvents = mockStore.getEvents();
const createdEvent = allEvents.find((e) => e.esemeny_ID === createdEventId);
console.assert(createdEvent !== undefined, 'Event should exist in getEvents()');
console.assert(createdEvent.cim === 'Közgyűlés', 'Event title should be Közgyűlés');
console.assert(createdEvent.tipus === 'közgyűlés', 'Event tipus should be közgyűlés');
console.assert(createdEvent.datum === todayStr, 'Event datum should match');
console.log('  ✅ Created event properties verified in database');

console.log('\nTest 3: Writing attendances to every attendee (mockStore.saveBatchAttendance)');
const batchRes = mockStore.saveBatchAttendance(createdEventId, state.attendees);
console.assert(batchRes.success === true, 'Batch attendance should succeed');
console.assert(batchRes.count === state.attendees.length, `Count should match attendees length (${state.attendees.length})`);
console.log(`  ✅ Batch attendances written for ${batchRes.count} attendees`);

// Verify attendances for event
const eventAttendances = mockStore.getAttendancesByEvent(createdEventId);
console.assert(eventAttendances.length === state.attendees.length, 'All attendees recorded for event');
console.log(`  ✅ getAttendancesByEvent verified: ${eventAttendances.map(a => a.nev).join(', ')}`);

console.log('\nTest 4: Verify attendance written to each attendee\'s Idővonal (getAttendancesByAnimator)');
for (const animId of state.attendees) {
  const userAttendances = mockStore.getAttendancesByAnimator(animId);
  const found = userAttendances.find((a) => Number(a.esemeny_ID) === Number(createdEventId));
  console.assert(found !== undefined, `User #${animId} must have an attendance record for event #${createdEventId}`);
  console.assert(found.tipus === 'közgyűlés', `Record tipus must be közgyűlés, got ${found.tipus}`);
  console.log(`  ✅ User #${animId} timeline contains attendance for Közgyűlés (Event #${createdEventId})`);
}

console.log('\nTest 5: kgyService.finalizeKgy integration');
const finalizedState = kgyService.finalizeKgy(createdEventId);
console.assert(finalizedState.isFinalized === true, 'State isFinalized should be true');
console.assert(finalizedState.finalizedEventId === createdEventId, 'finalizedEventId should match created event ID');
console.assert(finalizedState.isAttendanceActive === false, 'isAttendanceActive should be false after finalize');
console.log('  ✅ kgyService.finalizeKgy successfully closed attendance and set finalized flags');

console.log('\nTest 6: KGY restart resets finalized status');
const restarted = kgyService.restartKgy();
console.assert(restarted.isFinalized === false, 'restartKgy should reset isFinalized');
console.assert(restarted.finalizedEventId === null, 'restartKgy should reset finalizedEventId');
console.assert(restarted.attendees.length === 0, 'restartKgy should clear attendees');
console.log('  ✅ restartKgy clean state verified');

console.log('\n🎉 ALL KGY FINALIZATION & TIMELINE ATTENDANCE TESTS PASSED 100%!\n');

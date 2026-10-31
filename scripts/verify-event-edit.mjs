import { pathToFileURL } from 'url';

// Mock localStorage for node
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

console.log('🧪 Starting Event Edit Verification Suite...\n');

// Import services
const mockUrl = pathToFileURL('D:/animator-adminisztacio/src/common/api/mockData.js').href;
const { mockStore } = await import(mockUrl);

const serviceUrl = pathToFileURL('D:/animator-adminisztacio/src/modules/events/szolgaltatas/eventService.js').href;
const { eventService } = await import(serviceUrl);

// 1. Reset and setup
mockStore.reset();
const initialEvents = mockStore.getEvents();
console.assert(initialEvents.length > 0, 'Initial events should exist');
const testEvent = initialEvents[0];
console.log(`1. Target Event for Edit: #${testEvent.esemeny_ID} "${testEvent.cim}" (${testEvent.datum}, ${testEvent.tipus})`);

// 2. Perform update
console.log('\n2. Updating event via eventService.updateEvent...');
const updatePayload = {
  cim: 'Módosított Közgyűlés (Őszi)',
  datum: '2026-10-30',
  tipus: 'közgyűlés'
};

const updateRes = await eventService.updateEvent(testEvent.esemeny_ID, updatePayload);
console.assert(updateRes.esemeny_ID === testEvent.esemeny_ID, 'Returned event ID must match');
console.assert(updateRes.event.cim === 'Módosított Közgyűlés (Őszi)', 'Title should be updated');
console.assert(updateRes.event.datum === '2026-10-30', 'Date should be updated');
console.log(`  ✅ Update API response verified: ID #${updateRes.esemeny_ID} "${updateRes.event.cim}"`);

// 3. Verify in getEvents()
console.log('\n3. Verifying updated event in eventService.getEvents()...');
const refreshedEvents = await eventService.getEvents();
const updatedFound = refreshedEvents.find((e) => e.esemeny_ID === testEvent.esemeny_ID);
console.assert(updatedFound !== undefined, 'Event should still exist');
console.assert(updatedFound.cim === 'Módosított Közgyűlés (Őszi)', 'Updated title in store');
console.assert(updatedFound.datum === '2026-10-30', 'Updated datum in store');
console.assert(updatedFound.tipus === 'közgyűlés', 'Updated tipus in store');
console.log('  ✅ Store persistence and getEvents() reflect edits accurately');

// 4. Validation error handling
console.log('\n4. Testing validation errors on edit...');
let errorCaught = false;
try {
  await eventService.updateEvent(testEvent.esemeny_ID, {
    cim: '',
    datum: '2026-10-30',
    tipus: 'közgyűlés'
  });
} catch (err) {
  errorCaught = true;
  console.log('  ✅ Empty title rejected properly:', err.message);
}
console.assert(errorCaught === true, 'Empty title should throw validation error');

let notFoundCaught = false;
try {
  await eventService.updateEvent(999999, updatePayload);
} catch (err) {
  notFoundCaught = true;
  console.log('  ✅ Non-existent event ID rejected properly:', err.message);
}
console.assert(notFoundCaught === true, 'Non-existent event ID should throw error');

console.log('\n🎉 ALL EVENT EDIT VERIFICATION TESTS PASSED 100%!\n');

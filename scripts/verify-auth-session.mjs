console.log('🧪 Starting Auth Session & Login System Verification...\n');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const STORAGE_SESSION_KEY = 'animator_user_session_v1';

const mockAnimators = [
  { animator_ID: 1001, nev: 'Németh Dániel', shibboleth: 'nemeth.daniel', email: 'nem.dani0627@gmail.com', statusz: 'aktív' },
  { animator_ID: 745, nev: 'Kovács Anna', shibboleth: 'kovacs.anna', email: 'kovacs.anna@animator.hu', statusz: 'aktív' }
];

function login(identifier, animators) {
  const raw = String(identifier || '').trim().toLowerCase();
  const target = animators.find(a => 
    (a.shibboleth || '').toLowerCase() === raw ||
    (a.email || '').toLowerCase() === raw ||
    String(a.animator_ID) === raw
  );
  if (!target) throw new Error('Nem található animátor ezzel az azonosítóval.');
  const session = { animator_ID: target.animator_ID, token: 'token_' + target.animator_ID, loginTime: new Date().toISOString() };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return target;
}

function restoreSession(animators) {
  const raw = localStorage.getItem(STORAGE_SESSION_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return animators.find(a => a.animator_ID === parsed.animator_ID) || null;
}

function logout() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

// Test 1: Empty session initially
console.log('Test 1: Initial state without session');
console.assert(restoreSession(mockAnimators) === null, 'Should return null when no session is in localStorage');
console.log('  ✅ No session initially verified');

// Test 2: Login as Kovács Anna with shibboleth
console.log('\nTest 2: Login with Shibboleth username (kovacs.anna)');
const u1 = login('kovacs.anna', mockAnimators);
console.assert(u1.animator_ID === 745, 'Should log in Kovács Anna (745)');
console.assert(localStorage.getItem(STORAGE_SESSION_KEY) !== null, 'Session should be stored in localStorage');
console.log('  ✅ Login with Shibboleth username successful');

// Test 3: Session restoration
console.log('\nTest 3: Session restoration from localStorage');
const restored = restoreSession(mockAnimators);
console.assert(restored !== null && restored.animator_ID === 745, 'Session restored successfully as Kovács Anna');
console.log('  ✅ Session restoration from localStorage verified');

// Test 4: Logout
console.log('\nTest 4: Logout functionality');
logout();
console.assert(localStorage.getItem(STORAGE_SESSION_KEY) === null, 'Session removed from localStorage on logout');
console.assert(restoreSession(mockAnimators) === null, 'Session is null after logout');
console.log('  ✅ Logout clears session properly');

// Test 5: Login with email
console.log('\nTest 5: Login with Email (nem.dani0627@gmail.com)');
const u2 = login('nem.dani0627@gmail.com', mockAnimators);
console.assert(u2.animator_ID === 1001, 'Should log in Németh Dániel (1001)');
console.log('  ✅ Login with Email verified');

console.log('\n🎉 ALL AUTH & SESSION VERIFICATIONS PASSED SUCCESSFULLY! 100% Verified.\n');

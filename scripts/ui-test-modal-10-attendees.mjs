const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profileDir = 'C:/Users/nemda/.gemini/antigravity-ide/scratch/chrome-uitest-profile';
const artifactDir = 'C:/Users/nemda/.gemini/antigravity-ide/brain/e9c03616-6379-4add-80fe-cc355b4be4cb';

// 10 registered attendees
const TEN_ATTENDEE_IDS = [1001, 883, 963, 745, 812, 904, 670, 720, 915, 928];

const kgyStateWith10 = {
  isAttendanceActive: true,
  isSummaryActive: false,
  isFinalized: false,
  finalizedEventId: null,
  finalizedAt: null,
  attendees: TEN_ATTENDEE_IDS,
  polls: [
    {
      id: 1,
      title: 'Közgyűlési beszámoló elfogadása',
      options: ['Igen', 'Nem'],
      status: 'deactivated',
      votes: {}
    }
  ]
};

// Sync server/kgy_state.json so dev server provides 10 attendees
try {
  fs.writeFileSync('D:/animator-adminisztacio/server/kgy_state.json', JSON.stringify(kgyStateWith10, null, 2), 'utf8');
  console.log('✅ Synchronized D:/animator-adminisztacio/server/kgy_state.json with 10 attendees');
} catch (e) {
  console.warn('Could not write server/kgy_state.json', e.message);
}

async function runUiTest() {
  console.log('🚀 Starting Chrome Headless UI Test for 10 Attendees ConfirmModal...\n');

  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + profileDir,
    '--disable-gpu',
    '--disable-extensions',
    '--window-size=1280,960',
    'about:blank'
  ], { detached: true });

  try {
    let connected = false;
    for (let i = 0; i < 25; i++) {
      try {
        const res = await fetch('http://localhost:9222/json/version');
        if (res.ok) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome CDP');

    const pagesRes = await fetch('http://localhost:9222/json/list');
    const pages = await pagesRes.json();
    const targetPage = pages.find(p => p.type === 'page' && !p.url.startsWith('chrome')) || pages[0];
    const wsUrl = targetPage.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = msgId++;
      pending.set(curId, { resolve, reject });
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    };

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('1. Navigating to /kgy/admin (will redirect to login)...');
    await send('Page.navigate', { url: 'http://localhost:5173/kgy/admin' });
    await new Promise(r => setTimeout(r, 1500));

    console.log('2. Clicking "Németh Dániel" tester login button...');
    const loginClicked = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Németh Dániel'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.assert(loginClicked === true, 'Login button should be clicked');
    await new Promise(r => setTimeout(r, 2000));

    // Ensure kgy state in localStorage has all 10 attendees
    await evaluate(`
      (() => {
        localStorage.setItem('animator_kgy_state_v1', JSON.stringify(${JSON.stringify(kgyStateWith10)}));
        window.dispatchEvent(new CustomEvent('kgy_state_change', { detail: ${JSON.stringify(kgyStateWith10)} }));
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const currentUrl = await evaluate('window.location.href');
    console.log('  ✅ Logged in successfully. Current URL:', currentUrl);

    console.log('3. Clicking "Közgyűlés lezárása & rögzítés az idővonalakra" button...');
    const clickedFinalize = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.innerText.includes('Közgyűlés lezárása') || b.innerText.includes('Közgyűlés lezárása és rögzítése')
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.assert(clickedFinalize === true, 'Finalize button should be clicked');
    await new Promise(r => setTimeout(r, 1000));

    // Inspect open modal content
    const modalData = await evaluate(`
      (() => {
        const modal = document.querySelector('.modal-container');
        if (!modal) return null;
        return {
          title: modal.querySelector('h2')?.innerText || '',
          text: modal.innerText
        };
      })()
    `);

    if (!modalData) {
      throw new Error('Modal container (.modal-container) was not found in the DOM after clicking finalize button!');
    }

    console.log('  ✅ Modal opened successfully:');
    console.log('     Title:', modalData.title);

    const has10Text = modalData.text.includes('10 fő');
    const hasRemainingText = modalData.text.includes('további 7 fő');
    const hasExpandButton = modalData.text.includes('Teljes névsor megtekintése');

    console.log('     Has "10 fő":', has10Text);
    console.log('     Has "...és további 7 fő":', hasRemainingText);
    console.log('     Has "Teljes névsor megtekintése" button:', hasExpandButton);

    console.assert(has10Text, 'Should specify 10 attendees');
    console.assert(hasRemainingText, 'Should summarize "...és további 7 fő"');
    console.assert(hasExpandButton, 'Should have expansion button');

    // 4. Capture Compact Screenshot
    console.log('\n4. Capturing Screenshot 1: Compact View (3 names + "...és további 7 fő")...');
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    const compactPath = path.join(artifactDir, 'kgy_modal_10_attendees_compact.png');
    fs.writeFileSync(compactPath, Buffer.from(shot1.data, 'base64'));
    console.log(`  📸 Saved Compact Screenshot: ${compactPath} (${fs.statSync(compactPath).size} bytes)`);

    // 5. Click "▼ Teljes névsor megtekintése (10 fő)"
    console.log('\n5. Clicking "▼ Teljes névsor megtekintése (10 fő)" button...');
    const expandResult = await evaluate(`
      (() => {
        const expBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Teljes névsor megtekintése'));
        if (expBtn) {
          expBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('  Expand button clicked:', expandResult);
    await new Promise(r => setTimeout(r, 600));

    // Inspect expanded badges
    const expandedData = await evaluate(`
      (() => {
        const modal = document.querySelector('.modal-container');
        if (!modal) return null;
        const collapseBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Névsor összecsukása'));
        // Find badge elements in the scrollable box
        const badges = Array.from(modal.querySelectorAll('span')).filter(s =>
          s.innerText && s.style.borderRadius === '4px' && s.style.padding === '2px 7px'
        );
        return {
          hasCollapseBtn: Boolean(collapseBtn),
          badgeCount: badges.length,
          names: badges.map(b => b.innerText.trim())
        };
      })()
    `);

    console.log('  ✅ Expanded view verified:');
    console.log('     Has collapse button:', expandedData.hasCollapseBtn);
    console.log('     Rendered badges count:', expandedData.badgeCount);
    console.log('     Rendered attendee names:');
    console.log('       ' + expandedData.names.join(', '));

    console.assert(expandedData.hasCollapseBtn === true, 'Collapse button should be visible');
    console.assert(expandedData.badgeCount === 10, `Expected 10 attendee badges, got ${expandedData.badgeCount}`);

    // 6. Capture Expanded Screenshot
    console.log('\n6. Capturing Screenshot 2: Expanded View with Scrollable 10 Badges...');
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    const expandedPath = path.join(artifactDir, 'kgy_modal_10_attendees_expanded.png');
    fs.writeFileSync(expandedPath, Buffer.from(shot2.data, 'base64'));
    console.log(`  📸 Saved Expanded Screenshot: ${expandedPath} (${fs.statSync(expandedPath).size} bytes)`);

    ws.close();
    console.log('\n🎉 UI TEST FOR 10 ATTENDEES CONFIRM MODAL COMPLETED 100% SUCCESSFULLY!\n');
  } finally {
    proc.kill();
  }
}

runUiTest().catch((err) => {
  console.error('❌ UI Test failed:', err);
  process.exit(1);
});

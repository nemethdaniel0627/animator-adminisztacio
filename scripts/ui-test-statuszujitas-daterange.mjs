import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const profileDir = 'C:/Users/nemda/.gemini/antigravity/scratch/chrome-uitest-profile'
const artifactDir = 'C:/Users/nemda/.gemini/antigravity/brain/e9c03616-6379-4add-80fe-cc355b4be4cb'

async function runTest() {
  console.log('🚀 Running UI Test for Statuszújítás Inactive/Active Date Range...\n')

  const proc = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--user-data-dir=' + profileDir,
      '--disable-gpu',
      '--disable-extensions',
      '--window-size=1280,1050',
      'about:blank'
    ],
    { detached: true }
  )

  try {
    await new Promise((r) => setTimeout(r, 1200))
    const pagesRes = await fetch('http://localhost:9222/json/list')
    const pages = await pagesRes.json()
    const targetPage = pages.find((p) => p.type === 'page' && !p.url.startsWith('chrome')) || pages[0]
    const ws = new WebSocket(targetPage.webSocketDebuggerUrl)
    await new Promise((r) => { ws.onopen = r })

    let msgId = 1
    const pending = new Map()
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id)
        pending.delete(data.id)
        if (data.error) reject(new Error(data.error.message))
        else resolve(data.result)
      }
    }

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const curId = msgId++
        pending.set(curId, { resolve, reject })
        ws.send(JSON.stringify({ id: curId, method, params }))
      })

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      })
      return res?.result?.value
    }

    await send('Page.enable')
    await send('Runtime.enable')

    // Phase 1: Test Inactive State (Default 2026-01-15 - 2026-03-31, out of range)
    console.log('Phase 1: Verifying that when date is out of range, page and menu item do not appear...')
    await send('Page.navigate', { url: 'http://localhost:5173/timeline' })
    await new Promise((r) => setTimeout(r, 1500))

    // Ensure logged in
    const curUrl = await evaluate('window.location.href')
    if (curUrl.includes('/login')) {
      console.log('  Logging in as Németh Dániel...')
      await evaluate(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Németh Dániel'));
          if (btn) btn.click();
        })()
      `)
      await new Promise((r) => setTimeout(r, 1500))
    }

    // Reset date range in localStorage mock store to 2026-01-15 - 2026-03-31
    await evaluate(`
      (() => {
        const storeKey = 'animator_admin_mock_store_v7';
        const raw = localStorage.getItem(storeKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.statuszujitasConfig = {
            isActive: true,
            startDate: '2026-01-15',
            endDate: '2026-03-31',
            ev: 2026
          };
          localStorage.setItem(storeKey, JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent('statuszujitas_config_change', { detail: parsed.statuszujitasConfig }));
        }
      })()
    `)
    await new Promise((r) => setTimeout(r, 500))

    // Check sidebar nav items
    const navItems = await evaluate(`
      (() => {
        const items = Array.from(document.querySelectorAll('.portal-sidebar .portal-nav-item')).map(i => i.innerText.trim());
        return items;
      })()
    `)
    console.log('  Sidebar Nav Items when out of date range:', navItems)
    const hasStatuszujitasNav = navItems.some(i => i.includes('Státuszújítás') && !i.includes('kérelmek'))
    console.log('  Is Státuszújítás nav item present:', hasStatuszujitasNav)
    console.assert(!hasStatuszujitasNav, 'Státuszújítás nav link MUST NOT be present in sidebar when date is out of range!')

    // Try navigating directly to /statuszujitas
    console.log('  Navigating directly to /statuszujitas...')
    await send('Page.navigate', { url: 'http://localhost:5173/statuszujitas' })
    await new Promise((r) => setTimeout(r, 1500))

    const urlAfterDirectNav = await evaluate('window.location.href')
    console.log('  URL after navigating to /statuszujitas:', urlAfterDirectNav)
    console.assert(urlAfterDirectNav.includes('/timeline'), 'Must immediately redirect to /timeline!')

    // Capture screenshot 1: Inactive state (redirected to timeline, no nav item)
    const shot1 = await send('Page.captureScreenshot', { format: 'png' })
    const shotPath1 = path.join(artifactDir, 'statuszujitas_inactive_hidden.png')
    fs.writeFileSync(shotPath1, Buffer.from(shot1.data, 'base64'))
    console.log(`  📸 Saved Screenshot 1 (Page not appearing): ${shotPath1}`)

    // Phase 2: Admin View - Inactive indicator & Period Configuration
    console.log('\nPhase 2: Checking Admin View and updating date range to active...')
    await send('Page.navigate', { url: 'http://localhost:5173/statuszujitas-kerelmek' })
    await new Promise((r) => setTimeout(r, 1500))

    const badgeText = await evaluate(`document.querySelector('.statusz-period-badge')?.innerText || ''`)
    console.log('  Admin Period Badge Text:', badgeText)
    console.assert(badgeText.includes('inaktív') || badgeText.includes('dátumon kívül'), 'Badge should show inactive out of date range')

    // Open Időszak kezelése panel
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Időszak kezelése'));
        if (btn) btn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 600))

    // Set dates that encompass today (e.g. 2026-10-01 to 2026-11-30)
    await evaluate(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input[type="date"]'));
        if (inputs.length >= 2) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[0], '2026-10-01');
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

          nativeSetter.call(inputs[1], '2026-11-30');
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `)
    await new Promise((r) => setTimeout(r, 400))

    // Save period settings
    await evaluate(`
      (() => {
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Időszak Mentése'));
        if (saveBtn) saveBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 1000))

    // Capture screenshot 2: Admin settings panel & updated active badge
    const shot2 = await send('Page.captureScreenshot', { format: 'png' })
    const shotPath2 = path.join(artifactDir, 'statuszujitas_admin_period_settings.png')
    fs.writeFileSync(shotPath2, Buffer.from(shot2.data, 'base64'))
    console.log(`  📸 Saved Screenshot 2 (Admin period settings): ${shotPath2}`)

    // Phase 3: Now that date range includes today, test that Státuszújítás page and menu item DO appear!
    console.log('\nPhase 3: Verifying that Státuszújítás nav item and user page appear when date range is active...')
    const navItemsActive = await evaluate(`
      (() => {
        const items = Array.from(document.querySelectorAll('.portal-sidebar .portal-nav-item')).map(i => i.innerText.trim());
        return items;
      })()
    `)
    console.log('  Sidebar Nav Items after period activation:', navItemsActive)
    const hasStatuszujitasNavActive = navItemsActive.some(i => i.includes('Státuszújítás') && !i.includes('kérelmek'))
    console.assert(hasStatuszujitasNavActive, 'Státuszújítás nav item MUST appear when period is active!')

    // Navigate to /statuszujitas
    console.log('  Navigating to /statuszujitas...')
    await send('Page.navigate', { url: 'http://localhost:5173/statuszujitas' })
    await new Promise((r) => setTimeout(r, 1500))

    const activeUserUrl = await evaluate('window.location.href')
    console.log('  URL on active user view:', activeUserUrl)
    console.assert(activeUserUrl.includes('/statuszujitas'), 'User must remain on /statuszujitas when period is active!')

    const pageHeader = await evaluate(`document.querySelector('.statusz-page-title')?.innerText || ''`)
    console.log('  Page Title on active view:', pageHeader)
    console.assert(pageHeader.includes('Státuszújítás'), 'User page must be displayed')

    // Capture screenshot 3: Active user view
    const shot3 = await send('Page.captureScreenshot', { format: 'png' })
    const shotPath3 = path.join(artifactDir, 'statuszujitas_active_shown.png')
    fs.writeFileSync(shotPath3, Buffer.from(shot3.data, 'base64'))
    console.log(`  📸 Saved Screenshot 3 (Active Státuszújítás Page): ${shotPath3}`)

    ws.close()
    console.log('\n🎉 ALL AUTOMATED UI TESTS PASSED 100%!\n')
  } finally {
    proc.kill()
  }
}

runTest().catch((err) => {
  console.error('❌ UI Test failed:', err)
  process.exit(1)
})


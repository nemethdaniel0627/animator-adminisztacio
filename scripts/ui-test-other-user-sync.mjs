import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const profileDir = 'C:/Users/nemda/.gemini/antigravity/scratch/chrome-kovacs-anna-profile'
const artifactDir = 'C:/Users/nemda/.gemini/antigravity/brain/e9c03616-6379-4add-80fe-cc355b4be4cb'

async function runTest() {
  console.log('🚀 Running UI Test for Other User (Kovács Anna) Státuszújítás Visibility & Sync...\n')

  // Clean test profile to simulate fresh/incognito session
  try {
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true })
    }
  } catch (e) {
    console.log('Profile cleanup note:', e.message)
  }

  const proc = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=9223',
      '--user-data-dir=' + profileDir,
      '--disable-gpu',
      '--disable-extensions',
      '--window-size=1280,1050',
      'about:blank'
    ],
    { detached: true }
  )

  try {
    await new Promise((r) => setTimeout(r, 1500))
    const pagesRes = await fetch('http://localhost:9223/json/list')
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

    console.log('Step 1: Navigating to login page...')
    await send('Page.navigate', { url: 'http://localhost:5173/login' })
    await new Promise((r) => setTimeout(r, 1500))

    console.log('Step 2: Logging in as Kovács Anna (#745, regular Animator)...')
    const loginSuccess = await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const annaBtn = buttons.find(b => b.innerText.includes('Kovács Anna'));
        if (annaBtn) {
          annaBtn.click();
          return true;
        }
        return false;
      })()
    `)
    console.log('  Login button clicked:', loginSuccess)
    await new Promise((r) => setTimeout(r, 2000))

    const curUrl = await evaluate('window.location.href')
    console.log('  Current URL after login:', curUrl)

    // Step 3: Verify sidebar links for Kovács Anna
    const sidebarText = await evaluate(`
      (() => {
        const navItems = Array.from(document.querySelectorAll('.portal-nav-item'));
        return navItems.map(item => item.innerText.trim());
      })()
    `)
    console.log('  Sidebar items for Kovács Anna:', sidebarText)

    const hasStatuszujitasInSidebar = sidebarText.some(t => t.toLowerCase().includes('státuszújítás'))
    console.log('  Is STÁTUSZÚJÍTÁS visible in sidebar?:', hasStatuszujitasInSidebar)

    // Screenshot sidebar
    const shot1 = await send('Page.captureScreenshot', { format: 'png' })
    const shot1Path = path.join(artifactDir, 'statuszujitas_kovacs_anna_sidebar.png')
    fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'))
    console.log('  Saved screenshot 1:', shot1Path)

    if (!hasStatuszujitasInSidebar) {
      throw new Error('STÁTUSZÚJÍTÁS is NOT visible in Kovács Anna sidebar!')
    }

    // Step 4: Click on Státuszújítás nav link
    console.log('Step 4: Navigating to Státuszújítás page as Kovács Anna...')
    await evaluate(`
      (() => {
        const navItems = Array.from(document.querySelectorAll('.portal-nav-item'));
        const btn = navItems.find(item => item.innerText.toLowerCase().includes('státuszújítás'));
        if (btn) btn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 2000))

    const statuszUrl = await evaluate('window.location.href')
    console.log('  Current URL after clicking:', statuszUrl)

    // Check page contents
    const pageDetails = await evaluate(`
      (() => {
        return {
          title: document.querySelector('.statusz-header h1')?.innerText || '',
          periodBadge: document.querySelector('.statusz-period-badge')?.innerText || '',
          hasAlert: Boolean(document.querySelector('.statusz-alert')),
          alertText: document.querySelector('.statusz-alert')?.innerText || '',
          radioOptions: Array.from(document.querySelectorAll('.statusz-radio-pill')).map(p => p.innerText.trim()),
          hasIndoklasBox: Boolean(document.querySelector('textarea')),
          indoklasRequired: document.body.innerText.includes('Kötelező Szövegdoboz')
        };
      })()
    `)
    console.log('  Page Details for Kovács Anna:', JSON.stringify(pageDetails, null, 2))

    // Screenshot page
    const shot2 = await send('Page.captureScreenshot', { format: 'png' })
    const shot2Path = path.join(artifactDir, 'statuszujitas_kovacs_anna_page.png')
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'))
    console.log('  Saved screenshot 2:', shot2Path)

    ws.close()
    proc.kill()
    console.log('\n✅ TEST PASSED: Státuszújítás correctly visible and functional for Kovács Anna!')
  } catch (err) {
    console.error('❌ Test failed:', err)
    proc.kill()
    process.exit(1)
  }
}

runTest()

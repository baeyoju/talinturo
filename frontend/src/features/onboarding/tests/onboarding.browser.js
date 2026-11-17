// Isolated browser + real Flask/PostgreSQL test database; never the user's session.
// Normally launched by backend/verify_onboarding.py --browser. No packages added.
// Uses the frontend package's existing "type": "module" for standard .js files.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'vite';

const apiOrigin = process.env.TALINTURO_BROWSER_API_URL;
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(apiOrigin || ''), 'Launch with the isolated test backend helper');
const executable = process.env.TALINTURO_BROWSER_EXE || 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
assert.ok(existsSync(executable), 'An installed Chromium browser is required');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifacts = await mkdtemp(join(tmpdir(), 'talinturo-onboarding-proof-'));
const profile = await mkdtemp(join(tmpdir(), 'talinturo-onboarding-browser-'));
let browser, socket;
const vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': { target: apiOrigin } } }, clearScreen: false });
const errors = [];
try {
  await vite.listen();
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = spawn(executable, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const debug = await Promise.race([new Promise((resolve, reject) => {
    let log = '';
    browser.stderr.on('data', chunk => { log += chunk; const match = log.match(/DevTools listening on (ws:\/\/\S+)/); if (match) resolve(match[1]); });
    browser.once('error', reject); browser.once('exit', code => reject(Error(`Browser exited ${code}`)));
  }), wait(15000).then(() => { throw Error('Browser startup timeout'); })]);
  const port = new URL(debug).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0, loads = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const packet = JSON.parse(data);
    if (pending.has(packet.id)) { const task = pending.get(packet.id); pending.delete(packet.id); packet.error ? task.reject(Error(JSON.stringify(packet.error))) : task.resolve(packet.result); }
    if (packet.method === 'Page.loadEventFired') loads++;
    if (packet.method === 'Runtime.exceptionThrown') errors.push(packet.params.exceptionDetails.exception?.description || packet.params.exceptionDetails.text);
    if (packet.method === 'Fetch.requestPaused') {
      cdp('Fetch.fulfillRequest', { requestId: packet.params.requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify({ error: 'Test outage: answers have not been saved.' })).toString('base64') }).catch(error => errors.push(error.message));
    }
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id, timer = setTimeout(() => { pending.delete(requestId); reject(Error(`CDP timeout ${method}`)); }, 15000);
    pending.set(requestId, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await wait(100); }
    throw Error(`Timeout: ${label}; ${await evaluate('document.body.innerText.slice(-1500)')}`);
  };
  const navigate = async path => {
    const previous = loads;
    await cdp('Page.navigate', { url: origin + path });
    for (let attempt = 0; attempt < 100 && loads === previous; attempt++) await wait(100);
    assert.ok(loads > previous, 'New document loaded');
  };
  const input = (selector, value) => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing input'); const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(String(value))}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const next = async step => { await click('.onboarding-continue'); await until(`document.querySelector('.onboarding-main')?.dataset.step === '${step}'`, `step ${step}`); };
  const screenshot = async name => { const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(artifacts, name + '.png'), Buffer.from(result.data, 'base64')); };
  const metrics = [];
  const welcomeMetrics = [];
  const checkWelcome = async stage => {
    await until(`document.querySelector('.onboarding-welcome')?.dataset.welcome === '${stage}' && !document.querySelector('.onboarding-welcome__continue').disabled`, `${stage} welcome ready`);
    assert.equal(await evaluate("Boolean(document.querySelector('.topbar,.sidebar,.footer,.onboarding-stepper'))"), false, 'Welcome has no unrelated dashboard chrome or stepper');
    const viewports = [320, 393, 768, 1440, 1920].map(width => ({ width, height: width >= 1920 ? 1080 : 900, deviceScaleFactor: 1, mobile: width < 600 }));
    viewports.push({ width: 1366, height: 768, deviceScaleFactor: 1, mobile: false }, { width: 1536, height: 730, deviceScaleFactor: 1.25, mobile: false }, { width: 900, height: 500, deviceScaleFactor: 1, mobile: false });
    for (const viewport of viewports) {
      const { width, height } = viewport;
      await cdp('Emulation.setDeviceMetricsOverride', viewport);
      await evaluate("document.querySelector('.onboarding-welcome img').decode()");
      await wait(100);
      const layout = await evaluate(`(() => {const img=document.querySelector('.onboarding-welcome img'),a=img.getBoundingClientRect(),bubble=document.querySelector('.onboarding-welcome__bubble'),b=bubble.getBoundingClientRect(),s=document.querySelector('.onboarding-welcome__shadow').getBoundingClientRect(),c=document.querySelector('.onboarding-welcome__continue').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,imageWidth:a.width,imageHeight:a.height,imageLoaded:img.complete&&img.naturalWidth>0,imageSource:img.getAttribute('src'),imageLayoutRatio:img.offsetWidth/img.offsetHeight,bubbleWidth:b.width,bubbleFontSize:parseFloat(getComputedStyle(bubble).fontSize),bubbleBottom:b.bottom,imageTop:a.top,imageBottom:a.bottom,shadowTop:s.top,buttonWidth:c.width,buttonHeight:c.height,buttonBottom:c.bottom,message:bubble.textContent,font:getComputedStyle(bubble).fontFamily};})()`);
      assert.ok(layout.scroll <= width, `Welcome overflow: ${stage} at ${width}`);
      assert.ok(layout.imageLoaded && layout.imageHeight >= 140 && layout.imageHeight <= 200, `Compact mascot size including the existing inhale: ${JSON.stringify(layout)}`);
      assert.ok(layout.bubbleWidth <= 420.5 && layout.bubbleFontSize <= 16, 'Welcome bubble and text stay compact on wide screens');
      assert.ok(Math.abs(layout.imageLayoutRatio - 319.883 / 401.85) < .005, 'Figma artwork proportions are preserved');
      assert.ok(layout.imageSource.includes(stage === 'complete' ? 'onboarding-welcome-complete' : 'onboarding-welcome-setup'), 'Each welcome uses its exact Figma asset');
      assert.ok(layout.imageTop > layout.bubbleBottom + 12 && layout.shadowTop >= layout.imageBottom, 'Bubble, character and ground shadow do not overlap');
      assert.ok(layout.buttonHeight >= 48 && layout.buttonHeight <= 53 && layout.buttonBottom <= height + 1, 'Compact, visible, touch-friendly primary action');
      if (width > 600) assert.ok(layout.buttonWidth <= 224.5, 'Desktop button does not grow to the artboard width');
      assert.ok(layout.scrollHeight <= height + 1, `Welcome fits without vertical scrolling: ${JSON.stringify(layout)}`);
      assert.match(layout.font, /Fredoka/);
      welcomeMetrics.push({ stage, ...layout });
      if ([393, 1366, 1440, 1536, 1920].includes(width)) await screenshot(`welcome-${stage}-${width}`);
    }
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.onboarding-welcome__breathing')).animationName"), 'none');
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    const feet = await evaluate(`(() => {const b=document.querySelector('.onboarding-welcome__breathing'),a=b.getAnimations()[0];a.pause();const samples=[0,.25,.5,.75].map(f=>{a.currentTime=3600*f;const m=new DOMMatrix(getComputedStyle(b).transform);return {x:m.e,y:m.f,bottom:b.getBoundingClientRect().bottom};});a.play();return samples;})()`);
    for (const frame of feet) { assert.equal(frame.x, 0); assert.equal(frame.y, 0); assert.ok(Math.abs(frame.bottom - feet[0].bottom) < .1, 'Breathing feet stay anchored'); }
  };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await navigate('/login');
  assert.equal(await evaluate(`fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'learner@example.com',password:'safe-password'})}).then(r=>r.status)`), 200);
  await navigate('/profile/setup');
  await checkWelcome('setup');
  assert.equal((await evaluate("document.querySelector('.onboarding-welcome__continue').textContent")).trim(), "I'M READY");
  await click('.onboarding-welcome__continue');
  await until("document.getElementById('onboarding-nickname') && !document.querySelector('.onboarding-continue').disabled", 'onboarding ready');
  assert.equal(await evaluate("Boolean(document.querySelector('.topbar,.sidebar,.footer'))"), false);
  for (let step = 0; step < 7; step++) {
    for (const width of [320, 393, 768, 1440, 1920]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: width >= 1920 ? 1080 : 900, deviceScaleFactor: 1, mobile: width < 600 });
      await wait(100);
      const layout = await evaluate(`(() => { const image=document.querySelector('.onboarding-mascot img'),r=image.getBoundingClientRect(),button=document.querySelector('.onboarding-continue').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,imageLoaded:image.complete&&image.naturalWidth>0,imageWidth:r.width,imageHeight:r.height,imageLayoutRatio:image.offsetWidth/image.offsetHeight,buttonHeight:button.height,current:document.querySelector('[aria-current="step"]')?.textContent}; })()`);
      assert.ok(layout.scroll <= width, `Horizontal overflow at step ${step}, width ${width}`);
      assert.ok(layout.imageLoaded && layout.imageHeight <= 210 && layout.imageHeight >= 160, 'Canonical artwork decoded and modestly sized');
      assert.ok(Math.abs(layout.imageLayoutRatio - 138.965 / 190.999) < .005, 'Artwork proportions before breathing');
      if (layout.buttonHeight < 48) { await screenshot(`failed-layout-${step}-${width}`); console.log('Layout failure:', JSON.stringify(layout), artifacts); }
      assert.ok(layout.buttonHeight >= 47.9, `Touch target: ${JSON.stringify(layout)}`);
      if (step === 6) assert.match(layout.current, /Finish/);
      metrics.push({ step, width, ...layout });
      if (width === 393 || width === 1440) await screenshot(`step-${step}-${width}`);
    }
    if (step === 0) {
      await input('#onboarding-nickname', ''); await click('.onboarding-continue');
      await until("Boolean(document.querySelector('#onboarding-error'))", 'nickname validation');
      await input('#onboarding-nickname', 'Josh Onboarding'); await next(1);
    } else if (step === 1) {
      await input('[aria-label="Birth month"]', '2'); await input('[aria-label="Birth day"]', '31'); await input('[aria-label="Birth year"]', '2000');
      await click('.onboarding-continue'); await until("Boolean(document.querySelector('#onboarding-error'))", 'invalid date validation');
      await input('[aria-label="Birth month"]', '3'); await input('[aria-label="Birth day"]', '18');
      await click('.onboarding-back'); await until("document.getElementById('onboarding-nickname')?.value === 'Josh Onboarding'", 'Back preserves answers');
      await next(1); await next(2);
    } else if (step === 2) { await click('.onboarding-choice:nth-child(2)'); await next(3);
    } else if (step === 3) { await click('.onboarding-choice:nth-child(2)'); await next(4);
    } else if (step === 4) {
      await input('#onboarding-code', 'MISSING'); await click('.onboarding-continue');
      await until("document.querySelector('#onboarding-error')?.textContent.includes('No active classroom')", 'real invalid-code rejection');
      await input('#onboarding-code', 'sunny24'); await next(5);
    } else if (step === 5) { await click('.onboarding-choice:nth-child(2)'); await next(6); }
  }
  assert.equal(await evaluate("document.querySelector('.onboarding-summary').textContent.includes('Sunshine Sign Stars')"), true);
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.onboarding-mascot__breathing')).animationName"), 'none');
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const breathing = await evaluate(`(() => { const body=document.querySelector('.onboarding-mascot__breathing'),a=body.getAnimations()[0];a.pause();const samples=[0,.25,.5,.75].map(f=>{a.currentTime=3600*f;const m=new DOMMatrix(getComputedStyle(body).transform);return {x:m.e,y:m.f,bottom:body.getBoundingClientRect().bottom};});a.play();return samples; })()`);
  for (const sample of breathing) { assert.equal(sample.x, 0); assert.equal(sample.y, 0); assert.ok(Math.abs(sample.bottom - breathing[0].bottom) < .1); }
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/onboarding', requestStage: 'Request' }] });
  await click('.onboarding-continue'); await until("document.querySelector('#onboarding-error')?.textContent.includes('Test outage')", 'save failure retains Finish');
  assert.equal(await evaluate("document.querySelector('.onboarding-main').dataset.step"), '6');
  await cdp('Fetch.disable');
  await evaluate("document.querySelector('.onboarding-continue').click();document.querySelector('.onboarding-continue').click()");
  await until("location.pathname === '/profile/setup/complete'", 'real save opens final welcome');
  await checkWelcome('complete');
  assert.match(await evaluate("document.querySelector('.onboarding-welcome__bubble').textContent"), /Welcome to TALINTURO, Josh Onboarding,/);
  const saved = await evaluate("fetch('/api/onboarding').then(r=>r.json())");
  assert.equal(saved.onboarding.nickname, 'Josh Onboarding'); assert.equal(saved.onboarding.daily_goal_minutes, 10);
  assert.equal(saved.onboarding.class_code, 'SUNNY24'); assert.equal(saved.onboarding.sensory_preference, 'haptics');
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/onboarding', requestStage: 'Request' }] });
  await navigate('/profile/setup/complete');
  await until("document.querySelector('.onboarding-welcome .onboarding-error')?.textContent.includes('Test outage')", 'final welcome handles a read outage without claiming completion');
  assert.doesNotMatch(await evaluate("document.querySelector('.onboarding-welcome__bubble').textContent"), /Josh Onboarding/);
  await cdp('Fetch.disable');
  await click('.onboarding-welcome__continue');
  await until("document.querySelector('.onboarding-welcome__bubble')?.textContent.includes('Welcome to TALINTURO, Josh Onboarding,')", 'retry reloads the saved nickname');
  await click('.onboarding-welcome__continue');
  await until("location.pathname === '/' && !document.querySelector('.onboarding-page')", 'final welcome action opens dashboard');
  await evaluate("fetch('/api/auth/logout',{method:'POST'})");
  assert.equal(await evaluate(`fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'learner@example.com',password:'safe-password'})}).then(r=>r.status)`), 200);
  await navigate('/profile/setup');
  await checkWelcome('setup');
  await click('.onboarding-welcome__continue');
  await until("document.getElementById('onboarding-nickname')?.value === 'Josh Onboarding' && !document.querySelector('.onboarding-continue').disabled", 'saved data restores after new login');
  assert.equal((await evaluate("fetch('/api/onboarding').then(r=>r.json())")).onboarding.birthdate, '2000-03-18');
  await next(1);
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Birth year\"]').value"), '2000');
  await next(2);
  assert.equal(await evaluate("document.querySelector('.onboarding-choice:nth-child(2)').getAttribute('aria-pressed')"), 'true');
  await next(3); await next(4);
  assert.equal(await evaluate("document.getElementById('onboarding-code').value"), 'SUNNY24');
  await click('.onboarding-skip'); await next(5);
  await click('.onboarding-choice:first-child'); await next(6);
  assert.equal(await evaluate("document.querySelector('.onboarding-summary').textContent.includes('Not enrolled')"), true);
  await click('.onboarding-continue');
  await until("location.pathname === '/profile/setup/complete' && document.querySelector('.onboarding-welcome__bubble')?.textContent.includes('Josh Onboarding')", 'skip-classroom flow saves before final welcome');
  await click('.onboarding-welcome__continue');
  await until("location.pathname === '/' && !document.querySelector('.onboarding-page')", 'second final welcome returns to dashboard');
  const preferences = await evaluate("fetch('/api/preferences').then(r=>r.json())");
  assert.equal(preferences.preferences.sound, true);

  // Exercise actual form navigation as well as the direct API persistence checks.
  // Successful Login keeps Dashboard; new Signup enters the setup welcome.
  await evaluate("fetch('/api/auth/logout',{method:'POST'})");
  await navigate('/login');
  await until("Boolean(document.querySelector('.auth-card form input[type=\"email\"]'))", 'login form ready');
  await input('.auth-card input[type="email"]', 'learner@example.com');
  await input('.auth-card input[type="password"]', 'safe-password');
  await click('.auth-card form button[type="submit"]');
  await until("location.pathname === '/' && !document.querySelector('.auth-card')", 'learner Login opens dashboard');
  assert.equal(await evaluate("Boolean(document.querySelector('.onboarding-welcome'))"), false, 'Login does not repeat onboarding');

  await evaluate("fetch('/api/auth/logout',{method:'POST'})");
  await navigate('/signup');
  await until("Boolean(document.querySelector('.auth-card input[autocomplete=\"name\"]'))", 'signup form ready');
  await input('.auth-card input[autocomplete="name"]', 'New Onboarding Learner');
  await input('.auth-card input[type="email"]', 'onboarding-browser-signup@example.com');
  await input('.auth-card input[type="password"]', 'safe-password');
  await click('.auth-card form button[type="submit"]');
  await until("location.pathname === '/profile/setup' && document.querySelector('.onboarding-welcome')?.dataset.welcome === 'setup'", 'new Signup opens setup welcome');
  assert.equal((await evaluate("fetch('/api/onboarding').then(r=>r.json())")).onboarding, null, 'Signup alone does not mark onboarding complete');
  await navigate('/profile/setup/complete');
  await until("location.pathname === '/profile/setup' && document.querySelector('.onboarding-welcome')?.dataset.welcome === 'setup'", 'unfinished account cannot open final welcome');
  // App's existing AnimatePresence keeps an outgoing route mounted for 220 ms.
  // Do not click a transient outgoing instance before the destination mounts.
  await wait(500);
  await click('.onboarding-welcome__continue');
  await until("document.getElementById('onboarding-nickname')?.value === 'New Onboarding Learner'", 'ready action opens new account nickname step');
  let cameraTransition = null;
  if (process.env.TALINTURO_CAMERA_TEST_IDS) {
    const { verifyCameraTransition } = await import('../../lesson/tests/camera-transition.browser.js');
    cameraTransition = await verifyCameraTransition({ cdp, evaluate, until, navigate, click, screenshot, wait, fixtures: JSON.parse(process.env.TALINTURO_CAMERA_TEST_IDS) });
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  let avatarResults = null;
  if (process.env.TALINTURO_AVATAR_TEST_IDS) {
    const { verifyAvatar } = await import('../../profile/avatar/tests/avatar.browser.js');
    avatarResults = await verifyAvatar({ cdp, evaluate, until, navigate, click, screenshot, wait, fixtures: JSON.parse(process.env.TALINTURO_AVATAR_TEST_IDS) });
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors after avatar and completion tests');
  await writeFile(join(artifacts, 'results.json'), JSON.stringify({ metrics, welcomeMetrics, breathing, cameraTransition, avatarResults, errors, saved: saved.onboarding }, null, 2));
  if (avatarResults) console.log('PASS: avatar shop, first-completion XP, repeat reward rejection, real purchase/save/unequip, three mascots at five widths, attached breathing, reduced motion and completion screens.');
  if (cameraTransition) console.log('PASS: camera intros, 7 compact layouts, focus/Escape, per-lesson copy, missing-copy fallback, camera permission error and unchanged progress; physical camera not tested.');
  console.log(`PASS: 7 steps × 5 widths and 2 compact welcomes × 8 viewport configurations; real persistence, save/read outage recovery, actual Login/Signup navigation, unfinished-account guard, exact welcome artwork, anchored breathing and reduced motion. Screenshots: ${artifacts}`);
} finally {
  socket?.close();
  if (browser && browser.exitCode === null) { browser.kill(); await Promise.race([new Promise(resolve => browser.once('exit', resolve)), wait(5000)]); }
  await vite.close();
  if (dirname(profile) === resolve(tmpdir()) && basename(profile).startsWith('talinturo-onboarding-browser-')) await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

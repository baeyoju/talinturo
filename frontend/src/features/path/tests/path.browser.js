import assert from "node:assert/strict";

export async function verifyPath({ cdp, evaluate, until, navigate, click, screenshot, wait, fixtures }) {
  const post = (url, body = {}) => evaluate(`fetch(${JSON.stringify(url)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify(body)})}).then(async r=>({status:r.status,...await r.json()}))`);
  const statuses = () => evaluate("Array.from(document.querySelectorAll('.path-stop')).map(e=>e.dataset.status)");
  const nodePositions = () => evaluate("Array.from(document.querySelectorAll('.path-node')).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})");
  const ready = () => until("document.querySelectorAll('.path-stop').length === 5 && !document.querySelector('.path-scroll [role=status]')", "five Path nodes loaded");
  const open = async () => { await navigate("/paths/" + fixtures.path); await ready(); await wait(300); };
  await navigate("/login");
  assert.equal((await post("/api/auth/login", { email: "learner@example.com", password: "safe-password" })).status, 200);
  await navigate("/paths"); await ready();
  assert.deepEqual(await statuses(), ["current", "locked", "locked", "locked", "locked"]);
  assert.equal(await evaluate("document.querySelector('.path-scenario-header h1').textContent"), "FAMILY & ME");
  const layouts = [];
  for (const width of [320, 393, 768, 1024, 1366, 1536, 1920]) {
    const height = width === 1920 ? 1080 : width === 1536 ? 730 : width >= 1024 ? 768 : 900;
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: width === 1536 ? 1.25 : 1, mobile: width <= 800 });
    await evaluate("document.activeElement.blur()");
    await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await click('.path-scenario-header');
    await evaluate("Promise.all(Array.from(document.querySelectorAll('.path-screen img,.path-navigation img')).map(i=>i.decode()))");
    await wait(200);
    const metrics = await evaluate(`(() => { const sidebar=document.querySelector('.path-navigation').getBoundingClientRect(),scroller=document.querySelector('.path-content'),area=scroller.getBoundingClientRect(),hud=document.querySelector('.path-hud').getBoundingClientRect(),header=document.querySelector('.path-scenario-header').getBoundingClientRect(),node=document.querySelector('.path-node').getBoundingClientRect();return {width:innerWidth,height:innerHeight,bodyWidth:document.documentElement.scrollWidth,bodyHeight:document.documentElement.scrollHeight,scrollHeight:scroller.scrollHeight,clientHeight:scroller.clientHeight,scrollRight:area.right,scrollOverflow:getComputedStyle(scroller).overflowY,centerOverflow:getComputedStyle(document.querySelector('.path-scroll')).overflowY,sidebarTop:sidebar.top,sidebarBottom:sidebar.bottom,sidebarWidth:sidebar.width,hudWidth:hud.width,hudTop:hud.top,headerHeight:header.height,headerFont:parseFloat(getComputedStyle(document.querySelector('.path-scenario-header h1')).fontSize),nodeWidth:node.width,nodeHeight:node.height,mascotHeight:document.querySelector('.path-companion').getBoundingClientRect().height,assets:[...document.querySelectorAll('.path-screen img,.path-navigation img')].map(i=>({src:i.getAttribute('src').startsWith('data:')?'bundled SVG':i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,ratio:i.offsetWidth/i.offsetHeight,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}))};})()`);
    assert.ok(metrics.bodyWidth <= width, "No horizontal page overflow: " + JSON.stringify(metrics));
    assert.ok(metrics.bodyHeight <= height + 1, "Body does not scroll: " + JSON.stringify(metrics));
    assert.ok(metrics.scrollHeight > metrics.clientHeight, "Main content scrolls");
    assert.ok(Math.abs(metrics.scrollRight - width) <= 1, "Scroll owner reaches the far-right viewport edge");
    assert.equal(metrics.scrollOverflow, 'auto'); assert.equal(metrics.centerOverflow, 'visible', "No center-column scrollbar");
    assert.ok(metrics.headerHeight <= 120 && metrics.headerFont <= 32, "Compact header instead of artboard sizing");
    assert.ok(metrics.nodeWidth <= 96.5 && metrics.nodeHeight <= 96.5, "Compact lesson nodes");
    assert.ok(metrics.assets.every(a => a.loaded), "Every design SVG loaded");
    assert.ok(metrics.assets.filter(a => a.width > 0 || a.height > 0).every(a => a.width > 0 && a.height > 0), "Every visible design SVG has nonzero geometry; collapsed tablet HUD is intentionally hidden");
    assert.ok(metrics.mascotHeight <= 205, "No oversized mascot");
    if (width > 800) { assert.equal(metrics.sidebarTop, 0); assert.ok(metrics.sidebarWidth <= 208.5, "Sidebar never grows with the artboard"); }
    else assert.ok(metrics.sidebarBottom <= height + 1, "Mobile navigation remains at bottom");
    if (width > 1100) {
      assert.ok(metrics.hudWidth <= 224.5, "Right panel stays compact");
      metrics.gutters = await evaluate("(() => {const h=document.querySelector('.path-scenario-header').getBoundingClientRect(),n=document.querySelector('.path-navigation').getBoundingClientRect(),a=document.querySelector('.path-hud').getBoundingClientRect();return {left:h.left-n.right,right:a.left-h.right,mapWidth:document.querySelector('.path-map').getBoundingClientRect().width};})()");
      assert.ok(Math.abs(metrics.gutters.left - 28) < 1 && Math.abs(metrics.gutters.right - 28) < 1, "Header has comfortable 28px gutters beside both panels, not nested centering gaps");
      assert.ok(metrics.gutters.mapWidth <= 760, "Wider header does not stretch the lesson map");
    }
    layouts.push(metrics);
    await evaluate("document.querySelector('.path-content').scrollTop=450"); await wait(100);
    assert.equal(await evaluate("document.querySelector('.path-navigation').getBoundingClientRect().top"), metrics.sidebarTop, "Map scrolling does not move navigation");
    if (width > 1100) assert.ok(Math.abs(await evaluate("document.querySelector('.path-hud').getBoundingClientRect().top") - metrics.hudTop) < 1, "Compact right panel stays in place while scrolling");
    await evaluate("document.querySelector('.path-content').scrollTop=0");
    if ([393, 1366, 1536, 1920].includes(width)) await screenshot("path-ready-" + width);
    const closedPositions = await nodePositions();
    const closedScrollHeight = await evaluate("document.querySelector('.path-content').scrollHeight");
    await click(".path-stop:first-child .path-node");
    await wait(100);
    assert.deepEqual(await nodePositions(), closedPositions, "Opening a card never moves any lesson circle");
    assert.equal(await evaluate("document.querySelector('.path-content').scrollHeight"), closedScrollHeight, "Hover does not resize the scrolling map");
    assert.equal(await evaluate("document.querySelector('.path-stop:first-child .path-lesson-card').hidden"), false, "Touch/click opens the orange lesson card");
    assert.equal(await evaluate("document.querySelectorAll('.path-lesson-card:not([hidden])').length"), 1, "Only one card may be open");
    assert.equal(await evaluate("(() => {const b=document.querySelector('.path-stop:first-child .button'),r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b;})()"), true, "Next locked node cannot cover the Start button");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.path-lesson-card')).backgroundColor"), "rgb(246, 98, 51)");
    assert.equal(await evaluate("document.querySelector('.path-stop:first-child .path-lesson-card .button').textContent"), "START + 15 XP");
    const card = await evaluate("(() => {const r=document.querySelector('.path-lesson-card').getBoundingClientRect(),node=document.querySelector('.path-node').getBoundingClientRect(),button=document.querySelector('.path-lesson-card .button').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,bottom:r.bottom,nodeTop:node.top,buttonHeight:button.height};})()");
    assert.ok(card.left >= 0 && card.right <= width + 1, "Hover card fits screen");
    assert.ok(card.width <= 320.5 && card.buttonHeight >= 44 && card.buttonHeight <= 48.5, "Compact card and usable button");
    assert.ok(card.top >= 0 && card.nodeTop - card.bottom >= 12, "Card floats above its circle, with a gap and no viewport clipping");
    assert.ok(card.top >= await evaluate("document.querySelector('.path-scenario-header').getBoundingClientRect().bottom") + 8, "First card stays below the scenario header, not over its title");
    await screenshot("path-card-" + width);
    await evaluate("document.querySelector('.path-node').focus();window.dispatchEvent(new Event('focus'))");
    await wait(100);
    assert.equal(await evaluate("document.querySelector('.path-lesson-card').hidden"), false, "Window focus never discards the open card");
    await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    assert.equal(await evaluate("document.querySelector('.path-lesson-card').hidden"), true, "Escape closes the card");
    await click(".path-stop:nth-child(2) .path-node");
    assert.deepEqual(await nodePositions(), closedPositions, "Changing the open card never moves lesson circles");
    assert.equal(await evaluate("document.querySelectorAll('.path-lesson-card:not([hidden])').length"), 1, "Opening another card closes the first");
    assert.equal(await evaluate("document.querySelector('.path-stop:nth-child(2) .button').disabled"), true, "Locked node has no enabled Start");
    await evaluate("document.activeElement.blur()");
  }
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await open();
  const beforeHover = await nodePositions();
  const node = await evaluate("(() => {const r=document.querySelector('.path-node').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...node });
  await until("document.querySelector('.path-lesson-card').hidden === false", "actual pointer hover opens card");
  assert.deepEqual(await nodePositions(), beforeHover, "Actual pointer hover leaves all five circles stationary");
  const secondNode = await evaluate("(() => {const r=document.querySelector('.path-stop:nth-child(2) .path-node').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...secondNode });
  await wait(200);
  assert.equal(await evaluate("document.querySelector('.path-stop:nth-child(2)').dataset.open"), 'true', "Moving between real hover targets does not flicker or close the new card");
  assert.deepEqual(await nodePositions(), beforeHover, "Hovering a different level does not reflow the map");
  // Above-node popovers may cover an earlier circle; leave the overlay before
  // aiming at that circle, rather than clicking through the visible card.
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
  assert.equal(await evaluate("document.querySelectorAll('.path-lesson-card:not([hidden])').length"), 0, "Leaving the map dismisses the overlay");
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...node });
  await until("document.querySelector('.path-lesson-card').hidden === false", "first hover card restored");
  // Cross the gap continuously, as a real pointer would, before clicking Start.
  const start = await evaluate("(() => {const r=document.querySelector('.path-stop:first-child .button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  for (let step = 1; step <= 12; step++) {
    await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: node.x + (start.x-node.x)*step/12, y: node.y + (start.y-node.y)*step/12 });
  }
  assert.equal(await evaluate("document.querySelector('.path-lesson-card').hidden"), false, "Pointer can reach Start in the above-node card without dismissal");
  await click(".path-stop:first-child .path-lesson-card .button");
  await until(`location.pathname === '/paths/${fixtures.path}/lessons/${fixtures.lessons[0]}' && Boolean(document.querySelector('.lesson-viewer-actions'))`, "Start enters existing real lesson");
  await open(); assert.equal((await statuses())[1], "locked", "Start alone never unlocks the next lesson");
  const first = fixtures.lessons[0];
  assert.equal((await post("/api/lessons/" + first + "/complete")).status, 200);
  await open(); assert.equal((await statuses())[1], "locked", "50% material progress does not unlock");
  assert.equal((await post("/api/lessons/" + first + "/practice/complete", { practice_confirmed: true, answers: ["review"] })).completed, false);
  await open(); assert.equal((await statuses())[1], "locked", "Unsuccessful practice does not unlock");
  const completion = await post("/api/lessons/" + first + "/practice/complete", { practice_confirmed: true, answers: ["lesson"] });
  assert.equal(completion.completed, true); assert.equal(completion.xp_earned, 15);
  await open(); assert.deepEqual(await statuses(), ["completed", "current", "locked", "locked", "locked"]);
  assert.ok(await evaluate("new DOMMatrix(getComputedStyle(document.querySelector('.path-stop--completed .path-node__face img')).transform).a < 0"), "Completed check keeps the Figma mirrored orientation at compact scale");
  await until("document.querySelector('.path-hud__stats > span')?.textContent === '15'", "HUD uses saved XP balance");
  await screenshot("path-saved-first-completion");
  await post("/api/auth/logout");
  await post("/api/auth/signup", { name: "Separate Path Learner", email: "separate-path@example.com", password: "safe-password" });
  await open(); assert.deepEqual(await statuses(), ["current", "locked", "locked", "locked", "locked"], "Another account does not inherit completion");

  await navigate("/paths/" + fixtures.empty); await ready();
  assert.deepEqual(await statuses(), ["unavailable", "locked", "locked", "locked", "locked"]);
  await click(".path-node"); assert.equal(await evaluate("document.querySelector('.path-lesson-card .button').disabled"), true, "Empty database lesson spaces cannot start");

  // Simulate the empty /paths response without changing published database rows.
  await click('.path-navigation a[href="/profile"]');
  await until("location.pathname === '/profile' && !document.querySelector('.path-shell')", "Profile ready for empty-list contract check");
  await evaluate(`(() => {const original=window.fetch;window.__pathEmptyFetch=original;window.fetch=function(input,options){const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname==='/api/paths')return Promise.resolve(new Response(JSON.stringify({paths:[]}),{status:200,headers:{'Content-Type':'application/json'}}));return original.call(this,input,options);};document.querySelector('a[href="/paths"]').click();})()`);
  // Keep the stub for both development StrictMode effect invocations.
  await wait(300); await ready();
  assert.deepEqual(await statuses(), ["unavailable", "locked", "locked", "locked", "locked"]);
  assert.equal(await evaluate("document.querySelector('.path-scroll').textContent.includes('Your five lesson spaces are ready')"), false, "Empty-data setup sentence is not shown to learners");
  await click('.path-node');
  assert.equal(await evaluate("document.querySelector('.path-lesson-card .button').disabled"), true, "Removing the notice never enables unavailable lessons");
  await screenshot('path-empty-list');
  await evaluate("window.fetch=window.__pathEmptyFetch;delete window.__pathEmptyFetch");
  await cdp("Fetch.enable", { patterns: [{ urlPattern: "*/api/paths/*", requestStage: "Request" }] });
  await navigate("/paths/" + fixtures.path);
  await until("document.querySelector('.path-scroll [role=alert]')?.textContent.includes('Test outage')", "API outage shows retry rather than stale unlocked nodes");
  assert.equal(await evaluate("document.querySelectorAll('.path-node').length"), 0);
  await cdp("Fetch.disable"); await click(".path-notice button"); await ready();
  assert.equal((await statuses())[1], "locked");

  // Prove saved final welcome → Path, while normal Login behavior stays unchanged.
  const saved = await evaluate(`fetch('/api/onboarding',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'Path Learner',birthdate:'2000-03-18',daily_goal_minutes:10,motivation:'Socializing',sensory_preference:'audio',class_code:''})}).then(r=>r.status)`);
  assert.equal(saved, 200);
  await navigate("/profile/setup/complete");
  await until("document.querySelector('.onboarding-welcome__bubble')?.textContent.includes('Path Learner') && !document.querySelector('.onboarding-welcome__continue').disabled", "saved final welcome ready");
  await wait(500); await click(".onboarding-welcome__continue");
  await until("location.pathname === '/paths' && document.querySelectorAll('.path-stop').length === 5", "onboarding opens Path, not Dashboard");
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.avatar-mascot__breathing')).animationName"), "none");
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await click('.path-navigation a[href="/profile"]');
  await until("location.pathname === '/profile' && !document.querySelector('.path-shell')", "Profile link restores normal workspace");
  console.log("PASS: seven compact Path layouts; far-right main scrollbar, fixed compact navigation/sticky HUD, card/node spacing, hover/tap/Escape, saved-completion unlocking, account isolation, missing-content locks, outage/retry, onboarding → Path, and reduced motion.");
  return { layouts, savedCompletion: completion, nextLesson: "Unlocked only at saved 100%", productionContent: "No application lesson records created" };
}

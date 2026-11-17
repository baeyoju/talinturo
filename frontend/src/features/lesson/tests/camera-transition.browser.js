import assert from "node:assert/strict";

// Extends the existing isolated browser harness; never records physical cameras.
export async function verifyCameraTransition({ cdp, evaluate, until, navigate, click, screenshot, wait, fixtures }) {
  await evaluate("fetch('/api/auth/logout',{method:'POST'})");
  assert.equal(await evaluate("fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'learner@example.com',password:'safe-password'})}).then(r=>r.status)"), 200);
  const cameraStub = await cdp("Page.addScriptToEvaluateOnNewDocument", { source: "window.__cameraRequests=0; navigator.mediaDevices.getUserMedia=()=>{window.__cameraRequests++;return Promise.reject(new DOMException('Camera denied by isolated test','NotAllowedError'));};" });
  const openLesson = async id => { await navigate(`/paths/${fixtures.path}/lessons/${id}`); await until("Boolean(document.querySelector('.lesson-viewer-actions button'))", "lesson ready"); };
  // PostgreSQL NUMERIC values are serialized by this API as decimal strings.
  const progress = async id => Number((await evaluate(`fetch('/api/lessons/${id}').then(r=>r.json())`)).lesson.progress);
  const metrics = [];
  try {
    await openLesson(fixtures.authored);
    assert.equal(await progress(fixtures.authored), 50);
    await click(".lesson-viewer-actions button");
    await until("Boolean(document.querySelector('.camera-transition-dialog[open]'))", "authored camera intro opens");
    assert.equal(await evaluate("document.querySelector('#camera-transition-message').textContent"), "Now that you know how to sign it, let’s use what you’ve learned to help Nanay call Tatay over. Can you do it?", "Authored Figma message arrived through the real lesson API");
    assert.equal(await evaluate("document.querySelectorAll('dialog[open]').length"), 1);
    assert.equal(await evaluate("document.querySelector('.camera-transition-dialog').matches(':modal')"), true);
    assert.equal(await evaluate("document.activeElement.id"), "camera-transition-message");
    assert.equal(await evaluate("Boolean(document.querySelector('.landmark-camera'))"), false);
    for (const viewport of [{ width: 320, height: 740 }, { width: 393, height: 852 }, { width: 768, height: 900 }, { width: 1366, height: 768 }, { width: 1536, height: 730, deviceScaleFactor: 1.25 }, { width: 1920, height: 1080 }, { width: 900, height: 500 }]) {
      await cdp("Emulation.setDeviceMetricsOverride", { deviceScaleFactor: 1, mobile: viewport.width < 600, ...viewport });
      await evaluate("document.querySelector('.camera-transition img').decode()"); await wait(100);
      const layout = await evaluate("(() => {const d=document.querySelector('.camera-transition-dialog'),img=d.querySelector('img'),r=img.getBoundingClientRect(),bubble=d.querySelector('h1'),b=bubble.getBoundingClientRect(),button=d.querySelector('button').getBoundingClientRect(),shadow=d.querySelector('.onboarding-welcome__shadow').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scroll:d.scrollHeight,client:d.clientHeight,overflow:d.scrollWidth,imageHeight:r.height,ratio:img.offsetWidth/img.offsetHeight,loaded:img.complete&&img.naturalWidth>0,src:img.getAttribute('src'),bubbleWidth:b.width,fontSize:parseFloat(getComputedStyle(bubble).fontSize),bubbleBottom:b.bottom,imageTop:r.top,imageBottom:r.bottom,shadowTop:shadow.top,buttonWidth:button.width,buttonHeight:button.height,buttonBottom:button.bottom};})()");
      assert.ok(layout.loaded && layout.src.includes("camera-transition"));
      assert.ok(layout.imageHeight >= 140 && layout.imageHeight <= 200, JSON.stringify(layout));
      assert.ok(Math.abs(layout.ratio - 409.215 / 514.073) < .005);
      assert.ok(layout.bubbleWidth <= 420.5 && layout.fontSize <= 16);
      assert.ok(layout.imageTop > layout.bubbleBottom + 12 && layout.shadowTop >= layout.imageBottom);
      assert.ok(layout.scroll <= layout.client + 1 && layout.overflow <= viewport.width, JSON.stringify(layout));
      assert.ok(layout.buttonHeight >= 48 && layout.buttonHeight <= 53 && layout.buttonBottom <= viewport.height + 1);
      if (viewport.width > 600) assert.ok(layout.buttonWidth <= 224.5);
      assert.equal(await evaluate("window.__cameraRequests"), 0);
      metrics.push(layout);
      if ([393, 1366, 1536].includes(viewport.width)) await screenshot(`camera-transition-${viewport.width}`);
    }
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.camera-transition .onboarding-welcome__breathing')).animationName"), "none");
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    const feet = await evaluate("(() => {const b=document.querySelector('.camera-transition .onboarding-welcome__breathing'),a=b.getAnimations()[0];a.pause();const samples=[0,.25,.5,.75].map(f=>{a.currentTime=3600*f;const m=new DOMMatrix(getComputedStyle(b).transform);return {x:m.e,y:m.f,bottom:b.getBoundingClientRect().bottom};});a.play();return samples;})()");
    for (const f of feet) { assert.equal(f.x, 0); assert.equal(f.y, 0); assert.ok(Math.abs(f.bottom - feet[0].bottom) < .1); }
    await cdp("Page.bringToFront");
    await evaluate("document.querySelector('#camera-transition-message').focus()");
    await cdp("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await until("!document.querySelector('.camera-transition-dialog')", "Escape returns to lesson");
    assert.notEqual(await evaluate("document.body.style.overflow"), "hidden");
    await click(".lesson-viewer-actions button");
    await until("Boolean(document.querySelector('.camera-transition-dialog[open]'))", "intro reopens once");
    await click(".camera-transition-dialog button");
    await until("Boolean(document.querySelector('.landmark-camera'))", "acknowledgement opens existing practice");
    assert.equal(await progress(fixtures.authored), 50, "Intro does not complete the lesson");
    assert.equal(await evaluate("window.__cameraRequests"), 0, "Camera does not auto-start");
    assert.equal(await evaluate("document.querySelector('.practice-confirm input').checked"), false);
    await click(".landmark-camera-placeholder button");
    await until("document.querySelector('.landmark-camera-error')?.textContent.includes('denied')", "existing camera permission error works");
    assert.equal(await evaluate("window.__cameraRequests"), 1);
    assert.equal(await progress(fixtures.authored), 50);
    await openLesson(fixtures.other);
    await click(".lesson-viewer-actions button");
    await until("Boolean(document.querySelector('.camera-transition-dialog[open]'))", "second lesson intro");
    assert.equal(await evaluate("document.querySelector('#camera-transition-message').textContent"), "Approved text for the second test lesson.");
    await click(".camera-transition-dialog button");
    await until("Boolean(document.querySelector('.landmark-camera'))", "second lesson practice");
    await openLesson(fixtures.missing);
    await click(".lesson-viewer-actions button");
    await until("Boolean(document.querySelector('.landmark-camera'))", "missing copy keeps original flow");
    assert.equal(await evaluate("Boolean(document.querySelector('.camera-transition-dialog'))"), false);
    assert.equal(await progress(fixtures.missing), 50);
    await openLesson(fixtures.unfinished);
    await click(".lesson-viewer-actions button");
    await until("document.querySelector('.lesson-viewer-actions')?.textContent.includes('Video complete')", "existing material-completion flow preserved");
    assert.equal(await evaluate("Boolean(document.querySelector('.camera-transition-dialog,.landmark-camera'))"), false);
    assert.equal(await progress(fixtures.unfinished), 50);
    return { metrics, feet, physicalCameraTested: false, progressPreserved: true };
  } finally {
    await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: cameraStub.identifier });
  }
}

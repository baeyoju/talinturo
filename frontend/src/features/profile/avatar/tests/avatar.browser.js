import assert from "node:assert/strict";

export async function verifyAvatar({ cdp, evaluate, until, navigate, click, screenshot, wait, fixtures }) {
  const state = () => evaluate("fetch('/api/avatar').then(r=>r.json()).then(p=>p.avatar)");
  const openAvatar = async () => { await navigate("/profile/avatar"); await until("Boolean(document.querySelector('.avatar-editor'))", "avatar editor ready"); };
  await openAvatar();
  assert.equal((await state()).balance, 0);
  assert.equal(await evaluate("[...document.querySelectorAll('.avatar-accessories button')].every(b=>b.disabled)"), true);
  assert.equal(await evaluate("document.querySelectorAll('.avatar-characters button').length"), 3);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.avatar-save')).backgroundColor"), "rgb(26, 53, 196)", "Figma blue overrides the existing yellow button theme");

  const lessonId = fixtures.shop[0];
  await navigate(`/paths/${fixtures.path}/lessons/${lessonId}`);
  await until("Boolean(document.querySelector('.lesson-viewer-actions button'))", "lesson loaded");
  await click(".lesson-viewer-actions button");
  await until("Boolean(document.querySelector('.lesson-quiz'))", "practice ready");
  await click(".choice-card:nth-child(2)"); await click(".practice-confirm input");
  await click(".lesson-quiz > button");
  await until("document.querySelector('.lesson-quiz')?.textContent.includes('Review the lesson')", "wrong quiz retry");
  assert.equal(await evaluate("Boolean(document.querySelector('.lesson-completion'))"), false);
  assert.equal((await state()).balance, 0);
  await click(".choice-card:first-child"); await click(".lesson-quiz > button");
  await until("document.querySelector('.lesson-completion__page')?.dataset.stage === 'commend'", "real save opens commendation");
  await until("Boolean(document.querySelector('.lesson-completion img'))", "celebration artwork loaded");
  assert.equal(await evaluate("document.querySelector('.lesson-completion').matches(':modal')"), true);
  assert.match(await evaluate("document.querySelector('#lesson-completion-title').textContent"), /Good job, Josh Onboarding/);
  assert.equal((await state()).balance, 15);
  const feedbackLayouts = [];
  const checkFeedback = async stage => {
    for (const viewport of [{ width: 320, height: 740 }, { width: 393, height: 852 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 900, height: 500 }]) {
      await cdp("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1, mobile: viewport.width < 600 });
      const layout = await evaluate("(() => {const d=document.querySelector('.lesson-completion'),b=d.querySelector('button').getBoundingClientRect(),a=d.querySelector('.avatar-mascot').getBoundingClientRect();return {width:innerWidth,height:innerHeight,buttonTop:b.top,buttonBottom:b.bottom,buttonHeight:b.height,bodyHeight:a.height,overflow:d.scrollWidth,buttonColor:getComputedStyle(d.querySelector('button')).backgroundColor};})()");
      assert.ok(layout.buttonTop >= 0 && layout.buttonBottom <= viewport.height + 1 && layout.buttonHeight >= 48, JSON.stringify(layout));
      assert.ok(layout.bodyHeight <= 203 && layout.overflow <= viewport.width, JSON.stringify(layout));
      assert.equal(layout.buttonColor, "rgb(26, 63, 191)");
      feedbackLayouts.push({ stage, ...layout });
    }
  };
  await checkFeedback("commend");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await screenshot("lesson-commend-desktop");
  await click(".lesson-completion__continue");
  await until("document.querySelector('.lesson-completion__page')?.dataset.stage === 'review'", "saved completion summary");
  assert.equal(await evaluate("document.querySelector('.lesson-completion__rewards strong').textContent"), "+15");
  assert.equal(await evaluate("document.querySelector('#lesson-completion-title').textContent"), "Lesson Complete!", "Other lessons are unfinished, so this is not a completed level");
  await checkFeedback("review");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await screenshot("lesson-review-desktop");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 393, height: 852, deviceScaleFactor: 1, mobile: true });
  await screenshot("lesson-review-mobile");
  await click(".lesson-completion__continue");
  await until(`location.pathname === '/paths/${fixtures.path}' && !document.querySelector('.lesson-completion')`, "Back to path");
  const repeat = await evaluate(`fetch('/api/lessons/${lessonId}/practice/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:['lesson'],practice_confirmed:true})}).then(r=>r.json())`);
  assert.equal(repeat.xp_earned, 0);

  await openAvatar();
  await click('[data-item="beanie"]');
  await until("document.querySelector('.avatar-message')?.textContent.includes('purchased')", "purchase saved");
  assert.deepEqual((await state()).owned, ["beanie"]);
  assert.equal((await state()).balance, 0);
  await click('[data-item="beanie"]');
  await click(".avatar-save");
  await until("document.querySelector('.avatar-message')?.textContent === 'Avatar saved.'", "equipment saved");
  assert.deepEqual((await state()).equipped, { head: "beanie" });
  // Earn remaining credits through real completion endpoints, not wallet fixtures.
  for (const id of fixtures.shop.slice(1)) {
    assert.equal((await evaluate(`fetch('/api/lessons/${id}/practice/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:['lesson'],practice_confirmed:true})}).then(r=>r.json())`)).xp_earned, 15);
  }
  for (const id of ["glasses", "headband", "propeller-cap", "charm"]) assert.equal(await evaluate(`fetch('/api/avatar/purchases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:${JSON.stringify(id)}})}).then(r=>r.status)`), 200);
  await openAvatar();
  await click('[data-item="glasses"]'); await click('[data-item="charm"]');
  const metrics = [];
  for (const character of ["algwas", "connie", "orange"]) {
    await click(`[data-character-choice="${character}"]`);
    await click(".avatar-save");
    await until("document.querySelector('.avatar-message')?.textContent === 'Avatar saved.'", "character saved");
    assert.equal((await state()).character, character);
    for (const width of [320, 393, 768, 1366, 1920]) {
      await cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
      await evaluate("Promise.all([...document.querySelectorAll('.avatar-page img')].map(i=>i.decode()))");
      await wait(100);
      const m = await evaluate("(() => {const e=document.querySelector('.avatar-preview'),r=e.getBoundingClientRect(),body=e.querySelector('.avatar-mascot__breathing'),b=body.getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,imageHeight:b.height,previewWidth:r.width,loaded:[...document.querySelectorAll('.avatar-page img')].every(i=>i.complete&&i.naturalWidth>0),accessories:body.querySelectorAll('[data-accessory]').length,src:body.querySelector('img').getAttribute('src')};})()");
      assert.ok(m.loaded && m.imageHeight >= 189 && m.imageHeight <= 196, JSON.stringify(m));
      assert.ok(m.scroll <= width, `No horizontal overflow: ${JSON.stringify(m)}`);
      assert.equal(m.accessories, 3);
      assert.ok(m.src.includes(character === "algwas" ? "algwas_idle_body" : `${character}-avatar`));
      metrics.push({ character, ...m });
      if ([393, 1366].includes(width)) await screenshot(`avatar-${character}-${width}`);
    }
    for (const hat of ["headband", "propeller-cap", "beanie"]) {
      await click(`[data-item="${hat}"]`);
      await until(`Boolean(document.querySelector('.avatar-preview [data-accessory="${hat}"]'))`, "head accessory swaps without stacking");
      assert.equal(await evaluate("document.querySelectorAll('.avatar-preview [data-accessory]').length"), 3);
      await screenshot(`avatar-${character}-${hat}`);
    }
  }
  const feet = await evaluate("(() => {const b=document.querySelector('.avatar-mascot__breathing'),a=b.getAnimations()[0];a.pause();const frames=[0,.25,.5,.75].map(f=>{a.currentTime=3600*f;const m=new DOMMatrix(getComputedStyle(b).transform);return {x:m.e,y:m.f,bottom:b.getBoundingClientRect().bottom,attached:[...b.querySelectorAll('[data-accessory]')].every(i=>i.parentElement===b)};});a.play();return frames;})()");
  for (const frame of feet) { assert.equal(frame.x, 0); assert.equal(frame.y, 0); assert.ok(frame.attached); assert.ok(Math.abs(frame.bottom - feet[0].bottom) < .1); }
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.avatar-mascot__breathing')).animationName"), "none");
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await click('[data-item="beanie"]');
  await click(".avatar-save");
  await until("document.querySelector('.avatar-message')?.textContent === 'Avatar saved.'", "unequip saved");
  assert.equal((await state()).equipped.head, undefined);
  await navigate("/profile");
  await until("document.querySelector('.profile-mascot-preview [data-character]')?.dataset.character === 'orange'", "profile displays saved character");
  await openAvatar();
  await click('[data-character-choice="algwas"]');
  await cdp("Fetch.enable", { patterns: [{ urlPattern: "*/api/avatar", requestStage: "Request" }] });
  await click(".avatar-save");
  await until("document.querySelector('.avatar-message')?.textContent.includes('Test outage')", "save error is visible");
  await cdp("Fetch.disable");
  assert.equal((await state()).character, "orange", "Failed save does not pretend persistence");
  assert.equal(await evaluate("document.querySelector('[data-character-choice=algwas]').getAttribute('aria-pressed')"), "true", "Failed save keeps the local choice for retry");
  await click(".avatar-save");
  await until("document.querySelector('.avatar-message')?.textContent === 'Avatar saved.'", "save retry succeeds");
  // Every implemented feedback pose uses the selected character and same attachments.
  for (const [index, character] of ["algwas", "connie", "orange"].entries()) {
    assert.equal(await evaluate(`fetch('/api/avatar',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({character:${JSON.stringify(character)},equipped:{head:'beanie',eyes:'glasses',charm:'charm'}})}).then(r=>r.status)`), 200);
    const id = [fixtures.authored, fixtures.other, fixtures.missing][index];
    await navigate(`/paths/${fixtures.path}/lessons/${id}`);
    await until("Boolean(document.querySelector('.lesson-viewer-actions button'))", "feedback pose lesson");
    await click(".lesson-viewer-actions button");
    await until("Boolean(document.querySelector('.camera-transition-dialog,.lesson-quiz'))", "introduction or practice");
    if (await evaluate("Boolean(document.querySelector('.camera-transition-dialog'))")) await click(".camera-transition-dialog button");
    await until("Boolean(document.querySelector('.lesson-quiz'))", "practice ready for pose test");
    await click(".choice-card:first-child"); await click(".practice-confirm input"); await click(".lesson-quiz > button");
    await until(`document.querySelector('.lesson-completion [data-character]')?.dataset.character === '${character}'`, "saved selected character on result");
    await evaluate("Promise.all([...document.querySelectorAll('.lesson-completion img')].map(i=>i.decode()))");
    assert.equal(await evaluate("document.querySelectorAll('.lesson-completion [data-accessory]').length"), 3);
    await screenshot(`lesson-feedback-${character}-equipped`);
    await click(".lesson-completion__continue"); await click(".lesson-completion__continue");
    await until(`location.pathname === '/paths/${fixtures.path}'`, "completed pose test");
  }
  return { metrics, feet, feedbackLayouts, noPhysicalCameraTest: true };
}

// Reuses the existing isolated CDP/Vite/Flask runner; no new browser dependency.
import assert from "node:assert/strict";

export async function verifyAuth({ cdp, evaluate, until, navigate, input, click, screenshot, wait }) {
  const layouts = [];
  const ready = async signup => {
    await until(`Boolean(document.querySelector('.fsl-auth')) && Boolean(document.getElementById('auth-confirmation')) === ${signup}`, "auth form ready");
    await evaluate("document.querySelector('.fsl-auth img').decode()");
    await evaluate("document.fonts.ready.then(() => true)");
  };
  const fill = async (email, password, confirmation) => {
    await input("#auth-email", email); await input("#auth-password", password);
    if (confirmation !== undefined) await input("#auth-confirmation", confirmation);
  };
  const submit = () => click(".fsl-auth__submit");
  await navigate("/login"); await ready(false);
  for (const page of ["login", "signup"]) {
    await navigate(`/${page}`); await ready(page === "signup");
    assert.equal(await evaluate("Boolean(document.querySelector('.auth-side,.auth-brand,input[autocomplete=name]'))"), false, "No invented marketing panel or Signup name field");
    assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.fsl-auth label')).map(e=>e.childNodes[0].textContent)"), page === "signup" ? ["Email", "Password", "Confirm Password"] : ["Email", "Password"]);
    assert.equal((await evaluate("document.querySelector('.fsl-auth__google').textContent")).trim(), page === "signup" ? "SIGN UP WITH GOOGLE" : "LOG IN WITH GOOGLE");
    assert.equal(await evaluate("document.querySelector('.fsl-auth__forgot a').getAttribute('href')"), "/forgot-password");
    for (const width of [320, 393, 768, 1366, 1440, 1920]) {
      const height = width >= 1920 ? 1080 : width >= 1366 ? 768 : 900;
      await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      await wait(120);
      const result = await evaluate(`(() => {
        const image=document.querySelector('.fsl-auth img'), art=image.getBoundingClientRect(), bubble=document.querySelector('.fsl-auth__bubble').getBoundingClientRect(), shadow=document.querySelector('.fsl-auth__shadow').getBoundingClientRect(),card=document.querySelector('.fsl-auth__card').getBoundingClientRect(),button=document.querySelector('.fsl-auth__submit'),b=button.getBoundingClientRect();
        return { width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,imageLoaded:image.complete&&image.naturalWidth>0,imageSource:image.getAttribute('src'),imageHeight:art.height,imageRatio:image.offsetWidth/image.offsetHeight,imageBottom:art.bottom,imageTop:art.top,bubbleBottom:bubble.bottom,shadowTop:shadow.top,cardLeft:card.left,artRight:art.right,buttonWidth:b.width,buttonHeight:b.height,buttonColor:getComputedStyle(button).backgroundColor,formFont:getComputedStyle(document.querySelector('.fsl-auth__card')).fontFamily,bubbleFont:getComputedStyle(document.querySelector('.fsl-auth__bubble')).fontFamily,surface:getComputedStyle(document.querySelector('.public-shell')).backgroundColor };
      })()`);
      assert.ok(result.scrollWidth <= width, `No horizontal overflow: ${JSON.stringify(result)}`);
      assert.equal(result.surface, "rgb(255, 255, 255)");
      assert.ok(result.imageLoaded && result.imageSource.includes(`auth-${page}`), "Exact local Figma artwork loaded in its design slot");
      assert.ok(result.imageHeight >= 155 && result.imageHeight <= 195, `Compact mascot: ${JSON.stringify(result)}`);
      assert.ok(Math.abs(result.imageRatio - 292.645 / 372.602) < .005, "SVG proportions preserved");
      assert.ok(result.imageTop > result.bubbleBottom + 12 && result.shadowTop >= result.imageBottom - .1, "Bubble/art/shadow stay separate");
      if (width > 700) assert.ok(result.cardLeft > result.artRight, "Desktop has the mascot beside the form");
      assert.ok(result.buttonHeight >= 48 && result.buttonWidth > 200, "Touch-friendly primary action");
      assert.equal(result.buttonColor, "rgb(26, 63, 191)", "Public yellow theme cannot override Figma blue");
      assert.match(result.formFont, /Open Sans/); assert.match(result.bubbleFont, /Fredoka/);
      layouts.push({ page, ...result });
      if ([393, 1366, 1920].includes(width)) await screenshot(`auth-${page}-${width}`);
    }
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.fsl-auth__breathing')).animationName"), "none");
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    const breathing = await evaluate(`(() => {const e=document.querySelector('.fsl-auth__breathing'),a=e.getAnimations()[0];a.pause();const frames=[0,.25,.5,.75].map(f=>{a.currentTime=3600*f;const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.e,y:m.f,bottom:e.getBoundingClientRect().bottom};});a.play();return frames;})()`);
    for (const frame of breathing) { assert.equal(frame.x, 0); assert.equal(frame.y, 0); assert.ok(Math.abs(frame.bottom - breathing[0].bottom) < .1, "Existing breathing remains anchored"); }
  }

  // Route changes clear credentials and mismatch errors, rather than reusing them.
  await evaluate("performance.clearResourceTimings()");
  await fill("new-auth@example.com", "safe-password", "different-password");
  await submit(); await until("document.querySelector('#auth-error')?.textContent.includes('do not match')", "confirmation mismatch");
  assert.equal(await evaluate("location.pathname"), "/signup");
  assert.equal(await evaluate("performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/api/auth/signup').length"), 0, "Mismatched passwords never reach Signup API");
  await click(".fsl-auth__switch a"); await ready(false);
  assert.equal(await evaluate("document.querySelector('#auth-password').value"), "");
  assert.equal(await evaluate("Boolean(document.querySelector('#auth-error'))"), false);
  await input("#auth-email", "invalid-email");
  assert.equal(await evaluate("document.querySelector('form').checkValidity()"), false);
  await fill("learner@example.com", "incorrect-password");
  await submit(); await until("Boolean(document.querySelector('#auth-error')) && !document.querySelector('.fsl-auth__submit').disabled", "wrong login error");
  assert.equal(await evaluate("location.pathname"), "/login");
  // Leave a real failing Login while pending; its response must not leak an
  // error into the new Signup form. Navigation aborts the old request.
  await cdp("Network.enable");
  await cdp("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: -1, uploadThroughput: -1 });
  await submit(); await click(".fsl-auth__switch a"); await ready(true);
  await wait(1000);
  assert.equal(await evaluate("Boolean(document.querySelector('#auth-error'))"), false, "Old route request cannot set current form errors");
  await cdp("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await click(".fsl-auth__switch a"); await ready(false);
  await fill("learner@example.com", "safe-password");
  await submit(); await until("location.pathname === '/' && !document.querySelector('.fsl-auth')", "real Login opens Dashboard");
  assert.equal((await evaluate("fetch('/api/auth/me').then(r=>r.json())")).user.name, "Alex Rivera", "Login preserves the existing account name");
  await evaluate("fetch('/api/auth/logout',{method:'POST'})");

  await navigate("/signup"); await ready(true);
  await fill("auth-alignment@example.com", "safe-password", "safe-password");
  await evaluate("performance.clearResourceTimings()");
  await evaluate("document.querySelector('.fsl-auth__submit').click();document.querySelector('.fsl-auth__submit').click()");
  await until("location.pathname === '/profile/setup' && Boolean(document.querySelector('.onboarding-welcome'))", "real Signup opens setup welcome");
  const account = await evaluate("fetch('/api/auth/me').then(r=>r.json())");
  assert.equal(await evaluate("performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/api/auth/signup').length"), 1, "Double click sends exactly one Signup request");
  assert.equal(account.user.name, "Learner");
  assert.equal((await evaluate("fetch('/api/onboarding').then(r=>r.json())")).onboarding, null, "Signup does not claim onboarding is finished");
  // Exercise the UI nickname step before saving through its unchanged endpoint.
  await wait(500); await click(".onboarding-welcome__continue");
  await until("document.getElementById('onboarding-nickname')?.value === 'Learner'", "temporary name enters real onboarding");
  const saved = await evaluate(`fetch('/api/onboarding',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'Josh Auth Check',birthdate:'2000-03-18',daily_goal_minutes:10,motivation:'Socializing',sensory_preference:'audio',class_code:''})}).then(async r=>({status:r.status,...await r.json()}))`);
  assert.equal(saved.status, 200); assert.equal(saved.user.name, "Josh Auth Check");
  await evaluate("fetch('/api/auth/logout',{method:'POST'})");
  await navigate("/signup"); await ready(true);
  await fill("auth-alignment@example.com", "safe-password", "safe-password"); await submit();
  await until("Boolean(document.querySelector('#auth-error')) && !document.querySelector('.fsl-auth__submit').disabled", "duplicate email rejected by real API");
  assert.equal(await evaluate("location.pathname"), "/signup");

  // The existing runner intercepts selected requests with a controlled 503.
  await cdp("Fetch.enable", { patterns: [{ urlPattern: "*/api/auth/signup", requestStage: "Request" }] });
  await fill("outage@example.com", "safe-password", "safe-password"); await submit();
  await until("document.querySelector('#auth-error')?.textContent.includes('Test outage')", "API outage is not a pretend success");
  assert.equal(await evaluate("document.querySelector('#auth-email').value"), "outage@example.com");
  await cdp("Fetch.disable");
  await cdp("Fetch.enable", { patterns: [{ urlPattern: "*/api/health", requestStage: "Request" }] });
  await click(".fsl-auth__google");
  await until("document.querySelector('#auth-error')?.textContent.includes('Test outage')", "Google preflight outage gives retry guidance");
  assert.equal(await evaluate("location.pathname"), "/signup");
  await cdp("Fetch.disable");

  await navigate("/instructor/sign-in");
  await until("Boolean(document.querySelector('.instructor-auth-page'))", "instructor portal retained");
  assert.equal(await evaluate("Boolean(document.querySelector('.fsl-auth'))"), false);
  await input('.auth-card input[type="email"]', "teacher@example.com");
  await input('.auth-card input[type="password"]', "safe-password");
  await click('.auth-card button[type="submit"]');
  await until("location.pathname === '/instructor' && !document.querySelector('.auth-card')", "instructor real Login retained");
  console.log("PASS: 12 auth layouts; exact SVGs, compact anchored breathing, reduced motion, form validation, real Login/Signup and nickname persistence, duplicate email, API/Google preflight outages, instructor Login.");
  return { layouts, login: "Dashboard", signup: "setup welcome", temporaryName: account.user.name, savedNickname: saved.user.name, googleOAuth: "Preflight outage tested; provider authorization not exercised" };
}

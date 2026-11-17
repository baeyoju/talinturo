# Five-lesson Path — frontend handoff

## Current sizing correction — November 18, 2026

The first map copied too much of the 1920px artboard scale. Its sidebar grew to
323px, the right panel occupied 28.8%, nodes were 150px wide and the card could
reach 568px. Scrolling the center section placed a scrollbar between the map and
HUD. These were layout/sizing mistakes, not a data or mascot-animation problem.

- Navigation is now **208px**, with 14px labels / 46px rows; the desktop HUD is
  **224px**, with 40px counters. Tablet counters move above the map, and phones
  retain compact bottom navigation.
- Header text is 30px desktop / 26px mobile; header height is about 100–112px.
  Current/completed nodes are **96×92px**, locked nodes about **76px**.
  Cards are capped at **320px**, with 44px desktop / 48px mobile buttons.
- The header fills the central column, with **28px desktop gutters** beside the
  navigation and activity panel. Nested centered width caps no longer add blank
  margins; the lesson map itself remains capped at 760px. Compact controls,
  sidebars and mobile spacing are unchanged.
- Removed the non-Figma “Your five lesson spaces are ready” empty-data sentence
  from the learner view. Empty spaces still cannot start; loading/error guidance
  and saved-completion locks remain intact.
- All nodes use fixed 176px rows, whether their card is open or closed. The card
  floats above its circle with a downward pointer; it never expands a row or
  reflows the map. A transparent pointer bridge keeps Start reachable across the
  12px gap. A fixed 180px top inset reserves space for the first popover even
  while closed, keeping it off the scenario header. Hover highlighting no longer
  translates the circle's face either.
- **`.path-content` is the sole main-content scroll owner**, reaching the far-right
  viewport edge. `.path-scroll` is now just a content section, not an inner scroller.
  Navigation stays fixed; the compact desktop HUD is sticky. Route/reload resets
  target the correct scroll owner.
- Hover opens from the actual node, not from the whole blank lesson row.
- Existing Figma SVGs, five-node model, API requests, completion rules, onboarding
  destination, canonical mascot assets and animation definitions are unchanged.

This correction touched only `styles/path-map.css`,
`components/PathLessonNode.jsx`, `pages/LearningPathsPage.jsx`,
`tests/path.browser.js` and this handoff. It preserves the earlier uncommitted
Login/Signup and Path work rather than resetting or staging it.

Actual checks: **43/43 focused Node tests passed**, seven-layout browser acceptance
passed at 320/393/768/1024/1366/1536/1920px, including 1536×730 with device scale 1.25
(display-scale emulation, not physical hardware/browser-zoom certification).
Assertions cover compact size limits, far-right scroll ownership, fixed navigation,
sticky HUD, unobstructed Start, at least 12px card-to-own-node clearance, unchanged
positions of all five nodes and scroll height on opening/switching cards, real
hover changes, saved-completion locks, auth isolation, outage/retry, onboarding
navigation and reduced motion. Desktop/mobile screenshots were visually reviewed.
The spacing follow-up also checks both desktop header gutters at 28px and the
760px map cap. An empty-list response test confirms the setup sentence is absent
while unavailable Start buttons remain disabled. All seven layouts and 43 Node
tests passed again; the production build passed with existing chunk-size warnings.
The first new empty-list test exposed its own one-shot fetch-stub/StrictMode race;
keeping that test stub active through both effect invocations resolved the failure.
The stationary-hover follow-up passed all seven widths, including exact node
position/scroll-height comparisons before and after opening/switching cards,
first-card/header separation, leaving the overlay, and pointer travel into Start.
An initial browser assertion still assumed it could hover through an overlapping
popover; it now leaves the overlay before targeting the covered circle. Final
desktop/mobile screenshots were reviewed; 43 Node tests and the build also pass.
Artifacts: temporary `talinturo-onboarding-proof-HQZxO3` folder; no test content was
added to the application database. No commit or push.

## Current behavior

- URL: `http://127.0.0.1:5173/paths` (signed-in learner).
  `/paths/<path_id>` renders the same map for an explicit published path.
- Final saved-onboarding welcome → **LET'S GO! → `/paths`**.
  Normal Login still opens Dashboard; Dashboard code is unchanged.
- Five lesson circles, white surface, orange scenario header, gray locked nodes,
  orange lesson card with pointer and white Start action. Desktop navigation stays
  fixed while main content scrolls at the far-right edge. Mobile uses bottom navigation.
- Hover, keyboard focus or tap opens the card. Escape/outside clicks dismiss it.
  Only one card can be open; the active card sits above other lesson nodes.
- Existing `AvatarMascot` is reused, including saved character/accessories and its
  existing anchored breathing/reduced-motion behavior. No artwork or keyframes edited.

Read-only Figma: `f9Frea5LnNoBccqGk04kiQ`, `/Path` section `1028:6041`:
Path `552:1555`, hover/card `1028:5496`, scenario header `552:1631`, locked node
`552:1592`; mobile reference `882:3255`. Downloaded icon SVGs are in
`frontend/src/assets/path/`, retaining their original intrinsic dimensions.
Dynamic progress rings reflect saved progress rather than copying Figma's fixed
20% example. Existing canonical mascot artwork takes precedence over inconsistent
Figma character exports, as previously instructed.

## Data, locks and limitations

- `GET /api/paths` supplies published paths; `/paths` selects the first returned
  path in the API's existing order. There is no invented path-choice UI.
- `GET /api/paths/<id>` supplies titles, lesson IDs, ordered content and this
  account's progress. The first **five** records are displayed; records are never
  deleted/reordered/overwritten. Future additional-path/lesson navigation is separate.
- A real lesson with material and all previous lessons at saved **100%** becomes
  current. Later unfinished lessons stay locked. Finished lessons remain reviewable.
  Starting, hovering, partial progress and failed practice do not count as completion.
  Invalid IDs/progress never unlock a lesson. An optional server `locked: true`
  is respected; the current API does not provide that field.
- Start opens the **existing** lesson URL; this page never calls a completion API
  or awards XP. The `+ 15 XP` copy describes the already implemented first-completion
  reward, not an immediate reward for clicking Start. Review never promises another reward.
- No production paths/lessons were found in the inspected local database. Explicit
  user approval: show five spaces now, but disable Start until real published
  lesson material exists. The first empty-space title is Figma's example; the other
  empty spaces say Lesson 2–5. These are not new teaching content or fake database rows.
- Missing API data is not replaced with fake completion. Errors remove startable
  nodes and offer retry. Leaving/re-entering the route, refreshing, or returning
  from a hidden tab reloads real records. Ordinary window/keyboard focus does not
  reload/discard an open card.
- `/api/avatar` supplies saved character/equipment and **spendable XP balance**.
  `/api/progress` supplies earned achievement count, streak and rolling seven days
  of saved activity. Missing values are `—`, never invented Figma sample numbers.
  No star-total API exists, so its value stays `—`. This is not claimed to be a
  new total-earned-XP or sign-accuracy metric. The tablet secondary HUD is collapsed.
  Existing API limitation: `weekly_activity` contains practice attempts, while
  `current_streak` also includes completed lessons. The activity list's accessible
  name/tooltip discloses this; a unified daily-streak timeline needs backend work.
- **Frontend locks are navigation guidance, not server authorization.** The existing
  lesson API still allows direct lesson URLs/requests without enforcing sequential
  prerequisites. Server-side prerequisite enforcement needs a separate approved
  backend change if the team requires tamper-resistant progression. This batch
  does not silently change the group's completion APIs or recognition rules.
- Existing lesson completion is the group's saved material/practice flow, not
  proof of a correctly performed FSL gesture. Recognition integration is unchanged.

## Files

Implementation: `frontend/src/features/path/path-model.js`,
`pages/LearningPathsPage.jsx`, `pages/LearningPathDetailsPage.jsx`,
`components/PathNavigation.jsx`, `components/PathLessonNode.jsx`,
`styles/path-map.css`, and eleven exact Figma SVGs under `src/assets/path/`.
Integration: `frontend/src/app/{App.jsx,routes.jsx}` and
`frontend/src/components/layout/Sidebar.jsx`. Path-only shell/navigation styling
does not redesign other routes. The two existing Path exports share one map.

Tests: `frontend/src/features/path/tests/{path.test.js,path.browser.js}`.
Existing onboarding browser runner gains a focused Path branch and updated final
welcome destination assertions. `backend/verify_onboarding.py --path` adds five
test lessons plus an empty test path only to its uniquely named disposable DB.
No production Python, migration, model, package, camera or mascot file changed.

```powershell
# From frontend:
node --test src/features/path/tests/path.test.js src/features/auth/tests/auth.test.js src/features/onboarding/tests/onboarding.test.js src/features/lesson/tests/camera-transition.test.js src/features/profile/avatar/tests/avatar.test.js
npm run build
# From repo root, with local PostgreSQL running:
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --browser-only --path
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --browser-only --auth
```

The helper applies the existing additive local onboarding/avatar migrations,
creates/removes its own disposable test database and keeps screenshots/results
under a printed temporary folder. Never run the destructive legacy API fixture
against application/shared data. No real learner records are used in screenshots.

Manual review: sign in, open `/paths`, scroll the map to all five circles, hover/tap
a circle, check card dismissal and disabled future lessons. With real authored
lessons published, complete the existing lesson flow, return to Path and confirm
only the next lesson unlocks. Check desktop/mobile and reduced motion. Physical
Android/laptop performance and real-camera FSL correctness are not claimed here.

Known deferred issue: the earlier full onboarding browser suite reported ~10px
welcome overflow at 320×900. This separate Path batch does not claim it fixed.
Existing build chunk-size warnings remain. No automatic commit/push.

## Actual verification results

- **43/43 focused Node tests passed**, including 12 new Path model cases.
- Path browser acceptance passed at **320, 393, 768, 1024, 1366 and 1920px**:
  five nodes, main-only scrolling, fixed/bottom navigation, exact icon loading and
  geometry, card hover/tap/keyboard/Escape, one-card-only layering, unobstructed
  Start, real lesson navigation, saved-completion unlocking, partial/failed attempt
  locks, account isolation, missing material, outage/retry, onboarding → Path,
  existing reduced motion, and normal Profile workspace restoration.
- Login/Signup browser regression passed its 12 layouts and real auth/onboarding
  persistence checks after the Path changes. No uncaught browser errors in either run.
- `npm run build` passed (594 modules), plus JavaScript syntax/diff checks.
  Existing large main/ExcelJS chunk warnings remain; no dependencies added.
- Desktop/mobile screenshots were visually reviewed. Review caught overlapping
  open cards and the exported completed check's mirrored orientation; both were
  fixed and regression-checked. Window-focus tracing also caught an interaction
  refresh that discarded the open card; returning from a hidden tab now refreshes,
  ordinary focus does not.
- All test accounts, content, completions and rewards stayed in disposable
  PostgreSQL databases, removed by the helper. No production lesson data added.
  No physical-camera/device validation or production FSL correctness is claimed.

Final Path artifacts: temporary `talinturo-onboarding-proof-mypMOf` folder printed
by the runner; final auth regression: `talinturo-onboarding-proof-kJuM21`.
These generated screenshots/results are not repository files.

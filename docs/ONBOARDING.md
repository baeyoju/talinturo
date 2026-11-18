# Onboarding and mascot integration — November 17, 2026

> Current navigation update (November 18): the final saved-onboarding welcome now
> opens **Path (`/paths`)**, per the developer's latest decision. Normal Login
> still opens Dashboard. Older Dashboard-after-onboarding notes below describe
> the previous checkpoint. See [PATH_MAP.md](PATH_MAP.md) for the five-circle Path,
> API integration, tests, approved missing-content spaces and backend limitations.

## Scope and design

Working React + Flask/PostgreSQL onboarding at `/profile/setup`:
Setup welcome (I'M READY) → Nickname → Birthdate → Goal → Motivation → Class Code
→ Sensory → Finish/save → Final welcome (LET'S GO!) → Dashboard.
The final welcome has its own authenticated route, `/profile/setup/complete`.

Read-only design source: Figma `KMwUKqMfiLCiQuBHcMbHnV`, Main page `160:514`.
Desktop frames: `723:1963`, `723:1970`, `723:1977`, `723:1984`, `723:1991`,
`723:1998`, `723:2005`. Mobile references: `234:455`, `238:225`, `243:696`,
`243:855`, `310:753` (named Motivation but contains Class Code), `247:952`, `247:1026`.

- White surface, blue depth buttons, yellow progress line, orange upcoming steps,
  rounded fields/cards, centered mascot, summary, Back/Continue/Finish actions.
- The seven desktop form steps have no invented speech bubble; mobile uses the
  actual Figma prompts. Both welcome screens have the speech bubbles in Figma.
- The developer explicitly chose the **desktop motivation options at every width**:
  Just for fun!, Family Communication, Socializing. Mobile's School Preparation
  variant is intentionally not mixed into the database vocabulary.
- Finish, not Sensory, is the current step on the final screen.
- Original canonical Algwas body artwork is reused without the separate hearing-aid
  layer. Intrinsic artwork is approximately 139 × 191 CSS pixels, with 3.6-second
  bottom-anchored breathing. No positioning transforms are animated.
- All ages use the same prompts. No character selector, Kids/Standard toggle,
  developer controls, correctness judgments, rewards, or recognition are added.
- Connie and the separate global loading overlay are unchanged. The inspected
  onboarding frames use Algwas; a second character is not invented for this flow.
- This is a responsive implementation, not a fixed 1920px canvas. Exact Figma
  text/structure/colors are followed; the developer requested modest mascot sizing.
- Welcome references are `1053:5857` and `1069:5966`, with each screen's exact
  exported Algwas SVG, gray ground shadow, white surface and blue depth button.
  Welcome artwork preserves intrinsic proportions and is capped at about 193px
  tall on desktop (173px on phones, 145px on short landscape screens), instead
  of expanding to the Figma artboard's 402px. Bubble width is capped at 420px with
  16px text; desktop primary action is 224 × 48px, and mobile keeps a 52px
  full-width touch target. The footer is compact rather than artboard-height.
  Its separate breathing wrapper
  reuses the existing 3.6-second/2.8% anchored cycle; the original seven-step
  mascot artwork, CSS, animations and global Connie loader were not changed.
- Developer-approved copy: use the database nickname, never the design's
  placeholder SHRIMPY, and use TALINTURO for everyone until the team defines any
  Kids age policy. No automatic age classification or message variant was added.

## Database setup

For a **new, empty** database, first run `sql/talinturo_schema.sql`. For a current
database, preserve its data and apply only:

```text
migrations/003_user_onboarding.sql
```

Run it in pgAdmin Query Tool connected to the intended database, then restart Flask.
The migration is additive/repeatable; it creates `user_onboarding` and does not
rewrite existing accounts, lesson data, preferences, or memberships. Startup now
checks that onboarding storage exists. This development batch applied it only to
the confirmed local `talinturo_local` database, not any group/shared database.

`user_onboarding` stores birthdate, 5/10/15-minute daily goal, motivation, sensory
preference, optional classroom ID, completion time and update time. Nickname uses
the existing account name. The existing `learning_goal` and `learner_type` meanings
are preserved; a time goal is not silently stored as a motivation or an age category.

## API and flow

- `GET /api/onboarding`: current account's saved onboarding, or `null` if unfinished.
- `POST /api/onboarding/classroom`, `{ "code": "..." }`: checks an active classroom
  for a learner account. It **does not enroll** or save onboarding yet.
- `PUT /api/onboarding`: validates and saves the entire form in **one transaction**.

```json
{
  "nickname": "Josh",
  "birthdate": "2000-03-18",
  "daily_goal_minutes": 10,
  "motivation": "Family Communication",
  "class_code": "",
  "sensory_preference": "haptics"
}
```

An empty class code means no new enrollment. A valid code uses the existing
`classroom_memberships` table and is checked again on Finish. Repeated Finish is
idempotent. Skipping does not remove any previously joined classrooms.

Audio Cues maps to the existing sound preference; Haptics Only switches sound off.
Theme, reduced motion and weekly-summary settings are preserved. **Saving the
haptics preference does not implement or guarantee hardware vibration or audio
effects throughout the app.** Those producers are outside this onboarding batch.

All endpoints require an authenticated active account and use the session user ID,
not a client-supplied user ID. Validation rejects future/impossible birthdays,
unsupported options, invalid codes, and non-learner enrollment. No automatic
child/adult inference, sign grading, or progress rewards occur.

The frontend reloads saved values from PostgreSQL on re-entry and navigates to the
final welcome only after the server confirms a successful save. That welcome
reads the saved onboarding record again, including on refresh, and LET'S GO!
opens the role's home (Dashboard for learners). A missing completion record
returns to the setup welcome; a read failure shows a retry, not a fake success.
Failed form reads/saves
show retry guidance; failed saves keep the current answers. No birthdate or draft
is written into localStorage. **Before Finish, answers are memory-only and a refresh
discards the unfinished draft.** Existing signup already routes into onboarding;
this batch does not impose a new onboarding gate on all existing user accounts.

## Organization and verification

UI lives in `frontend/src/features/onboarding/{pages,components,styles,tests}`,
with pure form rules in `onboarding-model.js`. Shared Button and existing routes,
API adapter, settings and app shell are reused. Only the onboarding route omits
the dashboard header/sidebar/footer. No framework/package additions.

### Auth flow verification and approved navigation

The onboarding test scripts use `.js`, consistent with the frontend package's
existing `"type": "module"`. The Python browser helper and commands below use
the same filenames; no dependency files need renaming.

Read-only prototype verification in Figma file `KMwUKqMfiLCiQuBHcMbHnV` found:

- Populated Signup `1008:8586` links to setup welcome `1053:5857`, whose action
  opens Nickname `723:1963`.
- Populated Finish `1015:9915` links to the second welcome `1069:5966`, whose
  action opens `552:1555` (`Desktop / Path`). Despite matching frame names, these
  are separate before/after-onboarding welcome screens.
- Login's inspected populated frame `1008:8336` and Design 2 Login `780:2516`
  have no submit navigation destination; the auth flow annotation explicitly
  says submit wiring needs confirmation. Login-to-home is not a confirmed
  prototype link.

Both welcome screens are now implemented. Login still opens Dashboard (`/`),
explicitly confirmed by the developer. Signup opens the setup welcome, then
I'M READY opens Nickname without changing the existing Signup/OAuth entry URL.
Finish saves to PostgreSQL before opening the final welcome. LET'S GO! opens
Dashboard rather than Figma's Path destination: this uses the developer's agreed
home flow and does not redesign either Dashboard or Learning paths.

The final welcome is read-only: no extra save, XP, rewards, consent or completion
inference occurs. The current authentication/session guard remains in force.
The camera introduction is now prepared as described below. The subsequent avatar
shop and saved-result screens are documented in [AVATAR_SHOP.md](AVATAR_SHOP.md).
They add migration `004_avatar_shop.sql`, three approved characters, transactional
ownership/equipment and the developer-approved 15 XP per first lesson completion.
The original welcome/onboarding artwork and animation definitions remain unchanged.
Other missing screens are not claimed complete.

### Camera transition: authored lesson text, no invented scenarios

The compact Figma Transition to Camera (`1042:5627`) is a full-screen step inside
the existing lesson view, not a separate browser route or a new camera pipeline.
It uses its exact local Algwas SVG, the approved <=200px rendered mascot size,
420px/16px bubble, 224×48px desktop action and 52px mobile touch target. Original
mascot animation definitions, artwork files, camera tracking and scores are unchanged.

The developer chose to wait for written stories rather than automatically invent
messages. The existing `GET /api/lessons/<id>` already preserves optional practice
content, so lesson authors/backend developers can supply this JSONB field:

```json
{
  "practice": {
    "camera_intro": "The reviewed introduction for this specific lesson."
  }
}
```

Merge that field into the lesson's existing `content` rather than replacing its
sections or quiz questions. The Nanay/Tatay example belongs only in an appropriate
reviewed Family & Me lesson; the frontend does not infer it from a title, ID or sign.
No application lesson data or schema was changed to enable this presentation.

Flow: existing material progress permits Proceed to practice → if a nonblank
`content.practice.camera_intro` string exists, show the introduction → I CAN DO IT!
opens the existing combined quiz/camera practice. Without authored text, preserve
the previous practice flow. The button does not start the camera, check the practice
confirmation, submit answers, award XP or mark a sign/lesson correct or complete.

A native full-screen modal keeps background controls inert and keyboard focus
inside this step. Escape returns to the current lesson; scrolling is restored on
dismissal/unmount. Camera permission is still requested by the existing Turn on
camera button. Reduced-motion settings and the anchored 3.6-second breathing cycle
are reused, not replaced. The upcoming Figma learning-screen redesign is separate.

Focused implementation:

- `frontend/src/features/lesson/components/LessonCameraTransition.jsx`
- `frontend/src/features/lesson/styles/camera-transition.css`
- `frontend/src/features/lesson/camera-transition.js`
- `frontend/src/assets/mascots/camera-transition.svg`
- `frontend/src/features/lesson/pages/LessonViewerPage.jsx` (integration only)

Verification reuses the existing isolated browser harness. The optional
`--camera-intro` flag adds four lessons only to its disposable database: two
different authored introductions, missing copy, and unfinished material. No test
lessons are added to `talinturo_local`. The browser uses a permission-denied stub,
not a physical camera or mocked recognition results. Commands:

```powershell
# From frontend:
node --test src/features/onboarding/tests/onboarding.test.js src/features/lesson/tests/camera-transition.test.js
# From repository root, PostgreSQL running:
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --onboarding-only --browser --camera-intro
```

Actual camera-transition batch results: 19/19 combined focused Node tests and
12/12 onboarding API tests passed. The browser regression passed the existing
onboarding flow plus authored camera introductions through the real API, seven
compact viewport configurations, keyboard focus/Escape, distinct lesson copy,
missing-copy fallback, reduced motion, anchored feet, no camera auto-start,
permission-denied handling and preserved progress. The initial test comparisons
were corrected for the API's existing decimal-string progress values and native
Escape key codes; no production API behavior was changed. Production build and
syntax/diff checks passed; the existing large-chunk warning remains. The full
legacy backend suite was not rerun. Physical webcam/Android testing and live
MediaPipe inference were not performed; the permission test deliberately blocks
hardware access. No production lesson introductions have been populated.

Camera test files: `frontend/src/features/lesson/tests/camera-transition.test.js`
and `camera-transition.browser.js`. `backend/verify_onboarding.py` and the existing
onboarding browser runner were extended only to enable these optional isolated
fixtures/checks. No production Python API, camera module, model, package file,
scenario engine, XP logic or original mascot animation definition was edited.

From `frontend`:

```powershell
node --test src/features/onboarding/tests/onboarding.test.js
npm run build
```

From the repo root, with PostgreSQL running and the existing local `.env`:

```powershell
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --onboarding-only --browser
```

The helper refuses non-loopback or non-`talinturo_local` configurations. It applies
the additive migration to that local database, creates a random disposable test
database, applies the schema/migration there, and runs real API/browser tests.
It removes only its own disposable database afterward. Existing account data is
not used for tests or truncated. It uses installed Brave by default; set
`TALINTURO_BROWSER_EXE` for another installed Chromium browser. Screenshots/results
are retained under the temporary `talinturo-onboarding-proof-*` folder it reports.
Never run `backend/test_app.py` against an application/shared database: its fixture
truncates data. No screenshots contain actual learner records; they use test fixtures.

For the full existing suite plus onboarding, omit `--onboarding-only`. Three legacy
failures were reproduced against untouched HEAD in memory, without checking out files:

1. Preference test expects `light`; the existing schema defaults to `system`.
2. Initialization test expects no user after an uncommitted TRUNCATE, but the next
   request uses another connection after that transaction rolls back on close.
3. Google-link test indexes a dict-row result with `[0]`, causing `KeyError: 0`.

These are not reported as passing and were not changed to broaden this batch.
The production build also warns about a >500 kB application chunk; no unrelated
bundling refactor was performed. Browser emulation is not physical Android testing.

## Manual review / team handoff

### Actual verification results

- 13/13 focused Node tests passed, including the two Figma messages, saved nickname
  and shared TALINTURO brand without invented progress or age tiers.
- 12/12 new onboarding API tests passed using real disposable PostgreSQL storage.
- Browser passed all seven steps at 320/393/768/1440/1920px, including real
  classroom-code checking/enrollment, no-classroom flow, impossible-date rejection,
  retained answers on Back/save error, retry, duplicate Finish clicks, restored
  values after logout/login, sound preference saving, anchored breathing and OS
  reduced motion. Both welcome screens are checked at eight viewport configurations,
  including 1366×768, short landscape, and 1536×730 with 1.25 device pixel ratio
  (display-scale emulation, not a claim of physical-device or browser-zoom testing).
  Checks cap the rendered mascot/bubble/button sizes and reject vertical scrolling,
  including asset decoding/proportions, no overlap/overflow, real Login/Signup
  navigation, saved-nickname refresh/retry, and the unfinished-account redirect.
  Desktop/mobile screenshots were inspected.
- Production build, JavaScript/Python syntax and `git diff --check` passed.
- Earlier full backend suite: 36/39 passed; the same three unrelated cases above
  fail on untouched HEAD. It was not rerun for the two welcome screens; only
  the 12 onboarding API tests were rerun. The full suite is **not** green.
- Only the local additive migration was applied to application storage. Disposable
  test databases were removed after verification; no existing application accounts
  or lesson data were edited by testing. Physical-device testing was not performed.

### Exact source changes

Modified:

- `backend/app.py`
- `backend/test_app.py`
- `frontend/src/app/App.jsx`
- `frontend/src/app/routes.jsx`
- `frontend/src/features/onboarding/pages/ProfileSetupPage.jsx`
- `frontend/src/features/onboarding/index.js`

Added:

- `backend/verify_onboarding.py`
- `migrations/003_user_onboarding.sql`
- `docs/ONBOARDING.md`
- `frontend/src/assets/mascots/algwas_idle_body.svg` (canonical copy)
- `frontend/src/assets/mascots/onboarding-active.svg` (Figma)
- `frontend/src/assets/mascots/onboarding-complete.svg` (Figma)
- `frontend/src/assets/mascots/onboarding-chevron.svg` (Figma)
- `frontend/src/features/onboarding/components/OnboardingMascot.jsx`
- `frontend/src/features/onboarding/components/OnboardingStepper.jsx`
- `frontend/src/features/onboarding/pages/OnboardingWelcomePage.jsx`
- `frontend/src/features/onboarding/styles/onboarding-welcome.css`
- `frontend/src/assets/mascots/onboarding-welcome-setup.svg` (Figma)
- `frontend/src/assets/mascots/onboarding-welcome-complete.svg` (Figma)
- `frontend/src/features/onboarding/onboarding-model.js`
- `frontend/src/features/onboarding/styles/onboarding.css`
- `frontend/src/features/onboarding/tests/onboarding.test.js`
- `frontend/src/features/onboarding/tests/onboarding.browser.js`

1. Restart Flask after applying migration; keep Vite running.
2. Sign in and open `http://127.0.0.1:5173/profile/setup`.
3. Confirm the setup welcome; choose I'M READY. Walk all seven steps; use a real
   local classroom code or I'm not enrolled.
4. Finish and confirm the final welcome uses the saved nickname. Refresh it,
   then choose LET'S GO! and confirm Dashboard. Sign out/in and reopen onboarding;
   choose I'M READY and confirm saved values restore. Normal Login skips welcomes.
5. Compare desktop/mobile sizing; enable OS or app reduced motion.
6. Never commit `.env`, database credentials, virtual environments or generated builds.

No automatic commit/push, shared-database migration, ML changes, or roadmap changes.

## Subsequent checkpoint — avatar and saved lesson feedback

See [AVATAR_SHOP.md](AVATAR_SHOP.md) for exact files, Figma nodes, persistence,
tests and limitations. Apply **both** migration 003 and 004 before restarting the
current Flask code; the local verification helper now checks/applies both additive
migrations. Avatar editor: `http://127.0.0.1:5173/profile/avatar`, also linked from
Profile. Commendation/review are steps inside existing lesson URLs, shown only
after the existing quiz/practice endpoint confirms completion. They do not judge
FSL gestures. Camera and authored-introduction behavior remain unchanged.

No XP is retroactively added to old completed lessons and no star rewards are
invented. Existing combined quiz/camera remains; a separate Watch/Learn/Sign redesign
is not yet implemented. Connie and Orange have their supplied idle artwork, not
invented celebration expressions. No commit or push was made.

## Login / Signup alignment — current handoff

Updated design source: Figma `f9Frea5LnNoBccqGk04kiQ`, white Desktop Login
`723:1951` and Signup `723:1957`. Both now include Google buttons. Inspected mobile
references `234:314` / `234:352` still omit Google; the responsive implementation
keeps the current desktop Google action available on small screens as well.

- Preview: `http://127.0.0.1:5173/login` and `http://127.0.0.1:5173/signup`.
  Sign out first to view them without authenticated workspace navigation.
- Replaced learner marketing headings/panel/logo with the white form card,
  Algwas greeting bubble, gray shadow, blue depth action, Figma field labels,
  switch links, divider and white Google action. Instructor sign-in, the marketing
  landing page, password-reset pages and backend auth contracts are unchanged.
- Signup has Email, Password and Confirm Password, not an extra name field.
  Explicit user decision: create the real database account with temporary name
  **Learner**; existing onboarding replaces it with the saved nickname. Confirmation
  is checked locally and is not sent to the backend. Login opens Dashboard;
  Signup opens the existing setup welcome. No fake authentication or completion.
- Exact local Figma SVGs retain their intrinsic 292.645 × 372.602 dimensions.
  Separate wrappers scale them to about 190px tall on desktop / 160px on mobile,
  preserving the user's compact-mascot requirement rather than the large artboard
  character size. Uses existing `onboarding-breathe` (3.6s), bottom anchored,
  with OS/app reduced-motion overrides. No existing animation keyframes changed.
- Responsive form: desktop side-by-side, small screens stacked without the desktop
  card border. Short desktop viewports use 56px instead of 70px fields; mobile
  fields stay 50px with readable 16px input text. These are deliberate responsive
  adaptations, not a claim of fixed-artboard pixel identity at every viewport.
- Failed requests remain on the form with a real error; no fabricated success.
  Duplicate submissions are blocked; switching routes clears credentials/errors
  and aborts the old request. Google retains the existing `/api/auth/google`
  redirect and health preflight. Actual provider consent requires manual testing
  with the team's OAuth configuration; an absent configuration is not supplied here.

Implementation files:

- `frontend/src/features/auth/pages/AuthPage.jsx` (learner/instructor dispatch)
- `frontend/src/features/auth/pages/LearnerAuthPage.jsx`
- `frontend/src/features/auth/auth-model.js`
- `frontend/src/features/auth/styles/auth.css`
- `frontend/src/assets/mascots/auth-login.svg`, `auth-signup.svg`

Verification files: `frontend/src/features/auth/tests/auth.test.js`,
`auth.browser.js`; existing onboarding browser runner updated for the new fields,
with a focused auth-only branch. `backend/verify_onboarding.py --auth` selects that
branch; production Python code is unchanged. No packages or database migrations added.

Reproduce from the repo root (the Python helper uses disposable test databases):

```powershell
cd frontend
node --test src/features/auth/tests/auth.test.js src/features/onboarding/tests/onboarding.test.js src/features/lesson/tests/camera-transition.test.js src/features/profile/avatar/tests/avatar.test.js
npm run build
cd ..
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --browser-only --auth
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --onboarding-only
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --avatar-only
```

Focused browser acceptance covers 12 layouts (two pages × 320/393/768/1366/1440/1920px),
local SVGs/proportions, compact anchored breathing, reduced motion, real learner and
instructor Login, real Signup, temporary name and saved nickname persistence,
confirmation mismatch, duplicate email, API/Google preflight outages, stale route
responses and double-submit protection. Screenshots/results are printed in the
runner's temporary artifact folder, not committed. Headless Chromium testing is
not physical-device or actual Google-account validation.

Actual results for this batch: **31/31 focused Node tests passed**, **12/12 onboarding
API and 12/12 avatar API tests passed**, focused auth browser run passed with no
uncaught browser errors, `npm run build` passed (580 modules; existing large-chunk
warning), JavaScript syntax checks and `git diff --check` passed. Desktop and mobile
screenshots were visually reviewed. Test-created accounts were confined to the
helper's disposable databases, which were removed after each run.

The previously observed full-suite welcome vertical-overflow failure at 320 × 900
remains deferred at the user's request. The auth-only browser run does **not** assert
that this older failure is fixed; do not report the full onboarding browser suite
as green based on it. Existing build chunk-size warnings also remain outside scope.
No camera, recognition, scenario, mascot reaction, XP or roadmap changes.
No automatic commit or push.

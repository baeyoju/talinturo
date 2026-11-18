# Avatar and saved lesson feedback — November 17, 2026

## Scope and approvals

Group React/Flask/PostgreSQL repository, branch `feature/mascot-integration`.
This is not the old vanilla/FastAPI recognition draft. No model, camera module,
scenario grading or existing mascot keyframe was changed. No packages installed.

The developer approved three characters (Algwas, Connie and the orange mascot)
and **15 XP for a lesson's first completion**. The orange character has no confirmed
name in the inspected library; the UI calls it Orange rather than inventing one.
Messages are shared for all ages. No hearing aid is equipped by default. The
optional Figma Charm is a purchased accessory, never a default layer.

Read-only Figma file: `KMwUKqMfiLCiQuBHcMbHnV`.

- Avatar picker: `1079:5267`, two columns, sky-blue preview, three swatches,
  blue Save action and accessory cards. The developer explicitly identified these
  as three different mascots, not three recolored dogs.
- Connie: library `166:717`; orange mascot: `584:1591`. Algwas reuses the
  canonical unaided `algwas_idle_body.svg`. No artwork was recolored or redrawn.
- Commendation: `742:2340`, exact exported Algwas/confetti composition.
- Review: `707:2055`, white background, completion heading, feedback and rewards.
  Only real XP is displayed. **No star-awarding rule exists**, so the design's
  sample +3 stars and three earned stars are not fabricated.
- New mascots stay approximately 190px tall; existing 3.6-second bottom-anchored
  breathing is reused. Responsive layout scale is separate from breathing.
  App and OS reduced-motion settings disable the new continuous animation.

The existing app header/sidebar/footer/theme are retained, not rebuilt in this
batch. This is not a claim that every existing page matches Figma. The separate
Watch/Learn/Sign screen redesign remains unfinished; its current combined
quiz/camera view is preserved. The previously completed authored camera intro
still requires `lesson.content.practice.camera_intro`; no story is invented.

## URLs and flow

- `http://127.0.0.1:5173/profile` → Edit avatar.
- `http://127.0.0.1:5173/profile/avatar` → character, purchases, equip/unequip, Save.
- Existing lesson URL `/paths/<pathId>/lessons/<lessonId>` → existing lesson/practice
  → **only after successful server save** Good job → Continue → saved reward
  summary → Back to my path. These are full-screen modal steps, not separate URLs.
- The summary says Lesson Complete unless the real path API confirms **all**
  published lessons complete. Only then does it say Level Complete.

These celebrations acknowledge the existing **quiz + manual practice confirmation**
endpoint. They are **not camera-based FSL Correct/Wrong judgments**. A wrong quiz
retains existing retry guidance without completing the lesson or awarding XP.
Tracking, no-hand states, confidence, Start/Continue clicks and camera permission
errors do not generate this success event. Existing production safeguards remain.

## Migration and persistence

Apply `migrations/003_user_onboarding.sql`, then
`migrations/004_avatar_shop.sql` to the intended database and restart Flask.
For a fresh database, apply `sql/talinturo_schema.sql` before both migrations.
The verification helper applied these additive migrations only to local
`talinturo_local`; existing users and lesson rows were not rewritten.

New tables:

| Table | Stored data |
| --- | --- |
| `lesson_xp_rewards` | One immutable 15-XP credit per user/lesson |
| `avatar_purchases` | Owned item and server-set 15-XP cost, unique per user/item |
| `user_avatars` | Saved character and equipped head/eyes/charm slots |

Balance = earned credits minus purchases, calculated from PostgreSQL, not browser
storage or client-submitted prices. New users start with 0 XP. Previously completed
lessons are **not retroactively credited**. Repeating them does not earn XP. A lesson
completed after this migration earns 15 XP once, even across retries or concurrent
tabs. Existing learner progress is not reset to manufacture a reward.

Purchases and completion credits lock the same account row for transaction safety.
Duplicate purchases return existing ownership without charging again. Another
account's ownership cannot be supplied in a request. Unequipping doesn't refund or
remove ownership. Three head items share one head slot; glasses and charm can be
worn alongside a head item. Buying does not silently equip: select Owned, then Save.

API (all authenticated):

- `GET /api/avatar`: read-only character, equipment, ownership, balance, catalog.
- `POST /api/avatar/purchases`, `{ "item_id": "beanie" }`: atomic purchase.
- `PUT /api/avatar`, `{ "character": "connie", "equipped": { "head": "beanie" } }`.
- Existing `POST /api/lessons/<id>/practice/complete`: same quiz/confirmation rules,
  with server-controlled `xp_earned: 15` on first completion or `0` on repeats.

Catalog prices/slots are authoritative in `backend/app.py`; the frontend does not
maintain a second price list. There is no client-facing grant-XP endpoint.
Do not delete credited lessons/reward rows manually: foreign-key cascades affect
the ledger. The existing backend exposes no lesson-delete endpoint; any future
deletion policy must preserve earned XP and purchase history.

## Frontend organization and reuse

`frontend/src/features/profile/avatar/`:

- `AvatarPage.jsx`: API loading, local selection, purchase/save actions, guidance.
- `AvatarMascot.jsx`: shared artwork/attachment renderer, used in profile and results.
- `avatar-model.js`: pure equip toggle and acknowledged-result validation.
- `avatar.css`: scoped responsive shop/renderer styles.
- `ProfilePage.jsx`: Edit avatar navigation and saved-character preview.
- `tests/avatar.test.js`, `tests/avatar.browser.js`: deterministic/browser checks.

`frontend/src/features/lesson/components/LessonCompletion.jsx` and
`styles/lesson-completion.css`: accessible modal feedback steps. Integration is in
`pages/LessonViewerPage.jsx`; pending/stale responses are guarded by lesson and
session identity. Closing practice unmounts the existing camera component normally.
`frontend/src/app/routes.jsx` adds `/profile/avatar` and supplies the saved nickname.

All accessories are children of the **same breathing wrapper** as their character.
Coordinates are explicitly keyed by character/pose; head changes replace rather
than stack. SVG root geometry stays intact and artwork remains transparent.
This supports these implemented poses, **not a guarantee for arbitrary future
artwork**. Future poses must define and visually check their attachment anchors.
Connie and Orange currently use their available idle artwork on feedback screens;
no new character-specific celebration pose was invented. Existing fixed-Algwas
onboarding screens and the independent Connie loading overlay are unchanged.

## Verification commands

From `frontend`:

```powershell
node --test src/features/onboarding/tests/onboarding.test.js src/features/lesson/tests/camera-transition.test.js src/features/profile/avatar/tests/avatar.test.js
npm run build
```

From repository root, using the existing local PostgreSQL/.env:

```powershell
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --avatar-only
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --onboarding-only
.\backend\.venv\Scripts\python.exe backend\verify_onboarding.py --browser-only --camera-intro --avatar
```

The helper creates and removes a uniquely named disposable database. All fixture
truncation, lesson content and credit-earning/purchases stay there, never in actual
learner accounts. It resets fixtures between API and browser checks; the initial
combined browser run exposed leftover API-test ownership, not a production
purchase defect. Temporary screenshots/results are not added to the repository.
Do not run `backend/test_app.py` against application/shared data.

At the current checkpoint: 25/25 focused Node tests and 9/9 avatar API tests passed.
The browser regression passed real save/purchase/unequip, repeated-credit rejection,
three characters at five widths, attachment/breathing/reduced motion, saved profile,
lesson feedback, and the existing onboarding/camera-intro regressions. Screenshot
review found the global yellow-button theme overriding the Figma blue action and
a clipped footer on short viewports; scoped fixes and new assertions were added
and require the final rerun recorded in the handoff. The build passed with the
existing >500kB chunk warning. No physical webcam or Android device was tested.
The full legacy backend suite is not reported green; see ONBOARDING.md for its
three previously reproduced baseline failures.

## Commit decision

No commit/push has been made. Commit only reviewed source, tests, exact assets,
migrations and docs together; the backend now requires both migrations.
Never commit `.env`, credentials, PostgreSQL dumps, `node_modules`, `.venv`, `dist`
or temporary screenshots/profiles. Those generated/environment paths are already
ignored. Review this batch separately from earlier onboarding/camera changes, but
do not omit their shared dependencies when making the first checkpoint commit.

// JavaScript ES modules use the frontend package's existing "type": "module".
import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, GOALS, MOTIVATIONS, initialValues, validateStep, onboardingPayload, onboardingWelcomeCopy } from '../onboarding-model.js';

const complete = () => ({ ...initialValues('Josh'), year: '2000', month: '3', day: '18', goal: 10, motivation: 'Family Communication', noClass: true, sensory: 'haptics' });
test('Figma order ends at Finish and uses the developer-approved desktop choices', () => {
  assert.deepEqual(STEPS, ['Nickname', 'Birthdate', 'Goal', 'Motivation', 'Class Code', 'Sensory', 'Finish']);
  assert.deepEqual(MOTIVATIONS.map(option => option.value), ['Just for fun!', 'Family Communication', 'Socializing']);
});
test('a complete flow validates all steps', () => {
  for (let step = 0; step < 7; step++) assert.equal(validateStep(step, complete(), '2026-11-17'), '');
});
test('blank and overlong nicknames cannot proceed', () => {
  for (const nickname of ['', '  ', 'a'.repeat(71)]) assert.ok(validateStep(0, { ...complete(), nickname }));
});
test('invalid, missing, and future birthdates cannot proceed', () => {
  for (const changes of [{ day: '31', month: '2' }, { year: '2001', month: '2', day: '29' }, { year: '' }, { month: '0' }, { day: '0' }, { year: '2027' }, { year: '20e2' }]) {
    assert.ok(validateStep(1, { ...complete(), ...changes }, '2026-11-17'));
  }
});
test('leap day and today are valid, independent of browser timezone', () => {
  assert.equal(validateStep(1, { ...complete(), year: '2000', month: '2', day: '29' }, '2026-11-17'), '');
  assert.equal(validateStep(1, { ...complete(), year: '2026', month: '11', day: '17' }, '2026-11-17'), '');
});
test('choices must be selected from the documented vocabulary', () => {
  assert.ok(validateStep(2, { ...complete(), goal: 7 }));
  assert.ok(validateStep(3, { ...complete(), motivation: 'School Preparation' }));
  assert.ok(validateStep(5, { ...complete(), sensory: '' }));
  for (const option of GOALS) assert.equal(validateStep(2, { ...complete(), goal: option.value }), '');
});
test('classroom choice is explicit, and code is normalized for the API', () => {
  assert.ok(validateStep(4, { ...complete(), noClass: false, classCode: ' ' }));
  const values = { ...complete(), noClass: false, classCode: ' sunny24 ' };
  assert.equal(validateStep(4, values), '');
  assert.equal(onboardingPayload(values).class_code, 'SUNNY24');
});
test('payload contains only the fields owned by onboarding', () => {
  assert.deepEqual(onboardingPayload(complete()), { nickname: 'Josh', birthdate: '2000-03-18', daily_goal_minutes: 10, motivation: 'Family Communication', sensory_preference: 'haptics', class_code: '' });
});
test('saved API values restore the form after refresh', () => {
  const saved = { ...onboardingPayload(complete()), completed_at: '2026-11-17T12:00:00+00:00' };
  const restored = initialValues('Old name', saved);
  assert.deepEqual(onboardingPayload(restored), onboardingPayload(complete()));
  assert.equal(restored.noClass, true);
});
test('new account has no invented date, preference, or enrollment', () => {
  const fresh = initialValues('Josh');
  assert.equal(fresh.year, ''); assert.equal(fresh.goal, null); assert.equal(fresh.noClass, false); assert.equal(fresh.sensory, '');
});

test('setup welcome uses the Figma message and action without a pretend nickname', () => {
  assert.deepEqual(onboardingWelcomeCopy('setup'), { message: "Ready to learn Filipino Sign Language? Let's set up your learning space together!", action: "I'M READY" });
});

test('final welcome uses the saved nickname and the approved shared brand', () => {
  const copy = onboardingWelcomeCopy('complete', ' Josh Onboarding ');
  assert.equal(copy.message, 'Welcome to TALINTURO, Josh Onboarding, let’s start learning!');
  assert.equal(copy.action, "LET'S GO!");
  assert.doesNotMatch(copy.message, /KIDS|SHRIMPY/);
});

test('welcome does not invent a nickname or award progress', () => {
  const copy = onboardingWelcomeCopy('complete');
  assert.equal(copy.message, 'Welcome to TALINTURO, let’s start learning!');
  assert.deepEqual(Object.keys(copy).sort(), ['action', 'message']);
});

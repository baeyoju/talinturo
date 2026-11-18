import assert from "node:assert/strict";
import test from "node:test";
import { characterNames, toggleAccessory, lessonCompletion } from "../avatar-model.js";

test("three approved characters; no invented name for orange", () => {
  assert.deepEqual(Object.keys(characterNames), ["algwas", "connie", "orange"]);
});
test("unowned items never equip", () => {
  assert.deepEqual(toggleAccessory({}, { id: "glasses", slot: "eyes" }, []), {});
});
test("owned item equips, unequips and replaces only its slot", () => {
  const owned = ["beanie", "headband", "glasses"];
  const original = { eyes: "glasses", head: "beanie" };
  const replaced = toggleAccessory(original, { id: "headband", slot: "head" }, owned);
  assert.deepEqual(replaced, { eyes: "glasses", head: "headband" });
  assert.equal(original.head, "beanie");
  assert.deepEqual(toggleAccessory(replaced, { id: "headband", slot: "head" }, owned), { eyes: "glasses" });
});
const saved = { success: true, completed: true, lesson_id: 7, progress: 100, score: 100, xp_earned: 15 };
test("completion needs an acknowledged matching lesson save", () => {
  assert.deepEqual(lessonCompletion(saved, "7"), { lessonId: "7", xp: 15, score: 100 });
  assert.equal(lessonCompletion(saved, 8), null);
});
test("errors, quiz predictions, partial progress and fabricated rewards cannot celebrate", () => {
  for (const result of [null, {}, { sign: "NO", confidence: 1 }, { ...saved, completed: false }, { ...saved, success: false }, { ...saved, score: 50 }, { ...saved, progress: 50 }, { ...saved, xp_earned: 999 }, { ...saved, xp_earned: undefined }]) assert.equal(lessonCompletion(result, 7), null);
});
test("a confirmed retry can show completion but not another reward", () => {
  assert.equal(lessonCompletion({ ...saved, xp_earned: 0 }, 7).xp, 0);
});

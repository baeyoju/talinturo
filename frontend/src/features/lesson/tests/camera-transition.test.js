import test from "node:test";
import assert from "node:assert/strict";
import { cameraIntroduction } from "../camera-transition.js";

test("uses the lesson's authored camera introduction", () => {
  assert.equal(cameraIntroduction({ content: { practice: { camera_intro: "  Approved lesson message.  " } } }), "Approved lesson message.");
});
test("does not guess a story from HELLO or Family & Me labels", () => {
  assert.equal(cameraIntroduction({ title: "HELLO", path_title: "Family & Me", content: {} }), "");
});
test("missing lesson or content keeps the original practice flow", () => {
  for (const lesson of [undefined, null, {}, { content: null }, { content: { practice: null } }]) assert.equal(cameraIntroduction(lesson), "");
});
test("blank text is not an introduction", () => {
  assert.equal(cameraIntroduction({ content: { practice: { camera_intro: "  \n " } } }), "");
});
test("malformed introduction values are ignored safely", () => {
  for (const camera_intro of [null, 42, false, {}, ["message"]]) assert.equal(cameraIntroduction({ content: { practice: { camera_intro } } }), "");
});
test("different lessons retain their own copy", () => {
  for (const camera_intro of ["Lesson A", "Lesson B"]) assert.equal(cameraIntroduction({ content: { practice: { camera_intro } } }), camera_intro);
});

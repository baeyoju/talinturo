import test from "node:test";
import assert from "node:assert/strict";
import { buildPathNodes, pathIsMap } from "../path-model.js";

const lesson = (id, progress = 0) => ({ id, title: "Saved lesson " + id, progress, content: { sections: [{ title: "Fixture" }] } });
test("five empty spaces do not create fake lessons or enabled starts", () => {
  const nodes = buildPathNodes();
  assert.equal(nodes.length, 5); assert.deepEqual(nodes.map(n => n.status), ["unavailable", "locked", "locked", "locked", "locked"]);
  assert.ok(nodes.every(n => n.id === null && !n.canStart && n.progress === 0));
});
test("only the first unfinished lesson is current; API ordering is preserved", () => {
  const nodes = buildPathNodes([lesson(31), lesson(7), lesson(10), lesson(6), lesson(80)]);
  assert.deepEqual(nodes.map(n => n.id), [31, 7, 10, 6, 80]);
  assert.deepEqual(nodes.map(n => n.status), ["current", "locked", "locked", "locked", "locked"]);
});
test("decimal-string saved completion unlocks the next lesson", () => {
  const nodes = buildPathNodes([lesson(1, "100.00"), lesson(2, "35.50"), lesson(3)]);
  assert.deepEqual(nodes.slice(0, 3).map(n => n.status), ["completed", "current", "locked"]);
  assert.ok(nodes[0].canStart && nodes[1].canStart); assert.equal(nodes[1].progress, 35.5);
});
test("started flags, high partial progress and client-like fields cannot unlock", () => {
  const nodes = buildPathNodes([{ ...lesson(1, 99.99), started: true, completed: true, clicked: true }, lesson(2)]);
  assert.equal(nodes[1].status, "locked");
});
test("missing material blocks Start without pretending to be completed", () => {
  const nodes = buildPathNodes([{ id: 1, progress: 0, content: {} }, lesson(2)]);
  assert.equal(nodes[0].status, "unavailable"); assert.equal(nodes[0].canStart, false); assert.equal(nodes[1].status, "locked");
});
test("video material uses the existing lesson contract", () => assert.ok(buildPathNodes([{ id: 1, video_url: "https://example.com/lesson.mp4" }])[0].canStart));
test("malformed progress never supplies completion evidence", () => {
  for (const progress of [null, true, {}, [], NaN, Infinity, "Infinity", "not a number", 150, -1]) {
    const nodes = buildPathNodes([lesson(1, progress), lesson(2)]);
    assert.equal(nodes[0].progress, 0); assert.equal(nodes[1].status, "locked");
  }
});
test("missing and malformed IDs cannot start or unlock lessons", () => {
  for (const id of [null, "1", 0, -1, 1.5]) {
    const nodes = buildPathNodes([{ ...lesson(id, 100) }, lesson(2)]);
    assert.equal(nodes[0].canStart, false); assert.equal(nodes[1].status, "locked");
  }
});
test("a server lock cannot be overridden by client prerequisite inference", () => assert.equal(buildPathNodes([{ ...lesson(1), locked: true }])[0].status, "locked"));
test("all five completed records remain reviewable, never invent another lesson", () => {
  const nodes = buildPathNodes(Array.from({ length: 6 }, (_, i) => lesson(i + 1, 100)));
  assert.equal(nodes.length, 5); assert.ok(nodes.every(n => n.status === "completed" && n.canStart));
});
test("non-array responses are safe empty spaces at the model boundary", () => {
  for (const value of [null, {}, "bad"]) assert.equal(buildPathNodes(value).filter(n => n.canStart).length, 0);
});
test("map-only shell excludes lesson, dashboard, instructor and unrelated URLs", () => {
  for (const path of ["/paths", "/paths/", "/paths/12"]) assert.equal(pathIsMap(path), true);
  for (const path of ["/", "/paths/12/lessons/2", "/profile/setup", "/instructor", "/paths/not-an-id"]) assert.equal(pathIsMap(path), false);
});

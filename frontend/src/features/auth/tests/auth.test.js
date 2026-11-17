import test from "node:test";
import assert from "node:assert/strict";
import { learnerAuthPayload, signupPasswordError } from "../auth-model.js";

test("Signup uses the approved temporary name, not an invented nickname", () => {
  assert.deepEqual(learnerAuthPayload("signup", " learner@example.com ", "safe-password"), { email: "learner@example.com", password: "safe-password", name: "Learner" });
});
test("Login does not overwrite a saved name or send a role override", () => {
  assert.deepEqual(learnerAuthPayload("login", " learner@example.com ", "safe-password"), { email: "learner@example.com", password: "safe-password" });
});
test("Passwords are not trimmed and confirmation is not sent to the API", () => {
  const payload = learnerAuthPayload("signup", "a@example.com", " safe-password ");
  assert.equal(payload.password, " safe-password ");
  assert.equal("confirmation" in payload, false);
});
test("Signup rejects mismatched confirmations", () => assert.match(signupPasswordError("safe-password", "other-password"), /do not match/));
test("Signup accepts matching passwords within the existing backend limits", () => {
  for (const size of [8, 16, 128]) assert.equal(signupPasswordError("p".repeat(size), "p".repeat(size)), "");
});
test("Signup rejects short and overlong passwords", () => {
  for (const size of [0, 7, 129]) assert.match(signupPasswordError("p".repeat(size), "p".repeat(size)), /8 and 128/);
});

// Signup collects the real nickname later, in the existing saved onboarding flow.
export function signupPasswordError(password, confirmation) {
  if (password.length < 8 || password.length > 128) return "Use between 8 and 128 characters for your password.";
  if (password !== confirmation) return "Your passwords do not match. Please check them.";
  return "";
}

export function learnerAuthPayload(mode, email, password) {
  return { email: email.trim(), password, ...(mode === "signup" ? { name: "Learner" } : {}) };
}

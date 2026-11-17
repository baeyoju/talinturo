// Optional lesson-authored text already carried by GET /api/lessons/:id.
// No title matching, invented stories, age variants or correctness decisions.
export function cameraIntroduction(lesson) {
  const message = lesson?.content?.practice?.camera_intro;
  return typeof message === "string" ? message.trim() : "";
}

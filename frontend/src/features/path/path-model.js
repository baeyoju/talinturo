export const PATH_LESSON_LIMIT = 5;

export function lessonHasMaterial(lesson) {
  return Boolean((Array.isArray(lesson?.content?.sections) && lesson.content.sections.length)
    || (typeof lesson?.video_url === "string" && lesson.video_url.trim()));
}

// The API owns ordering and progress. Never infer completion from a click,
// elapsed time, a classifier prediction, localStorage or a missing record.
export function buildPathNodes(lessons = []) {
  const records = Array.isArray(lessons) ? lessons : [];
  let prerequisitesComplete = true;
  return Array.from({ length: PATH_LESSON_LIMIT }, (_, index) => {
    const lesson = records[index];
    const available = Number.isSafeInteger(lesson?.id) && lesson.id > 0;
    const rawProgress = lesson?.progress;
    const numeric = (typeof rawProgress === "number" || (typeof rawProgress === "string" && rawProgress.trim())) ? Number(rawProgress) : 0;
    const progress = available && Number.isFinite(numeric) && numeric >= 0 && numeric <= 100 ? numeric : 0;
    const complete = available && progress === 100;
    const locked = !complete && (!prerequisitesComplete || lesson?.locked === true);
    const hasMaterial = available && lessonHasMaterial(lesson);
    const status = complete ? "completed" : locked ? "locked" : hasMaterial ? "current" : "unavailable";
    const node = { id: available ? lesson.id : null, number: index + 1,
      title: typeof lesson?.title === "string" && lesson.title.trim() ? lesson.title : index === 0 ? "Politely call your father for dinner" : `Lesson ${index + 1}`,
      progress, status, canStart: available && hasMaterial && !locked,
      started: lesson?.started === true || progress > 0 };
    prerequisitesComplete = prerequisitesComplete && complete;
    return node;
  });
}

export function pathIsMap(pathname) {
  return /^\/paths(?:\/\d+)?\/?$/.test(pathname);
}

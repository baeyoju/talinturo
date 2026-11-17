export const characterNames = { algwas: "Algwas", connie: "Connie", orange: "Orange" };

// Local preview only. Ownership and prices are always checked again by Flask.
export function toggleAccessory(equipped, item, owned) {
  if (!item || !owned.includes(item.id)) return { ...equipped };
  const next = { ...equipped };
  if (next[item.slot] === item.id) delete next[item.slot];
  else next[item.slot] = item.id;
  return next;
}

export function lessonCompletion(result, lessonId) {
  if (result?.success !== true || result.completed !== true ||
      String(result.lesson_id) !== String(lessonId) || Number(result.progress) !== 100 ||
      Number(result.score) !== 100 || ![0, 15].includes(result.xp_earned)) return null;
  return { lessonId: String(lessonId), xp: result.xp_earned, score: 100 };
}

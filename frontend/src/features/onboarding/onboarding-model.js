// Shared copy: no age-based message variants or recognition judgments.
export const STEPS = ["Nickname", "Birthdate", "Goal", "Motivation", "Class Code", "Sensory", "Finish"];
export const PROMPTS = ["Ano ang pangalan mo?", "Kailan ang kaarawan mo?", "Gaano ka kadedikado?", "Bakit gusto mong matuto?", "Itanong kay teacher ang Class Code", "Alin ang mas gusto mo?", "Yay! Tapos na. Enjoy!"];
export const GOALS = [
  { value: 5, label: "Casual - 5 min/day", description: "I’m just casually learning." },
  { value: 10, label: "Regular - 10 min/day", description: "I’m adding this to my routine!" },
  { value: 15, label: "Serious - 15 min/day", description: "I’m very dedicated." },
];
// Desktop set explicitly approved by the developer for every screen size.
export const MOTIVATIONS = [
  { value: "Just for fun!", label: "Just for fun!", description: "For the community and my advocacy!" },
  { value: "Family Communication", label: "Family Communication", description: "I want to understand my loved one better!" },
  { value: "Socializing", label: "Socializing", description: "I want to meet new friends!" },
];
export const SENSORY = [
  { value: "audio", label: "Audio Cues", description: "Sound on!" },
  { value: "haptics", label: "Haptics Only", description: "Visual and vibrations." },
];
export const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Shared brand approved pending a team-defined Kids age range; never infer an age tier.
export function onboardingWelcomeCopy(stage, nickname = "") {
  if (stage === "setup") return { message: "Ready to learn Filipino Sign Language? Let's set up your learning space together!", action: "I'M READY" };
  const name = nickname.trim();
  return { message: `Welcome to TALINTURO${name ? `, ${name}` : ""}, let’s start learning!`, action: "LET'S GO!" };
}

export function todayInManila() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map(key => parts.find(part => part.type === key).value).join("-");
}
export function initialValues(name = "", saved = null) {
  const [year = "", month = "", day = ""] = saved?.birthdate?.split("-") || [];
  return { nickname: saved?.nickname || name, year, month, day, goal: saved?.daily_goal_minutes || null,
    motivation: saved?.motivation || "", sensory: saved?.sensory_preference || "",
    classCode: saved?.class_code || "", noClass: Boolean(saved && !saved.class_code) };
}
export function birthdateISO(values) {
  return `${String(values.year).padStart(4, "0")}-${String(values.month).padStart(2, "0")}-${String(values.day).padStart(2, "0")}`;
}
export function validateStep(step, values, today = todayInManila()) {
  if (step === 0 && (!values.nickname.trim() || values.nickname.trim().length > 70)) return "Enter a nickname between 1 and 70 characters.";
  if (step === 1) {
    const y = Number(values.year), m = Number(values.month), d = Number(values.day), date = new Date(0);
    date.setUTCHours(0, 0, 0, 0); date.setUTCFullYear(y, m - 1, d);
    if (!/^\d{1,4}$/.test(String(values.year)) || y < 1 || !/^\d{1,2}$/.test(String(values.month)) || !/^\d{1,2}$/.test(String(values.day)) ||
      date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "Enter a valid birthdate. Check the month, day, and year.";
    if (birthdateISO(values) > today) return "Your birthdate cannot be in the future.";
  }
  if (step === 2 && !GOALS.some(option => option.value === values.goal)) return "Choose your daily practice goal.";
  if (step === 3 && !MOTIVATIONS.some(option => option.value === values.motivation)) return "Choose why you want to learn FSL.";
  if (step === 4 && !values.noClass && (!values.classCode.trim() || values.classCode.trim().length > 100)) return "Enter a classroom code, or choose I'm not enrolled.";
  if (step === 5 && !SENSORY.some(option => option.value === values.sensory)) return "Choose Audio Cues or Haptics Only.";
  return "";
}
export function onboardingPayload(values) {
  return { nickname: values.nickname.trim(), birthdate: birthdateISO(values), daily_goal_minutes: values.goal,
    motivation: values.motivation, sensory_preference: values.sensory,
    class_code: values.noClass ? "" : values.classCode.trim().toUpperCase() };
}

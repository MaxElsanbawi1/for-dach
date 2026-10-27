// LessonsTime is stored as "من 06:00 مساءً حتى 08:00 مساءً" (12-hour with
// صباحاً/مساءً). The time inputs need 24-hour "HH:MM"; reading only the
// digits turned every afternoon time into the morning on the next save.

const to24 = (time, marker) => {
  let [h, m] = time.split(":").map(Number);
  if (marker === "مساءً" && h < 12) h += 12;
  if (marker === "صباحاً" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** [start, end] as "HH:MM", or null when the text has no two times. */
export function parseLessonsTime(text = "") {
  const times = [...String(text).matchAll(/(\d{1,2}:\d{2})\s*(صباحاً|مساءً)?/g)];
  if (times.length < 2) return null;
  return [to24(times[0][1], times[0][2]), to24(times[1][1], times[1][2])];
}

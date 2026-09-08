// NYSE published calendar: docs/header-activity.md. Unknown years fail closed.
const holidays: Record<number, string[]> = {
  2026: [
    "01-01",
    "01-19",
    "02-16",
    "04-03",
    "05-25",
    "06-19",
    "07-03",
    "09-07",
    "11-26",
    "12-25",
  ],
  2027: [
    "01-01",
    "01-18",
    "02-15",
    "03-26",
    "05-31",
    "06-18",
    "07-05",
    "09-06",
    "11-25",
    "12-24",
  ],
  2028: [
    "01-17",
    "02-21",
    "04-14",
    "05-29",
    "06-19",
    "07-04",
    "09-04",
    "11-23",
    "12-25",
  ],
};
const early = new Set([
  "2026-11-27",
  "2026-12-24",
  "2027-11-26",
  "2028-07-03",
  "2028-11-24",
]);
const eastern = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function tradingSession(
  now = Date.now(),
): "premarket" | "regular" | "after-hours" | null {
  if (!Number.isFinite(now)) return null;
  const p = Object.fromEntries(
    eastern.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const md = p.month + "-" + p.day,
    date = p.year + "-" + md;
  if (
    !holidays[+p.year] ||
    ["Sat", "Sun"].includes(p.weekday) ||
    holidays[+p.year].includes(md)
  )
    return null;
  const minutes = +p.hour * 60 + +p.minute;
  if (minutes < 240 || minutes >= (early.has(date) ? 1020 : 1200)) return null;
  if (minutes < 570) return "premarket";
  return minutes < (early.has(date) ? 780 : 960) ? "regular" : "after-hours";
}

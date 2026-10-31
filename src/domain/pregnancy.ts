const DAY_MS = 24 * 60 * 60 * 1000;
const EXPECTED_GESTATION_DAYS = 40 * 7;

export type PregnancyEstimate = {
  dueDate: string;
  daysUntilDue: number;
  gestationalDays: number;
  week: number;
  day: number;
  trimester?: 1 | 2 | 3;
  weekAvailable: boolean;
};

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const stamp = new Date(Date.UTC(year!, month! - 1, day!));
  return stamp.getUTCFullYear() === year && stamp.getUTCMonth() === month! - 1 && stamp.getUTCDate() === day;
}

function stamp(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

export function estimatePregnancy(dueDate: string, now = new Date()): PregnancyEstimate | undefined {
  if (!isDateOnly(dueDate)) return undefined;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const daysUntilDue = Math.round((stamp(dueDate) - stamp(today)) / DAY_MS);
  const gestationalDays = EXPECTED_GESTATION_DAYS - daysUntilDue;
  const weekAvailable = gestationalDays >= 0;
  const week = weekAvailable ? Math.floor(gestationalDays / 7) : 0;
  const day = weekAvailable ? gestationalDays % 7 : 0;
  const trimester: 1 | 2 | 3 | undefined = !weekAvailable ? undefined : gestationalDays < 14 * 7 ? 1 : gestationalDays < 28 * 7 ? 2 : 3;
  return { dueDate, daysUntilDue, gestationalDays, week, day, trimester, weekAvailable };
}

function minutesOfDay(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function clockInputDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function normalizeClockInput(value: string): string {
  const digits = clockInputDigits(value);
  if (digits.length < 3) return digits;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidClock(value: string) {
  return minutesOfDay(value) !== null;
}

export function dailyReminderDatesBefore(clock: string, leadMinutes: number, days: number, now = new Date()): Date[] {
  const targetMinutes = minutesOfDay(clock);
  if (targetMinutes === null || !Number.isInteger(leadMinutes) || leadMinutes < 0 || leadMinutes >= 1440 || !Number.isInteger(days) || days < 1 || days > 14 || !Number.isFinite(now.getTime())) return [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const reminders: Date[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const target = new Date(today);
    target.setDate(today.getDate() + offset);
    target.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);
    const reminder = new Date(target.getTime() - leadMinutes * 60_000);
    if (reminder.getTime() > now.getTime()) reminders.push(reminder);
  }
  return reminders;
}

export function isInQuietHours(date: Date, start: string, end: string): boolean {
  const startMinutes = minutesOfDay(start);
  const endMinutes = minutesOfDay(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return false;
  const current = date.getHours() * 60 + date.getMinutes();
  return startMinutes < endMinutes
    ? current >= startMinutes && current < endMinutes
    : current >= startMinutes || current < endMinutes;
}

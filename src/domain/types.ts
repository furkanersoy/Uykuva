export type EventKind = "sleep" | "feed" | "diaper" | "note";

export type Baby = {
  id: string;
  name: string;
  birthDate: string;
  gestationalWeek: number;
};

export type CareEvent = {
  id: string;
  kind: EventKind;
  startedAt: string;
  endedAt?: string;
  amountMl?: number;
  feedType?: "breast" | "bottle" | "solid";
  diaperType?: "wet" | "dirty" | "both";
  note?: string;
  caregiver: string;
};

export type RoutineStep = {
  id: string;
  label: string;
  minutes: number;
  enabled: boolean;
};

export type SleepMethod = "responsive" | "gradual" | "camping";

export type SleepPlan = {
  method: SleepMethod;
  startDate: string;
  day: number;
  bedtime: string;
  wakeTime: string;
  routine: RoutineStep[];
  completedToday: string[];
  checkIns: SleepCheckIn[];
};

export type SleepCheckIn = {
  date: string;
  ease: 1 | 2 | 3 | 4 | 5;
  nightWakings?: number;
  note?: string;
};

export type AppPreferences = {
  notificationsEnabled: boolean;
  sleepReminderMinutes: 5 | 10 | 15 | 20 | 30;
  quietStart: string;
  quietEnd: string;
};

export type AppState = {
  schemaVersion: 2;
  onboardingComplete: boolean;
  baby: Baby;
  caregiverName: string;
  events: CareEvent[];
  sleepPlan: SleepPlan;
  preferences: AppPreferences;
};

export type SleepForecast = {
  available: boolean;
  start?: Date;
  end?: Date;
  confidence: "low" | "medium" | "high";
  explanation: string;
  awakeMinutes?: number;
};

export type EventKind = "sleep" | "feed" | "diaper" | "note" | "health" | "growth" | "memory";

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
  feedType?: "breast" | "bottle" | "solid" | "pump";
  bottleSource?: "formula" | "expressed";
  milkStorageLocation?: "room" | "fridge" | "freezer";
  milkLabel?: string;
  milkDiscardedAt?: string;
  milkThawedAt?: string;
  breastSide?: "left" | "right" | "both";
  foods?: string[];
  allergens?: string[];
  reactionNote?: string;
  diaperType?: "wet" | "dirty" | "both";
  healthType?: "temperature" | "medicine" | "symptom";
  temperatureC?: number;
  medicineName?: string;
  doseAsEntered?: string;
  weightG?: number;
  lengthCm?: number;
  headCm?: number;
  note?: string;
  memoryTitle?: string;
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
  paused: boolean;
  lastAdvancedDate?: string;
  startDate: string;
  day: number;
  bedtime: string;
  wakeTime: string;
  routine: RoutineStep[];
  completedToday: string[];
  readinessCompleted: string[];
  checkIns: SleepCheckIn[];
};

export type SleepCheckIn = {
  date: string;
  ease?: 1 | 2 | 3 | 4 | 5;
  nightWakings?: number;
  note?: string;
};

export type AppPreferences = {
  notificationsEnabled: boolean;
  sleepReminderMinutes: 5 | 10 | 15 | 20 | 30;
  careTaskRemindersEnabled: boolean;
  careTaskReminderMinutes: 30 | 120 | 1440;
  quietStart: string;
  quietEnd: string;
};

export type CareTask = {
  id: string;
  type: "vaccine" | "appointment";
  title: string;
  dueAt: string;
  note?: string;
  completedAt?: string;
};

export type Caregiver = {
  id: string;
  name: string;
  role: "parent" | "family" | "caregiver";
};

export type AppState = {
  schemaVersion: 3;
  onboardingComplete: boolean;
  baby: Baby;
  caregiverName: string;
  caregivers: Caregiver[];
  activeCaregiverId: string;
  events: CareEvent[];
  careTasks: CareTask[];
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

export type FeedingForecast = {
  available: boolean;
  start?: Date;
  end?: Date;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

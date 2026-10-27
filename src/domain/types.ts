export type EventKind = "sleep" | "feed" | "diaper" | "note" | "health" | "growth" | "memory";

export type BreastfeedingSegment = {
  side: "left" | "right";
  startedAt: string;
  endedAt?: string;
};

export type Baby = {
  id: string;
  name: string;
  birthDate: string;
  gestationalWeek: number;
  growthChartSex?: "female" | "male";
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
  breastSessions?: BreastfeedingSegment[];
  foods?: string[];
  allergens?: string[];
  reactionNote?: string;
  diaperType?: "wet" | "dirty" | "both";
  healthType?: "temperature" | "medicine" | "symptom";
  temperatureC?: number;
  medicineName?: string;
  doseAsEntered?: string;
  medicationReminderAt?: string;
  weightG?: number;
  lengthCm?: number;
  headCm?: number;
  lengthPosition?: "recumbent" | "standing";
  note?: string;
  memoryTitle?: string;
  milestoneId?: string;
  caregiver: string;
};

export type RoutineStep = {
  id: string;
  label: string;
  minutes: number;
  enabled: boolean;
};

export type SleepMethod = "responsive" | "gradual" | "camping" | "bedtimeFading" | "pickUpPutDown" | "routineFirst";
export type SleepFocus = "bedtime" | "nightWakings" | "naps" | "routine";

export type SleepPlanDayRecord = {
  date: string;
  day: number;
  method: SleepMethod;
  focus: SleepFocus;
  completedTasks: number;
  totalTasks: number;
};

export type SleepPlanRun = {
  id: string;
  startDate: string;
  completedDate: string;
  days: SleepPlanDayRecord[];
};

export type SleepPlan = {
  method: SleepMethod;
  focus: SleepFocus;
  paused: boolean;
  lastAdvancedDate?: string;
  completedDate?: string;
  startDate: string;
  day: number;
  bedtime: string;
  wakeTime: string;
  routine: RoutineStep[];
  completedToday: string[];
  completedDays: SleepPlanDayRecord[];
  completedRuns: SleepPlanRun[];
  readinessCompleted: string[];
  checkIns: SleepCheckIn[];
};

export type SleepCheckIn = {
  date: string;
  ease?: 1 | 2 | 3 | 4 | 5;
  nightWakings?: number;
  bedtime?: string;
  wakeTime?: string;
  note?: string;
};

export type AppPreferences = {
  handoffHours: 2 | 4 | 6 | 8;
  notificationsEnabled: boolean;
  sleepReminderMinutes: 5 | 10 | 15 | 20 | 30;
  careTaskRemindersEnabled: boolean;
  careTaskReminderMinutes: 30 | 120 | 1440;
  diaperRemindersEnabled: boolean;
  diaperReminderHours: 2 | 3 | 4;
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
  repeat?: "weekly" | "monthly";
  recurrenceId?: string;
  recurrenceDay?: number;
  generated?: boolean;
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
  careInstructions?: string;
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

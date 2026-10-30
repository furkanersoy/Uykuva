export type EventKind = "sleep" | "feed" | "diaper" | "note" | "health" | "growth" | "memory";

export type BreastfeedingSegment = {
  side: "left" | "right";
  startedAt: string;
  endedAt?: string;
};

export type SleepSupport = "feeding" | "held" | "rocked" | "nearby" | "cribSupport" | "independent" | "other";
export type NightWakeResponse = "feeding" | "comfort" | "diaper" | "other";

export type NightWakeLog = {
  id: string;
  at: string;
  response: NightWakeResponse;
  caregiver: string;
};

export type SleepDayContext = "illness" | "travel" | "teething" | "routineChange";
export type MilkExpiryReminderLead = "adaptive" | 2 | 6 | 12 | 24 | 48;

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
  suggestedSleepWindowStartAt?: string;
  suggestedSleepWindowEndAt?: string;
  sleepSupport?: SleepSupport;
  amountMl?: number;
  feedType?: "breast" | "bottle" | "solid" | "pump";
  bottleSource?: "formula" | "expressed";
  milkStorageLocation?: "room" | "fridge" | "freezer";
  milkLabel?: string;
  milkDiscardedAt?: string;
  milkThawedAt?: string;
  milkWarmedAt?: string;
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
  memoryPhotoData?: string;
  milestoneId?: string;
  caregiver: string;
};

export type RoutineStep = {
  id: string;
  label: string;
  minutes: number;
  enabled: boolean;
};

export type SleepMethod = "responsive" | "gradual" | "timedChecks" | "camping" | "bedtimeFading" | "pickUpPutDown" | "routineFirst";
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
  savedGuideIds: string[];
};

export type SleepCheckIn = {
  date: string;
  ease?: 1 | 2 | 3 | 4 | 5;
  nightWakings?: number;
  bedtime?: string;
  wakeTime?: string;
  dayContext?: SleepDayContext;
  nightWakeLogs?: NightWakeLog[];
  note?: string;
};

export type AppPreferences = {
  handoffHours: 2 | 4 | 6 | 8;
  notificationsEnabled: boolean;
  sleepReminderMinutes: 5 | 10 | 15 | 20 | 30;
  wakeReminderEnabled: boolean;
  wakeReminderMinutes: 5 | 10 | 15 | 20 | 30;
  careTaskRemindersEnabled: boolean;
  careTaskReminderMinutes: 15 | 30 | 60 | 120 | 180 | 1440;
  diaperRemindersEnabled: boolean;
  diaperReminderHours: 2 | 3 | 4;
  milkExpiryRemindersEnabled: boolean;
  milkExpiryReminderLead: MilkExpiryReminderLead;
  routineRemindersEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

export type CareTask = {
  id: string;
  type: "vaccine" | "appointment";
  title: string;
  dueAt: string;
  note?: string;
  assignedCaregiverId?: string;
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

export type DevelopmentAnswer = "yes" | "notSure" | "notYet";

export type DevelopmentCheckIn = {
  ageMonths: 2 | 4 | 6 | 9 | 12 | 15 | 18 | 24 | 30 | 36 | 48 | 60;
  checkedAt: string;
  answers: Record<string, DevelopmentAnswer>;
  note?: string;
};

export type ChildProfile = {
  baby: Baby;
  careInstructions?: string;
  developmentCheckIns?: DevelopmentCheckIn[];
  events: CareEvent[];
  careTasks: CareTask[];
  sleepPlan: SleepPlan;
};

export type AppState = {
  schemaVersion: 5;
  onboardingComplete: boolean;
  baby: Baby;
  caregiverName: string;
  careInstructions?: string;
  developmentCheckIns?: DevelopmentCheckIn[];
  caregivers: Caregiver[];
  activeCaregiverId: string;
  events: CareEvent[];
  careTasks: CareTask[];
  sleepPlan: SleepPlan;
  preferences: AppPreferences;
  children: ChildProfile[];
  activeChildId: string;
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

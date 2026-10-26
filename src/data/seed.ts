import { AppState } from "../domain/types";

function iso(hoursAgo: number, durationMinutes?: number) {
  const end = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const start = durationMinutes ? new Date(end.getTime() - durationMinutes * 60_000) : end;
  return { startedAt: start.toISOString(), endedAt: durationMinutes ? end.toISOString() : undefined };
}

export function createInitialState(): AppState {
  const birth = new Date();
  birth.setDate(birth.getDate() - 132);
  const sleep1 = iso(1.1, 52);
  const sleep2 = iso(4.2, 63);
  const sleep3 = iso(7.1, 48);
  const sleep4 = iso(10.4, 55);
  return {
    schemaVersion: 3,
    onboardingComplete: false,
    baby: { id: "baby-1", name: "Deniz", birthDate: birth.toISOString().slice(0, 10), gestationalWeek: 40 },
    caregiverName: "Anne",
    caregivers: [{ id: "caregiver-1", name: "Anne", role: "parent" }],
    activeCaregiverId: "caregiver-1",
    events: [
      { id: "sleep-1", kind: "sleep", ...sleep1, caregiver: "Anne" },
      { id: "feed-1", kind: "feed", ...iso(0.7), amountMl: 90, feedType: "bottle", caregiver: "Anne" },
      { id: "diaper-1", kind: "diaper", ...iso(0.4), diaperType: "wet", caregiver: "Anne" },
      { id: "sleep-2", kind: "sleep", ...sleep2, caregiver: "Baba" },
      { id: "sleep-3", kind: "sleep", ...sleep3, caregiver: "Anne" },
      { id: "sleep-4", kind: "sleep", ...sleep4, caregiver: "Baba" }
    ],
    careTasks: [],
    sleepPlan: {
      method: "responsive",
      paused: false,
      startDate: new Date().toISOString(),
      day: 1,
      bedtime: "20:00",
      wakeTime: "07:00",
      routine: [
        { id: "r1", label: "Işıkları azalt", minutes: 5, enabled: true },
        { id: "r2", label: "Ilık banyo veya yüz silme", minutes: 10, enabled: true },
        { id: "r3", label: "Beslenme", minutes: 15, enabled: true },
        { id: "r4", label: "Kısa kitap veya ninni", minutes: 10, enabled: true },
        { id: "r5", label: "Yatağa geçiş", minutes: 5, enabled: true }
      ],
      completedToday: [],
      readinessCompleted: [],
      checkIns: []
    },
    preferences: {
      handoffHours: 4,
      notificationsEnabled: false,
      sleepReminderMinutes: 15,
      careTaskRemindersEnabled: false,
      careTaskReminderMinutes: 120,
      diaperRemindersEnabled: false,
      diaperReminderHours: 3,
      quietStart: "21:00",
      quietEnd: "07:00"
    }
  };
}

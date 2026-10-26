import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPreferences, AppState, Baby, CareEvent, CareTask, Caregiver, EventKind, SleepCheckIn, SleepMethod } from "../domain/types";
import { createInitialState } from "../data/seed";
import { loadState, resetState, saveState } from "../data/storage";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useUykuvaState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    loadState()
      .then((saved) => setState(saved))
      .catch(() => setStorageError("Kayıtlar bu açılışta yüklenemedi."))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) {
      void saveState(state).catch(() => setStorageError("Değişiklik cihazınıza kaydedilemedi."));
    }
  }, [hydrated, state]);

  const completeOnboarding = useCallback((profile: { babyName: string; birthDate: string; gestationalWeek: number; caregiverName: string }) => {
    setState((current) => ({
      ...current,
      onboardingComplete: true,
      baby: {
        ...current.baby,
        name: profile.babyName.trim(),
        birthDate: profile.birthDate,
        gestationalWeek: profile.gestationalWeek
      },
      caregiverName: profile.caregiverName.trim(),
      caregivers: [{ id: "caregiver-1", name: profile.caregiverName.trim(), role: "parent" }],
      activeCaregiverId: "caregiver-1",
      events: []
    }));
  }, []);

  const updateProfile = useCallback((baby: Baby, caregiverName: string) => {
    setState((current) => ({
      ...current,
      baby,
      caregiverName: caregiverName.trim(),
      caregivers: current.caregivers.map((item) => item.id === current.activeCaregiverId ? { ...item, name: caregiverName.trim() } : item)
    }));
  }, []);

  const addCaregiver = useCallback((caregiver: Omit<Caregiver, "id">) => {
    setState((current) => ({ ...current, caregivers: [...current.caregivers, { ...caregiver, id: id("caregiver") }] }));
  }, []);

  const setActiveCaregiver = useCallback((caregiverId: string) => {
    setState((current) => {
      const selected = current.caregivers.find((item) => item.id === caregiverId);
      return selected ? { ...current, activeCaregiverId: selected.id, caregiverName: selected.name } : current;
    });
  }, []);

  const deleteCaregiver = useCallback((caregiverId: string) => {
    setState((current) => {
      if (current.caregivers.length <= 1) return current;
      const caregivers = current.caregivers.filter((item) => item.id !== caregiverId);
      const active = caregiverId === current.activeCaregiverId ? caregivers[0]! : caregivers.find((item) => item.id === current.activeCaregiverId)!;
      return { ...current, caregivers, activeCaregiverId: active.id, caregiverName: active.name };
    });
  }, []);

  const updatePreferences = useCallback((patch: Partial<AppPreferences>) => {
    setState((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));
  }, []);

  const addEvent = useCallback((event: Omit<CareEvent, "id" | "caregiver" | "startedAt"> & { startedAt?: string }) => {
    setState((current) => ({
      ...current,
      events: [
        {
          ...event,
          id: id(event.kind),
          caregiver: current.caregiverName,
          startedAt: event.startedAt ?? new Date().toISOString()
        },
        ...current.events
      ]
    }));
  }, []);

  const toggleSleep = useCallback(() => {
    setState((current) => {
      const running = current.events.find((event) => event.kind === "sleep" && !event.endedAt);
      if (running) {
        return {
          ...current,
          events: current.events.map((event) =>
            event.id === running.id ? { ...event, endedAt: new Date().toISOString() } : event
          )
        };
      }
      return {
        ...current,
        events: [
          { id: id("sleep"), kind: "sleep", startedAt: new Date().toISOString(), caregiver: current.caregiverName },
          ...current.events
        ]
      };
    });
  }, []);

  const toggleBreastfeed = useCallback((side: "left" | "right" | "both") => {
    setState((current) => {
      const running = current.events.find((event) => event.kind === "feed" && event.feedType === "breast" && !event.endedAt);
      if (running) {
        return { ...current, events: current.events.map((event) => event.id === running.id ? { ...event, endedAt: new Date().toISOString() } : event) };
      }
      return {
        ...current,
        events: [{ id: id("feed"), kind: "feed", feedType: "breast", breastSide: side, startedAt: new Date().toISOString(), caregiver: current.caregiverName }, ...current.events]
      };
    });
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setState((current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId) }));
  }, []);

  const updateEvent = useCallback((eventId: string, patch: Partial<CareEvent>) => {
    setState((current) => ({ ...current, events: current.events.map((event) => event.id === eventId ? { ...event, ...patch, id: event.id, caregiver: event.caregiver } : event) }));
  }, []);

  const setMethod = useCallback((method: SleepMethod) => {
    setState((current) => ({ ...current, sleepPlan: { ...current.sleepPlan, method } }));
  }, []);

  const toggleTask = useCallback((task: string) => {
    setState((current) => {
      const completed = current.sleepPlan.completedToday.includes(task)
        ? current.sleepPlan.completedToday.filter((item) => item !== task)
        : [...current.sleepPlan.completedToday, task];
      return { ...current, sleepPlan: { ...current.sleepPlan, completedToday: completed } };
    });
  }, []);

  const toggleReadiness = useCallback((item: string) => {
    setState((current) => {
      const items = current.sleepPlan.readinessCompleted.includes(item)
        ? current.sleepPlan.readinessCompleted.filter((value) => value !== item)
        : [...current.sleepPlan.readinessCompleted, item];
      return { ...current, sleepPlan: { ...current.sleepPlan, readinessCompleted: items } };
    });
  }, []);

  const advancePlan = useCallback(() => {
    setState((current) => ({
      ...current,
      sleepPlan: {
        ...current.sleepPlan,
        day: Math.min(14, current.sleepPlan.day + 1),
        completedToday: []
      }
    }));
  }, []);

  const saveCheckIn = useCallback((checkIn: SleepCheckIn) => {
    setState((current) => ({
      ...current,
      sleepPlan: {
        ...current.sleepPlan,
        checkIns: [checkIn, ...current.sleepPlan.checkIns.filter((item) => item.date !== checkIn.date)]
      }
    }));
  }, []);

  const updateSleepSchedule = useCallback((bedtime: string, wakeTime: string) => {
    setState((current) => ({ ...current, sleepPlan: { ...current.sleepPlan, bedtime, wakeTime } }));
  }, []);

  const toggleRoutineStep = useCallback((stepId: string) => {
    setState((current) => ({
      ...current,
      sleepPlan: { ...current.sleepPlan, routine: current.sleepPlan.routine.map((step) => step.id === stepId ? { ...step, enabled: !step.enabled } : step) }
    }));
  }, []);

  const moveRoutineStep = useCallback((stepId: string, direction: -1 | 1) => {
    setState((current) => {
      const routine = [...current.sleepPlan.routine];
      const index = routine.findIndex((step) => step.id === stepId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= routine.length) return current;
      [routine[index], routine[destination]] = [routine[destination]!, routine[index]!];
      return { ...current, sleepPlan: { ...current.sleepPlan, routine } };
    });
  }, []);

  const addRoutineStep = useCallback((label: string, minutes: number) => {
    setState((current) => ({
      ...current,
      sleepPlan: { ...current.sleepPlan, routine: [...current.sleepPlan.routine, { id: id("routine"), label: label.trim(), minutes, enabled: true }] }
    }));
  }, []);

  const deleteRoutineStep = useCallback((stepId: string) => {
    setState((current) => ({ ...current, sleepPlan: { ...current.sleepPlan, routine: current.sleepPlan.routine.filter((step) => step.id !== stepId) } }));
  }, []);

  const addCareTask = useCallback((task: Omit<CareTask, "id">) => {
    setState((current) => ({ ...current, careTasks: [...current.careTasks, { ...task, id: id(task.type) }] }));
  }, []);

  const toggleCareTask = useCallback((taskId: string) => {
    setState((current) => ({
      ...current,
      careTasks: current.careTasks.map((task) => task.id === taskId
        ? { ...task, completedAt: task.completedAt ? undefined : new Date().toISOString() }
        : task)
    }));
  }, []);

  const deleteCareTask = useCallback((taskId: string) => {
    setState((current) => ({ ...current, careTasks: current.careTasks.filter((task) => task.id !== taskId) }));
  }, []);

  const restoreData = useCallback((restored: AppState) => {
    setState(restored);
  }, []);

  const clearAllData = useCallback(async () => {
    await resetState();
    setState(createInitialState());
    setStorageError(null);
  }, []);

  const runningSleep = useMemo(
    () => state.events.find((event) => event.kind === "sleep" && !event.endedAt),
    [state.events]
  );
  const runningFeed = useMemo(
    () => state.events.find((event) => event.kind === "feed" && event.feedType === "breast" && !event.endedAt),
    [state.events]
  );

  const addSimpleEvent = useCallback((kind: Exclude<EventKind, "sleep">, details: Partial<CareEvent> = {}) => {
    addEvent({ kind, ...details });
  }, [addEvent]);

  return {
    state,
    hydrated,
    storageError,
    runningSleep,
    runningFeed,
    completeOnboarding,
    updateProfile,
    addCaregiver,
    setActiveCaregiver,
    deleteCaregiver,
    updatePreferences,
    addEvent,
    addSimpleEvent,
    toggleSleep,
    toggleBreastfeed,
    deleteEvent,
    updateEvent,
    setMethod,
    toggleTask,
    toggleReadiness,
    advancePlan,
    saveCheckIn,
    updateSleepSchedule,
    toggleRoutineStep,
    moveRoutineStep,
    addRoutineStep,
    deleteRoutineStep,
    addCareTask,
    toggleCareTask,
    deleteCareTask,
    restoreData,
    clearAllData
  };
}

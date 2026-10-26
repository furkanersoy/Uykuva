import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPreferences, AppState, Baby, CareEvent, EventKind, SleepCheckIn, SleepMethod } from "../domain/types";
import { createInitialState } from "../data/seed";
import { loadState, saveState } from "../data/storage";

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
      events: []
    }));
  }, []);

  const updateProfile = useCallback((baby: Baby, caregiverName: string) => {
    setState((current) => ({ ...current, baby, caregiverName: caregiverName.trim() }));
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

  const deleteEvent = useCallback((eventId: string) => {
    setState((current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId) }));
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

  const runningSleep = useMemo(
    () => state.events.find((event) => event.kind === "sleep" && !event.endedAt),
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
    completeOnboarding,
    updateProfile,
    updatePreferences,
    addEvent,
    addSimpleEvent,
    toggleSleep,
    deleteEvent,
    setMethod,
    toggleTask,
    toggleReadiness,
    advancePlan,
    saveCheckIn
  };
}

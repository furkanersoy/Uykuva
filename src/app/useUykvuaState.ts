import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, CareEvent, EventKind, SleepMethod } from "../domain/types";
import { createInitialState } from "../data/seed";
import { loadState, saveState } from "../data/storage";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useUykvuaState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadState().then((saved) => {
      setState(saved);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) void saveState(state);
  }, [hydrated, state]);

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
    runningSleep,
    addEvent,
    addSimpleEvent,
    toggleSleep,
    deleteEvent,
    setMethod,
    toggleTask,
    advancePlan
  };
}

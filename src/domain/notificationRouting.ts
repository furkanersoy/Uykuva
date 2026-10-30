export const NOTIFICATION_KINDS = {
  sleepWindow: "uykuva-sleep-window",
  sleepWake: "uykuva-sleep-wake",
  openSleepCheck: "uykuva-open-sleep-check",
  routine: "uykuva-evening-routine",
  careTask: "uykuva-care-task",
  diaper: "uykuva-diaper-check",
  medication: "uykuva-medication-reminder",
  milkExpiry: "uykuva-milk-expiry"
} as const;

export type NotificationDestination = {
  tab: "today" | "timeline" | "insights";
  childId?: string;
  taskId?: string;
  eventId?: string;
};

export function notificationDestination(data: unknown): NotificationDestination | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const fields = data as Record<string, unknown>;
  const childId = typeof fields.childId === "string" && fields.childId ? fields.childId : undefined;
  const taskId = typeof fields.taskId === "string" && fields.taskId ? fields.taskId : undefined;
  const eventId = typeof fields.eventId === "string" && fields.eventId ? fields.eventId : undefined;
  const shared = childId ? { childId } : {};

  switch (fields.kind) {
    case NOTIFICATION_KINDS.openSleepCheck:
      return eventId ? { tab: "timeline", ...shared, eventId } : null;
    case NOTIFICATION_KINDS.sleepWindow:
    case NOTIFICATION_KINDS.sleepWake:
    case NOTIFICATION_KINDS.routine:
    case NOTIFICATION_KINDS.diaper:
      return { tab: "today", ...shared };
    case NOTIFICATION_KINDS.careTask:
      return { tab: "insights", ...shared, ...(taskId ? { taskId } : {}) };
    case NOTIFICATION_KINDS.medication:
    case NOTIFICATION_KINDS.milkExpiry:
      return { tab: "timeline", ...shared, ...(eventId ? { eventId } : {}) };
    default:
      return null;
  }
}

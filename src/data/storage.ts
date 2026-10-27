import LegacyStorage from "@react-native-async-storage/async-storage";
import Storage from "expo-sqlite/kv-store";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import { AppState, CareEvent, CareTask } from "../domain/types";
import { createInitialState } from "./seed";
import { migrateState } from "./migrations";

const DATABASE_NAME = "uykuva.db";
const STATE_ROW_ID = 1;
const LEGACY_STATE_KEY = "uykuva:state:v3";
const PREVIOUS_KEY = "uykuva:state:v2";
const MISSPELLED_V2_KEY = "uykvua:state:v2";
const LEGACY_KEY = "uykvua:state:v1";

let databasePromise: Promise<SQLiteDatabase> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS app_state (
          id INTEGER PRIMARY KEY CHECK (id = ${STATE_ROW_ID}),
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS care_events (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          caregiver TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_care_events_kind_started_at
          ON care_events(kind, started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_care_events_started_at
          ON care_events(started_at DESC);
        CREATE TABLE IF NOT EXISTS care_tasks (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          due_at TEXT NOT NULL,
          completed_at TEXT,
          payload_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_care_tasks_due_at
          ON care_tasks(due_at ASC);
        CREATE INDEX IF NOT EXISTS idx_care_tasks_type_due_at
          ON care_tasks(type, due_at ASC);
      `);
      return db;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

type StoredStateRow = { state_json: string };
type StoredEventRow = { payload_json: string };
type StoredTaskRow = { payload_json: string };

async function readNormalizedState(db: SQLiteDatabase): Promise<AppState | null> {
  const row = await db.getFirstAsync<StoredStateRow>("SELECT state_json FROM app_state WHERE id = ?", STATE_ROW_ID);
  if (!row) return null;
  const saved = JSON.parse(row.state_json) as Partial<AppState>;
  const eventRows = await db.getAllAsync<StoredEventRow>("SELECT payload_json FROM care_events ORDER BY started_at DESC, id ASC");
  const events = eventRows.map((event) => JSON.parse(event.payload_json) as CareEvent);
  const taskRows = await db.getAllAsync<StoredTaskRow>("SELECT payload_json FROM care_tasks ORDER BY rowid ASC");
  const storedTasks = taskRows.map((task) => JSON.parse(task.payload_json) as CareTask);
  const embeddedTasks = Array.isArray(saved.careTasks) ? saved.careTasks : [];
  const careTasks = storedTasks.length || !embeddedTasks.length ? storedTasks : embeddedTasks;
  const activeChildId = saved.activeChildId ?? saved.baby?.id;
  const children = Array.isArray(saved.children) ? saved.children.map((child) => child.baby.id === activeChildId ? { ...child, events, careTasks } : child) : undefined;
  const migrated = migrateState({ ...saved, events, careTasks, children });
  if (!storedTasks.length && embeddedTasks.length) await saveNormalizedState(db, migrated);
  return migrated;
}

async function saveNormalizedState(db: SQLiteDatabase, state: AppState) {
  const stateWithoutEventsAndTasks = JSON.stringify({ ...state, events: [], careTasks: [] });
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync("DELETE FROM care_events");
    await transaction.runAsync("DELETE FROM care_tasks");
    for (const event of state.events) {
      await transaction.runAsync(
        "INSERT INTO care_events(id, kind, started_at, ended_at, caregiver, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
        event.id,
        event.kind,
        event.startedAt,
        event.endedAt ?? null,
        event.caregiver,
        JSON.stringify(event)
      );
    }
    for (const task of state.careTasks) {
      await transaction.runAsync(
        "INSERT INTO care_tasks(id, type, due_at, completed_at, payload_json) VALUES (?, ?, ?, ?, ?)",
        task.id,
        task.type,
        task.dueAt,
        task.completedAt ?? null,
        JSON.stringify(task)
      );
    }
    await transaction.runAsync(
      "INSERT INTO app_state(id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at",
      STATE_ROW_ID,
      stateWithoutEventsAndTasks,
      new Date().toISOString()
    );
  });
}

async function removeLegacyKeys() {
  await Promise.all([
    Storage.removeItem(LEGACY_STATE_KEY),
    Storage.removeItem(PREVIOUS_KEY),
    Storage.removeItem(MISSPELLED_V2_KEY),
    LegacyStorage.removeItem(LEGACY_KEY)
  ]);
}

export async function loadState(): Promise<AppState> {
  const db = await getDatabase();
  const normalized = await readNormalizedState(db);
  if (normalized) return normalized;

  const current = await Storage.getItem(LEGACY_STATE_KEY);
  const previous = await Storage.getItem(PREVIOUS_KEY);
  const misspelledV2 = await Storage.getItem(MISSPELLED_V2_KEY);
  const legacy = current ?? previous ?? misspelledV2 ?? await LegacyStorage.getItem(LEGACY_KEY);
  if (!legacy) return createInitialState();

  const migrated = migrateState(JSON.parse(legacy));
  await saveNormalizedState(db, migrated);
  try {
    await removeLegacyKeys();
  } catch {
    // The normalized copy is committed; stale legacy keys are harmless and can be removed later.
  }
  return migrated;
}

export async function saveState(state: AppState) {
  const db = await getDatabase();
  await saveNormalizedState(db, state);
}

export async function resetState() {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync("DELETE FROM care_events");
    await transaction.runAsync("DELETE FROM care_tasks");
    await transaction.runAsync("DELETE FROM app_state WHERE id = ?", STATE_ROW_ID);
  });
  await removeLegacyKeys();
}

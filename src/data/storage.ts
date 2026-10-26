import LegacyStorage from "@react-native-async-storage/async-storage";
import Storage from "expo-sqlite/kv-store";
import { AppState } from "../domain/types";
import { createInitialState } from "./seed";
import { migrateState } from "./migrations";

const STORAGE_KEY = "uykuva:state:v3";
const PREVIOUS_KEY = "uykuva:state:v2";
const MISSPELLED_V2_KEY = "uykvua:state:v2";
const LEGACY_KEY = "uykvua:state:v1";

export async function loadState(): Promise<AppState> {
  const raw = await Storage.getItem(STORAGE_KEY);
  try {
    if (raw) return migrateState(JSON.parse(raw));
    const previous = await Storage.getItem(PREVIOUS_KEY);
    const misspelledV2 = await Storage.getItem(MISSPELLED_V2_KEY);
    const legacy = previous ?? misspelledV2 ?? await LegacyStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateState(JSON.parse(legacy));
      await Storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      await Storage.removeItem(PREVIOUS_KEY);
      await Storage.removeItem(MISSPELLED_V2_KEY);
      return migrated;
    }
    return createInitialState();
  } catch {
    return createInitialState();
  }
}

export async function saveState(state: AppState) {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetState() {
  await Storage.removeItem(STORAGE_KEY);
  await Storage.removeItem(PREVIOUS_KEY);
  await Storage.removeItem(MISSPELLED_V2_KEY);
  await LegacyStorage.removeItem(LEGACY_KEY);
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "../domain/types";
import { createInitialState } from "./seed";

const STORAGE_KEY = "uykvua:state:v1";

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return createInitialState();
  }
}

export async function saveState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetState() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

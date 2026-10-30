import { AppState, ChildProfile } from "./types";

function childProfileFromState(state: AppState): ChildProfile {
  return { baby: state.baby, careInstructions: state.careInstructions, developmentCheckIns: state.developmentCheckIns, events: state.events, careTasks: state.careTasks, sleepPlan: state.sleepPlan };
}

export function saveActiveChild(state: AppState): AppState {
  const activeChildId = state.activeChildId || state.baby.id;
  const profile = childProfileFromState(state);
  const index = state.children.findIndex((child) => child.baby.id === activeChildId);
  const children = [...state.children];
  if (index < 0) children.push(profile);
  else children[index] = profile;
  return { ...state, children, activeChildId };
}

export function selectChildWorkspace(state: AppState, babyId: string): AppState {
  const saved = saveActiveChild(state);
  const child = saved.children.find((profile) => profile.baby.id === babyId);
  return child ? { ...saved, ...child, activeChildId: babyId } : saved;
}

export function deleteChildWorkspace(state: AppState, babyId: string): AppState {
  const saved = saveActiveChild(state);
  if (saved.children.length <= 1 || !saved.children.some((profile) => profile.baby.id === babyId)) return saved;
  const children = saved.children.filter((profile) => profile.baby.id !== babyId);
  if (saved.activeChildId !== babyId) return { ...saved, children, syncTombstones: { ...saved.syncTombstones, childIds: [...new Set([...saved.syncTombstones.childIds, babyId])] } };
  const next = children[0]!;
  return { ...saved, ...next, children, activeChildId: next.baby.id, syncTombstones: { ...saved.syncTombstones, childIds: [...new Set([...saved.syncTombstones.childIds, babyId])] } };
}

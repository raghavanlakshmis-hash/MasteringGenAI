import { FitnessEntry, UserGoals } from '../types';

const ENTRIES_KEY = 'cardio_entries';
const GOALS_KEY = 'cardio_goals';
const ONBOARDED_KEY = 'cardio_onboarded';

export function getEntries(): FitnessEntry[] {
  try {
    const stored = localStorage.getItem(ENTRIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: FitnessEntry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function upsertEntry(entry: FitnessEntry) {
  const entries = getEntries();
  const idx = entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveEntries(entries);
}

export function getGoals(): UserGoals | null {
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveGoals(goals: UserGoals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function setOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, 'true');
}

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FitnessEntry, UserGoals, CardioMood } from '../types';
import { getEntries, saveEntries, upsertEntry, getGoals, saveGoals, isOnboarded, setOnboarded } from '../lib/storage';
import { calculateMood } from '../lib/moodEngine';

interface FitnessContextValue {
  entries: FitnessEntry[];
  goals: UserGoals | null;
  mood: CardioMood;
  onboarded: boolean;
  addEntry: (e: FitnessEntry) => void;
  bulkImport: (es: FitnessEntry[]) => void;
  completeOnboarding: (goals: UserGoals) => void;
}

const FitnessContext = createContext<FitnessContextValue | null>(null);

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<FitnessEntry[]>(() => getEntries());
  const [goals, setGoals] = useState<UserGoals | null>(() => getGoals());
  const [onboarded, setOnboardedState] = useState<boolean>(() => isOnboarded());

  const mood = goals ? calculateMood(entries, goals) : 'okay';

  const addEntry = useCallback((entry: FitnessEntry) => {
    upsertEntry(entry);
    setEntries(getEntries());
  }, []);

  const bulkImport = useCallback((newEntries: FitnessEntry[]) => {
    const current = getEntries();
    const map = new Map(current.map(e => [e.date, e]));
    newEntries.forEach(e => map.set(e.date, e));
    const merged = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    saveEntries(merged);
    setEntries(merged);
  }, []);

  const completeOnboarding = useCallback((g: UserGoals) => {
    saveGoals(g);
    setGoals(g);
    setOnboarded();
    setOnboardedState(true);
  }, []);

  return (
    <FitnessContext.Provider value={{ entries, goals, mood, onboarded, addEntry, bulkImport, completeOnboarding }}>
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error('useFitness must be used within FitnessProvider');
  return ctx;
}

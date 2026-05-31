export interface FitnessEntry {
  date: string; // YYYY-MM-DD
  weight: number;
  move: number;
  exercise: number;
  stand: number;
  sleep: number;
}

export interface UserGoals {
  name: string;
  goalWeight: number;
  moveGoal: number;
  exerciseGoal: number;
  standGoal: number;
}

export type CardioMood = 'great' | 'okay' | 'notgreat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

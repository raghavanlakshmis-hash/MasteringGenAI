import { FitnessEntry, UserGoals, CardioMood } from '../types';

export function calculateMood(entries: FitnessEntry[], goals: UserGoals): CardioMood {
  const recent = entries.slice(-7);
  if (recent.length === 0) return 'okay';

  const avg = (key: keyof FitnessEntry) =>
    recent.reduce((s, e) => s + (e[key] as number), 0) / recent.length;

  const moveScore     = Math.min(avg('move') / goals.moveGoal, 1);
  const exerciseScore = Math.min(avg('exercise') / goals.exerciseGoal, 1);
  const standScore    = Math.min(avg('stand') / goals.standGoal, 1);
  const score = (moveScore + exerciseScore + standScore) / 3;

  if (score >= 0.8) return 'great';
  if (score >= 0.5) return 'okay';
  return 'notgreat';
}

export function getMoodMessage(mood: CardioMood, name: string): string {
  const firstName = name.split(' ')[0] || 'Champion';
  const messages: Record<CardioMood, string[]> = {
    great: [
      `You're CRUSHING it, ${firstName}! 🔥 Keep that energy!`,
      `Absolutely on FIRE, ${firstName}! The results don't lie!`,
      `Look at you GO, ${firstName}! You're my favorite human right now!`,
    ],
    okay: [
      `Good effort, ${firstName}! A little push and we're flying!`,
      `You're doing well, ${firstName}. Let's kick it up a notch!`,
      `Solid week, ${firstName}! You've got more in the tank — I believe it!`,
    ],
    notgreat: [
      `Hey ${firstName}, I miss seeing you at your best. Let's shake things up!`,
      `No judgment here, ${firstName}. Every champion has off weeks. Tomorrow's a new day!`,
      `${firstName}, your body is waiting for you. One small step today — that's all!`,
    ],
  };
  const pool = messages[mood];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function calcHealthScore(entries: FitnessEntry[], goals: UserGoals): number {
  if (entries.length === 0) return 0;
  const recent = entries.slice(-30);

  const avgMove = recent.reduce((s, e) => s + e.move, 0) / recent.length;
  const avgEx   = recent.reduce((s, e) => s + e.exercise, 0) / recent.length;
  const avgSt   = recent.reduce((s, e) => s + e.stand, 0) / recent.length;
  const avgSlp  = recent.reduce((s, e) => s + e.sleep, 0) / recent.length;

  const actScore  = Math.min((avgMove / goals.moveGoal + avgEx / goals.exerciseGoal + avgSt / goals.standGoal) / 3, 1) * 60;
  const slpScore  = Math.max(0, 1 - Math.abs(avgSlp - 8) / 4) * 20;
  const wt = entries[entries.length - 1]?.weight ?? goals.goalWeight;
  const wtScore   = Math.max(0, 1 - Math.abs(wt - goals.goalWeight) / 30) * 20;

  return Math.round(actScore + slpScore + wtScore);
}

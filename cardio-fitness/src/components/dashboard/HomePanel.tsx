import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import CardioMascot from '../CardioMascot';
import ActivityRing from '../ActivityRing';
import { useFitness } from '../../context/FitnessContext';
import { getMoodMessage } from '../../lib/moodEngine';

export default function HomePanel() {
  const { entries, goals, mood } = useFitness();
  if (!goals) return null;

  const latest   = entries[entries.length - 1];
  const prev     = entries[entries.length - 2];
  const weightNow = latest?.weight ?? goals.goalWeight;
  const weightChg = latest && prev ? weightNow - prev.weight : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const last7 = entries.slice(-7);
  const weekTargets = 7;
  const weekMet = last7.filter(e =>
    e.move >= goals.moveGoal && e.exercise >= goals.exerciseGoal && e.stand >= goals.standGoal
  ).length;
  const weekPct = Math.round((weekMet / weekTargets) * 100);

  return (
    <div className="space-y-4">
      {/* Greeting + Cardio */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-5 text-white flex items-center justify-between overflow-hidden relative">
        <div className="flex-1 z-10">
          <p className="text-blue-100 text-sm">{greeting},</p>
          <h2 className="text-2xl font-bold">{goals.name.split(' ')[0]}! 👋</h2>
          <p className="text-blue-100 text-xs mt-2 leading-relaxed max-w-[180px]">
            {getMoodMessage(mood, goals.name)}
          </p>
        </div>
        <div className="z-10 -mr-2">
          <CardioMascot mood={mood} size={120} animate={false} />
        </div>
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -top-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
      </div>

      {/* Current Weight */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Current Weight</p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-gray-800">{weightNow.toFixed(1)}</span>
          <span className="text-gray-400 mb-1">lbs</span>
          <div className={`flex items-center gap-1 text-sm font-medium mb-1 ml-auto
            ${weightChg < 0 ? 'text-green-500' : weightChg > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {weightChg < 0 ? <TrendingDown size={16}/> : weightChg > 0 ? <TrendingUp size={16}/> : <Minus size={16}/>}
            {weightChg !== 0 ? `${weightChg > 0 ? '+' : ''}${weightChg.toFixed(1)} lbs` : 'No change'}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (1 - Math.abs(weightNow - goals.goalWeight) / 50) * 100))}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">Goal: {goals.goalWeight} lbs</span>
        </div>
      </div>

      {/* Today at a Glance */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Today at a Glance</p>
        <div className="flex justify-around">
          <RingCard label="Move" value={latest?.move ?? 0} goal={goals.moveGoal} unit="cal" color="#EF4444" />
          <RingCard label="Exercise" value={latest?.exercise ?? 0} goal={goals.exerciseGoal} unit="min" color="#22C55E" />
          <RingCard label="Stand" value={latest?.stand ?? 0} goal={goals.standGoal} unit="hrs" color="#3B82F6" />
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-gray-700">Weekly Progress</p>
          <span className="text-sm font-bold text-primary">{weekPct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
            style={{ width: `${weekPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{weekMet} of {weekTargets} days hitting all goals this week</p>
      </div>

      {/* Stats row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Sleep" value={`${latest.sleep}h`} icon="😴" color="bg-purple-50" textColor="text-purple-600" />
          <StatCard label="To Goal" value={`${Math.abs(weightNow - goals.goalWeight).toFixed(1)}lb`} icon="🎯" color="bg-green-50" textColor="text-green-600" />
          <StatCard label="Entries" value={String(entries.length)} icon="📊" color="bg-orange-50" textColor="text-orange-600" />
        </div>
      )}
    </div>
  );
}

function RingCard({ label, value, goal, unit, color }: {
  label: string; value: number; goal: number; unit: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ActivityRing value={value} max={goal} color={color} size={72} strokeWidth={8}
        label={String(value)} sublabel={unit} />
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-[10px] text-gray-300">/ {goal}</span>
    </div>
  );
}

function StatCard({ label, value, icon, color, textColor }: {
  label: string; value: string; icon: string; color: string; textColor: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-3 text-center`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-sm font-bold ${textColor}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}

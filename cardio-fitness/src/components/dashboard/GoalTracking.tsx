import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { useFitness } from '../../context/FitnessContext';

export default function GoalTracking() {
  const { entries, goals } = useFitness();
  if (!goals) return null;

  const latest = entries[entries.length - 1];
  const startWeight = entries[0]?.weight ?? goals.goalWeight;
  const currentWeight = latest?.weight ?? goals.goalWeight;
  const totalToLose = Math.abs(startWeight - goals.goalWeight);
  const lost = Math.abs(startWeight - currentWeight);
  const pct = totalToLose > 0 ? Math.min(Math.round((lost / totalToLose) * 100), 100) : 100;

  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct / 100);

  const milestones = [
    { label: '5 lbs down', done: lost >= 5 },
    { label: '10 lbs down', done: lost >= 10 },
    { label: '15 lbs down', done: lost >= 15 },
    { label: 'Halfway to goal', done: pct >= 50 },
    { label: 'Goal achieved!', done: pct >= 100 },
  ];

  const last7 = entries.slice(-7);
  const weekGoals = [
    { label: 'Hit Move goal 5+ days', done: last7.filter(e => e.move >= goals.moveGoal).length >= 5 },
    { label: 'Hit Exercise goal 5+ days', done: last7.filter(e => e.exercise >= goals.exerciseGoal).length >= 5 },
    { label: 'Hit Stand goal 5+ days', done: last7.filter(e => e.stand >= goals.standGoal).length >= 5 },
    { label: 'Sleep 7+ hrs every day', done: last7.length > 0 && last7.every(e => e.sleep >= 7) },
  ];

  return (
    <div className="space-y-4">
      {/* Big ring */}
      <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center">
        <h3 className="font-semibold text-gray-800 mb-4">Goal Progress</h3>
        <div className="relative" style={{ width: 180, height: 180 }}>
          <svg width={180} height={180} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={90} cy={90} r={radius} fill="none" stroke="#EEF2FF" strokeWidth={16} />
            <circle
              cx={90} cy={90} r={radius} fill="none"
              stroke={pct >= 100 ? '#22C55E' : '#4F75FF'} strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.2s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-800">{pct}%</span>
            <span className="text-xs text-gray-400">to goal</span>
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-sm text-center">
          <div>
            <p className="font-bold text-gray-800">{startWeight.toFixed(1)}</p>
            <p className="text-gray-400 text-xs">Start</p>
          </div>
          <div>
            <p className="font-bold text-primary">{currentWeight.toFixed(1)}</p>
            <p className="text-gray-400 text-xs">Now</p>
          </div>
          <div>
            <p className="font-bold text-green-500">{goals.goalWeight}</p>
            <p className="text-gray-400 text-xs">Goal</p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Milestones</h3>
        <div className="space-y-2.5">
          {milestones.map(m => (
            <div key={m.label} className={`flex items-center gap-3 p-3 rounded-xl
              ${m.done ? 'bg-green-50' : 'bg-gray-50'}`}>
              {m.done
                ? <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                : <Circle size={18} className="text-gray-200 flex-shrink-0" />}
              <span className={`text-sm font-medium ${m.done ? 'text-green-700' : 'text-gray-400'}`}>
                {m.label}
              </span>
              {m.done && <span className="ml-auto text-xs text-green-500">✓ Done</span>}
            </div>
          ))}
        </div>
      </div>

      {/* This week */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">This Week's Targets</h3>
        <div className="space-y-2.5">
          {weekGoals.map(g => (
            <div key={g.label} className="flex items-center gap-3">
              {g.done
                ? <CheckCircle size={16} className="text-primary flex-shrink-0" />
                : <Circle size={16} className="text-gray-200 flex-shrink-0" />}
              <span className={`text-sm ${g.done ? 'text-gray-700' : 'text-gray-400'}`}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

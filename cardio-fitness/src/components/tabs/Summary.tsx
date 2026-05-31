import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts';
import CardioMascot from '../CardioMascot';
import { useFitness } from '../../context/FitnessContext';
import { getMoodMessage } from '../../lib/moodEngine';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={pts} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, padding: '2px 6px' }}
          formatter={(v: any) => [v]}
          labelFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Summary() {
  const { entries, goals, mood } = useFitness();
  if (!goals) return null;

  const last30 = entries.slice(-30);

  const totalExercise = Math.round(last30.reduce((s, e) => s + e.exercise, 0));
  const totalSleep    = +(last30.reduce((s, e) => s + e.sleep, 0)).toFixed(1);
  const startWeight   = last30[0]?.weight;
  const endWeight     = last30[last30.length - 1]?.weight;
  const weightChange  = startWeight && endWeight ? +(endWeight - startWeight).toFixed(1) : null;
  const avgSleep      = last30.length ? +(totalSleep / last30.length).toFixed(1) : 0;

  const exerciseData = last30.map(e => e.exercise);
  const sleepData    = last30.map(e => e.sleep);
  const weightData   = last30.map(e => e.weight);

  const badge = () => {
    if (last30.length === 0) return { label: 'No data yet', color: 'bg-gray-100 text-gray-400', emoji: '📋' };
    const exGoalDays = last30.filter(e => e.exercise >= goals.exerciseGoal).length;
    const pct = exGoalDays / last30.length;
    if (pct >= 0.8) return { label: 'Strong Month! 🏆', color: 'bg-yellow-50 text-yellow-700', emoji: '🥇' };
    if (pct >= 0.5) return { label: 'Keep Going! 💪', color: 'bg-blue-50 text-blue-700', emoji: '💪' };
    return { label: 'Room to Grow 🌱', color: 'bg-green-50 text-green-700', emoji: '🌱' };
  };

  const b = badge();

  return (
    <div className="p-4 pb-24 tab-panel space-y-4">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">30-Day Summary</h2>
          <p className="text-sm text-gray-400">
            {last30.length > 0
              ? `${last30[0].date} → ${last30[last30.length - 1].date}`
              : 'No data logged yet'}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${b.color}`}>
          {b.label}
        </div>
      </div>

      {/* 3 Hero Stats */}
      <div className="space-y-3">
        <HeroCard
          icon="⚡"
          label="Total Exercise"
          value={totalExercise}
          unit="min"
          sub={`${last30.length} days logged`}
          color="#22C55E"
          sparkData={exerciseData}
          sparkColor="#22C55E"
          goalHit={`${last30.filter(e => e.exercise >= goals.exerciseGoal).length} days hit goal`}
        />
        <HeroCard
          icon="😴"
          label="Total Sleep"
          value={totalSleep}
          unit="hrs"
          sub={`Avg ${avgSleep} hrs/night`}
          color="#8B5CF6"
          sparkData={sleepData}
          sparkColor="#8B5CF6"
          goalHit={`${last30.filter(e => e.sleep >= 7).length} nights ≥ 7h`}
        />
        <WeightChangeCard
          startWeight={startWeight}
          endWeight={endWeight}
          change={weightChange}
          goal={goals.goalWeight}
          sparkData={weightData}
        />
      </div>

      {/* Cardio verdict */}
      {last30.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center gap-4">
          <CardioMascot mood={mood} size={90} animate={false} />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Cardio's Verdict</p>
            <p className="text-sm text-gray-700 font-medium leading-relaxed">
              {getMoodMessage(mood, goals.name)}
            </p>
          </div>
        </div>
      )}

      {/* Activity breakdown */}
      {last30.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Activity Breakdown</h3>
          <div className="space-y-3">
            <StatRow label="🔥 Move" value={`${Math.round(last30.reduce((s, e) => s + e.move, 0)).toLocaleString()} cal`}
              sub={`Avg ${Math.round(last30.reduce((s, e) => s + e.move, 0) / last30.length)} cal/day`} />
            <StatRow label="⚡ Exercise" value={`${totalExercise} min`}
              sub={`${Math.round(totalExercise / 60)} hrs total`} />
            <StatRow label="🧍 Stand" value={`${last30.filter(e => e.stand >= goals.standGoal).length} days`}
              sub="hit stand goal" />
            <StatRow label="😴 Sleep" value={`${avgSleep} hrs`} sub="average per night" />
          </div>
        </div>
      )}
    </div>
  );
}

function HeroCard({ icon, label, value, unit, sub, color, sparkData, sparkColor, goalHit }: {
  icon: string; label: string; value: number; unit: string; sub: string;
  color: string; sparkData: number[]; sparkColor: string; goalHit: string;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{icon} {label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value.toLocaleString()}
            <span className="text-base font-normal text-gray-400 ml-1">{unit}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className="text-right">
          <div className="bg-gray-50 rounded-xl px-2.5 py-1 text-xs text-gray-500">{goalHit}</div>
        </div>
      </div>
      {sparkData.length > 1 && <Sparkline data={sparkData} color={sparkColor} />}
    </div>
  );
}

function WeightChangeCard({ startWeight, endWeight, change, goal, sparkData }: {
  startWeight?: number; endWeight?: number; change: number | null;
  goal: number; sparkData: number[];
}) {
  const isDown = change !== null && change < 0;
  const isUp   = change !== null && change > 0;
  const color  = isDown ? '#22C55E' : isUp ? '#EF4444' : '#6B7280';

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">⚖️ Weight Change</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold" style={{ color }}>
              {change !== null ? `${change > 0 ? '+' : ''}${change}` : '—'}
              <span className="text-base font-normal text-gray-400 ml-1">lbs</span>
            </p>
            {isDown ? <TrendingDown size={20} className="text-green-500" />
              : isUp ? <TrendingUp size={20} className="text-red-400" />
              : <Minus size={20} className="text-gray-300" />}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {startWeight ? `${startWeight} → ${endWeight} lbs` : 'No weight data'}
          </p>
        </div>
        <div className="text-right">
          <div className="bg-gray-50 rounded-xl px-2.5 py-1 text-xs text-gray-500">Goal: {goal} lbs</div>
        </div>
      </div>
      {sparkData.length > 1 && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-800">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import ActivityRing from '../ActivityRing';
import { useFitness } from '../../context/FitnessContext';

function fmt(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function FitnessActivity() {
  const { entries, goals } = useFitness();
  const [view, setView] = useState<'trend' | 'bars'>('trend');

  if (!goals) return null;
  const latest = entries[entries.length - 1];
  const last30 = entries.slice(-30);
  const last7  = entries.slice(-7);

  const chartData = last30.map(e => ({
    date: fmt(e.date),
    Move: e.move,
    Exercise: e.exercise,
    Stand: e.stand,
  }));

  const avgMove = last7.length ? Math.round(last7.reduce((s, e) => s + e.move, 0) / last7.length) : 0;
  const avgEx   = last7.length ? Math.round(last7.reduce((s, e) => s + e.exercise, 0) / last7.length) : 0;
  const avgSt   = last7.length ? +(last7.reduce((s, e) => s + e.stand, 0) / last7.length).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* Activity Rings */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Today's Activity</h3>
        {latest ? (
          <div className="flex justify-around">
            <RingWithLabel label="Move" value={latest.move} goal={goals.moveGoal} unit="cal" color="#EF4444" />
            <RingWithLabel label="Exercise" value={latest.exercise} goal={goals.exerciseGoal} unit="min" color="#22C55E" />
            <RingWithLabel label="Stand" value={latest.stand} goal={goals.standGoal} unit="hrs" color="#3B82F6" />
          </div>
        ) : (
          <p className="text-center text-gray-300 text-sm py-6">No data logged yet</p>
        )}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Activity Trend</h3>
          <div className="flex gap-1">
            {(['trend', 'bars'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
                  ${view === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                {v === 'trend' ? 'Line' : 'Bar'}
              </button>
            ))}
          </div>
        </div>

        {chartData.length < 2 ? (
          <div className="text-center py-10 text-gray-300">
            <p className="text-4xl mb-2">⚡</p>
            <p className="text-sm">Log more entries to see your activity trend</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {view === 'trend' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 11 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="Move" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line dataKey="Exercise" stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line dataKey="Stand" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData.slice(-14)} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 11 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Move" fill="#EF4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Exercise" fill="#22C55E" radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* 7-day averages */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">7-Day Averages</h3>
        <div className="space-y-3">
          <AvgBar label="Move" avg={avgMove} goal={goals.moveGoal} unit="cal" color="#EF4444" />
          <AvgBar label="Exercise" avg={avgEx} goal={goals.exerciseGoal} unit="min" color="#22C55E" />
          <AvgBar label="Stand" avg={avgSt} goal={goals.standGoal} unit="hrs" color="#3B82F6" />
        </div>
      </div>
    </div>
  );
}

function RingWithLabel({ label, value, goal, unit, color }: {
  label: string; value: number; goal: number; unit: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ActivityRing value={value} max={goal} color={color} size={80} strokeWidth={9}
        label={String(value)} sublabel={unit} />
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-[10px] text-gray-300">Goal {goal}</span>
    </div>
  );
}

function AvgBar({ label, avg, goal, unit, color }: {
  label: string; avg: number; goal: number; unit: string; color: string;
}) {
  const pct = Math.min(avg / goal, 1);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="text-gray-500">{avg} <span className="text-gray-300 text-xs">/ {goal} {unit}</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

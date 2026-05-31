import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useFitness } from '../../context/FitnessContext';

const RANGES = [7, 14, 30] as const;

function fmt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WeightTrend() {
  const { entries, goals } = useFitness();
  const [range, setRange] = useState<7 | 14 | 30>(30);

  if (!goals) return null;

  const data = entries.slice(-range).map(e => ({ date: fmt(e.date), weight: e.weight }));
  const weights = data.map(d => d.weight);
  const avg  = weights.length ? +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : 0;
  const min  = weights.length ? Math.min(...weights).toFixed(1) : '—';
  const max  = weights.length ? Math.max(...weights).toFixed(1) : '—';
  const chg  = weights.length >= 2 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : 0;
  const latest = entries[entries.length - 1];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Current" value={latest ? `${latest.weight}` : '—'} unit="lbs" color="text-primary" />
        <StatBox label={chg <= 0 ? 'Lost' : 'Gained'} value={chg !== 0 ? `${Math.abs(chg)}` : '0'} unit="lbs"
          color={chg <= 0 ? 'text-green-500' : 'text-red-400'} />
        <StatBox label="Avg" value={String(avg)} unit="lbs" color="text-gray-700" />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Weight Trend</h3>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
                  ${range === r ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {r}d
              </button>
            ))}
          </div>
        </div>

        {data.length < 2 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                domain={[Math.min(...weights) - 3, Math.max(...weights) + 3]}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(v: any) => [`${v} lbs`, 'Weight']}
              />
              <ReferenceLine y={goals.goalWeight} stroke="#EF4444" strokeDasharray="6 3"
                label={{ value: `Goal ${goals.goalWeight}`, position: 'right', fontSize: 10, fill: '#EF4444' }} />
              <Line type="monotone" dataKey="weight" stroke="#4F75FF" strokeWidth={2.5}
                dot={data.length <= 14} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-primary inline-block"/>Actual</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-px border-t-2 border-dashed border-red-400 inline-block"/>Goal</span>
        </div>
      </div>

      {/* History table */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Weight History</h3>
        {entries.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {entries.slice(-7).reverse().map(e => {
              const idx = entries.indexOf(e);
              const prev = idx > 0 ? entries[idx - 1].weight : e.weight;
              const diff = +(e.weight - prev).toFixed(1);
              return (
                <div key={e.date} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{fmt(e.date)}</span>
                  <span className="text-sm font-semibold text-gray-800">{e.weight} lbs</span>
                  <span className={`text-xs font-medium ${diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {diff > 0 ? '+' : ''}{diff !== 0 ? `${diff} lbs` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Min/Max */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Lowest ({range}d)</p>
          <p className="text-xl font-bold text-green-600">{min} <span className="text-sm font-normal">lbs</span></p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Highest ({range}d)</p>
          <p className="text-xl font-bold text-red-400">{max} <span className="text-sm font-normal">lbs</span></p>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value} <span className="text-sm font-normal text-gray-400">{unit}</span></p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 text-gray-300">
      <p className="text-4xl mb-2">📊</p>
      <p className="text-sm">No data yet — log some entries to see your trend!</p>
    </div>
  );
}

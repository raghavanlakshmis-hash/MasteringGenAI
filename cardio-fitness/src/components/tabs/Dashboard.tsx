import React, { useState } from 'react';
import HomePanel from '../dashboard/HomePanel';
import WeightTrend from '../dashboard/WeightTrend';
import FitnessActivity from '../dashboard/FitnessActivity';
import GoalTracking from '../dashboard/GoalTracking';
import Insights from '../dashboard/Insights';

const PANELS = [
  { id: 'home',     label: '🏠 Home' },
  { id: 'weight',   label: '⚖️ Weight' },
  { id: 'activity', label: '⚡ Activity' },
  { id: 'goals',    label: '🎯 Goals' },
  { id: 'insights', label: '💡 Insights' },
] as const;

type PanelId = (typeof PANELS)[number]['id'];

export default function Dashboard() {
  const [active, setActive] = useState<PanelId>('home');

  return (
    <div className="p-4 pb-24 tab-panel">
      {/* Panel nav — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {PANELS.map(p => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap
              ${active === p.id
                ? 'bg-primary text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div key={active} className="tab-panel">
        {active === 'home'     && <HomePanel />}
        {active === 'weight'   && <WeightTrend />}
        {active === 'activity' && <FitnessActivity />}
        {active === 'goals'    && <GoalTracking />}
        {active === 'insights' && <Insights />}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Database, LayoutDashboard, BarChart2, MessageCircle } from 'lucide-react';
import { FitnessProvider, useFitness } from './context/FitnessContext';
import Onboarding from './components/Onboarding';
import DataUpload from './components/tabs/DataUpload';
import Dashboard from './components/tabs/Dashboard';
import Summary from './components/tabs/Summary';
import AIChat from './components/tabs/AIChat';

const TABS = [
  { id: 'data',      label: 'Log',       Icon: Database },
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'summary',   label: 'Summary',   Icon: BarChart2 },
  { id: 'chat',      label: 'AI Chat',   Icon: MessageCircle },
] as const;

type TabId = (typeof TABS)[number]['id'];

function AppShell() {
  const { onboarded } = useFitness();
  const [tab, setTab] = useState<TabId>('dashboard');

  if (!onboarded) return <Onboarding />;

  return (
    <div className="min-h-svh bg-cardio-bg flex justify-center">
      <div className="w-full max-w-md relative">
        {/* Page title bar */}
        <div className="sticky top-0 z-20 bg-cardio-bg/90 backdrop-blur-sm px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐦</span>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">Cardio</h1>
              <p className="text-[10px] text-gray-400">Your Fitness Companion</p>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <main className="min-h-[calc(100svh-130px)]">
          {tab === 'data'      && <DataUpload />}
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'summary'   && <Summary />}
          {tab === 'chat'      && <AIChat />}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30
          bg-white/95 backdrop-blur-md border-t border-gray-100 px-2 pb-safe">
          <div className="flex">
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all
                    ${active ? 'text-primary' : 'text-gray-300 hover:text-gray-500'}`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FitnessProvider>
      <AppShell />
    </FitnessProvider>
  );
}

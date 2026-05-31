import React, { useState } from 'react';
import CardioMascot from './CardioMascot';
import { useFitness } from '../context/FitnessContext';
import { UserGoals } from '../types';

export default function Onboarding() {
  const { completeOnboarding } = useFitness();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<UserGoals>({
    name: '',
    goalWeight: 0,
    moveGoal: 0,
    exerciseGoal: 0,
    standGoal: 0,
  });

  const set = (k: keyof UserGoals, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    completeOnboarding(form);
  };

  return (
    <div className="min-h-screen bg-cardio-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {step === 1 ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <CardioMascot mood="great" size={160} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Hi, I'm Cardio! 👋</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Your personal fitness companion. I'll track your daily activity, cheer you on when you're crushing it, and give you a gentle nudge when you need it!
            </p>
            <div className="text-left mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">What's your name?</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Enter your first name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              onClick={() => form.name.trim() && setStep(2)}
              disabled={!form.name.trim()}
              className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40 hover:bg-blue-600 transition-colors"
            >
              Let's Go! →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-center mb-3">
              <CardioMascot mood="okay" size={100} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-1">Set Your Goals</h2>
            <p className="text-gray-400 text-xs text-center mb-6">You can always change these later</p>

            <div className="space-y-5">
              <GoalSlider
                label="🎯 Goal Weight"
                unit="lbs"
                value={form.goalWeight}
                min={0} max={300} step={1}
                onChange={v => set('goalWeight', v)}
              />
              <GoalSlider
                label="🔥 Daily Move Goal"
                unit="cal"
                value={form.moveGoal}
                min={0} max={1200} step={50}
                onChange={v => set('moveGoal', v)}
              />
              <GoalSlider
                label="⚡ Exercise Goal"
                unit="min/day"
                value={form.exerciseGoal}
                min={0} max={120} step={5}
                onChange={v => set('exerciseGoal', v)}
              />
              <GoalSlider
                label="🧍 Stand Goal"
                unit="hrs/day"
                value={form.standGoal}
                min={0} max={16} step={1}
                onChange={v => set('standGoal', v)}
              />
            </div>

            <div className="flex gap-3 mt-7">
              <button
                onClick={() => {
                  setForm(f => ({ name: f.name, goalWeight: 0, moveGoal: 0, exerciseGoal: 0, standGoal: 0 }));
                  setStep(1);
                }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                className="flex-[2] bg-primary text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-600 transition-colors"
              >
                Start Tracking! 🚀
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          All data stays on your device · No account needed
        </p>
      </div>
    </div>
  );
}

function GoalSlider({ label, unit, value, min, max, step, onChange }: {
  label: string; unit: string; value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-primary">{value} <span className="font-normal text-gray-400">{unit}</span></span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-primary-light rounded-full appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

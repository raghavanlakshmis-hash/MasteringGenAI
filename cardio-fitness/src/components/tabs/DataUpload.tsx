import React, { useState, useRef } from 'react';
import { Upload, Plus, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import CardioMascot from '../CardioMascot';
import { useFitness } from '../../context/FitnessContext';
import { parseCSV } from '../../lib/csvParser';
import { FitnessEntry } from '../../types';

function today() {
  return new Date().toISOString().split('T')[0];
}

const DEFAULT_FORM: Omit<FitnessEntry, 'date'> = {
  weight: 150, move: 0, exercise: 0, stand: 0, sleep: 7,
};

export default function DataUpload() {
  const { goals, addEntry, bulkImport, mood } = useFitness();
  const [date, setDate] = useState(today());
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saved, setSaved] = useState(false);
  const [csvStatus, setCsvStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [csvMsg, setCsvMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: number) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    addEntry({ date, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setCsvStatus('error');
      setCsvMsg('Please upload a .csv file');
      return;
    }
    try {
      const entries = await parseCSV(file);
      if (entries.length === 0) throw new Error('No valid rows found');
      bulkImport(entries);
      setCsvStatus('success');
      setCsvMsg(`Imported ${entries.length} entries successfully!`);
    } catch (e: any) {
      setCsvStatus('error');
      setCsvMsg(e.message || 'Failed to parse CSV');
    }
    setTimeout(() => setCsvStatus('idle'), 4000);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="p-4 space-y-4 tab-panel pb-24">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm">
        <CardioMascot mood={mood} size={90} />
        <div>
          <h2 className="text-lg font-bold text-gray-800">Log Your Activity</h2>
          <p className="text-sm text-gray-400">Every little bit counts!</p>
        </div>
      </div>

      {/* Manual Entry Card */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-primary-light rounded-xl flex items-center justify-center">
            <Plus size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-gray-800">Enter Today's Data</h3>
        </div>

        {/* Date picker */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
            <Calendar size={14} /> Date
          </label>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <DataSlider label="⚖️ Weight" unit="lbs" value={form.weight}
            min={100} max={350} step={0.5} goal={goals?.goalWeight}
            onChange={v => set('weight', v)} color="#4F75FF" />
          <DataSlider label="🔥 Move" unit="cal" value={form.move}
            min={0} max={1500} step={10} goal={goals?.moveGoal}
            onChange={v => set('move', v)} color="#EF4444" />
          <DataSlider label="⚡ Exercise" unit="min" value={form.exercise}
            min={0} max={180} step={5} goal={goals?.exerciseGoal}
            onChange={v => set('exercise', v)} color="#22C55E" />
          <DataSlider label="🧍 Stand" unit="hrs" value={form.stand}
            min={0} max={18} step={0.5} goal={goals?.standGoal}
            onChange={v => set('stand', v)} color="#3B82F6" />
          <DataSlider label="😴 Sleep" unit="hrs" value={form.sleep}
            min={0} max={12} step={0.5} goal={8}
            onChange={v => set('sleep', v)} color="#8B5CF6" />
        </div>

        <button
          onClick={handleSave}
          className={`w-full mt-5 py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2
            ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-blue-600'}`}
        >
          {saved ? <><CheckCircle size={16} /> Saved!</> : '💾 Save Today\'s Data'}
        </button>
      </div>

      {/* CSV Upload Card */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Upload size={16} className="text-indigo-500" />
          </div>
          <h3 className="font-semibold text-gray-800">Upload CSV</h3>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700 space-y-0.5">
          <p className="font-medium mb-1">CSV should include columns:</p>
          {['Date', 'weight in LB', 'Move', 'Exercise', 'Stand', 'Sleep hours'].map(c => (
            <p key={c} className="flex items-center gap-1"><span className="text-blue-400">•</span>{c}</p>
          ))}
        </div>

        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-primary hover:bg-primary-light'}`}
        >
          <Upload size={28} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Drag & drop your CSV here</p>
          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {csvStatus !== 'idle' && (
          <div className={`mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-xl
            ${csvStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {csvStatus === 'success'
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />}
            {csvMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function DataSlider({ label, unit, value, min, max, step, goal, onChange, color }: {
  label: string; unit: string; value: number;
  min: number; max: number; step: number;
  goal?: number; onChange: (v: number) => void; color: string;
}) {
  const pct = goal ? Math.min(value / goal, 1) : 0;
  const atGoal = goal && value >= goal;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-800">{value}</span>
          <span className="text-xs text-gray-400">{unit}</span>
          {goal && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
              ${atGoal ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              / {goal}
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: color }}
        />
        {goal && (
          <div className="h-1.5 rounded-full mt-1 overflow-hidden bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct * 100}%`, backgroundColor: atGoal ? '#22C55E' : color }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

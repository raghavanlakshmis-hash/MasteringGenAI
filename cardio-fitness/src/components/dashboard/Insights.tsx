import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import CardioMascot from '../CardioMascot';
import { useFitness } from '../../context/FitnessContext';
import { askClaude } from '../../lib/claude';
import { calcHealthScore } from '../../lib/moodEngine';

function ScoreGauge({ score }: { score: number }) {
  const radius = 50;
  const circ   = Math.PI * radius; // half circle
  const offset = circ * (1 - score / 100);
  const color  = score >= 75 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 130, height: 70 }}>
        <svg width={130} height={70} viewBox="0 0 130 70">
          <path d="M10 65 A55 55 0 0 1 120 65" fill="none" stroke="#EEF2FF" strokeWidth={14} />
          <path
            d="M10 65 A55 55 0 0 1 120 65" fill="none"
            stroke={color} strokeWidth={14} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-end justify-end pb-1 pr-0">
          <span className="text-3xl font-bold text-gray-800 w-full text-center">{score}</span>
        </div>
      </div>
      <span className="text-xs text-gray-400 -mt-1">Health Score / 100</span>
    </div>
  );
}

export default function Insights() {
  const { entries, goals, mood } = useFitness();
  const [insights, setInsights] = useState<string[]>([]);
  const [recs, setRecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!goals) return null;

  const score = calcHealthScore(entries, goals);

  const buildContext = () => {
    const recent = entries.slice(-14);
    return JSON.stringify({ recentEntries: recent, goals, currentScore: score });
  };

  const fetchInsights = async () => {
    if (entries.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const system = `You are Cardio, a friendly fitness coach. Given the user's fitness data, provide exactly 3 key insights and 3 actionable recommendations.
Respond ONLY with valid JSON in this shape: {"insights":["...","...","..."],"recommendations":["...","...","..."]}
Keep each item under 60 words. Be specific, encouraging, and data-driven.`;

      const text = await askClaude(
        [{ role: 'user', content: `Here is my fitness data: ${buildContext()}. Give me insights and recommendations.` }],
        system,
      );
      const parsed = JSON.parse(text.trim());
      setInsights(parsed.insights || []);
      setRecs(parsed.recommendations || []);
    } catch (e: any) {
      setError(e.message || 'Could not load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entries.length > 0 && insights.length === 0) fetchInsights();
  }, [entries.length]);

  return (
    <div className="space-y-4">
      {/* Health Score */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">Health Score</h3>
          <div className={`text-xs px-2.5 py-1 rounded-full font-medium
            ${score >= 75 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
            {score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs work'}
          </div>
        </div>
        <ScoreGauge score={score} />
        <p className="text-xs text-gray-400 text-center mt-2">
          Based on activity goals, sleep quality, and weight progress
        </p>
      </div>

      {/* Cardio mood */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-5 flex items-center gap-4">
        <CardioMascot mood={mood} size={80} animate={false} />
        <div>
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Cardio says</p>
          <p className="text-sm font-medium text-gray-700 leading-relaxed">
            {score >= 75 ? "You're absolutely CRUSHING your goals! Keep this momentum going! 🔥"
             : score >= 50 ? "You're doing great! A few tweaks and we're in the top tier! 💪"
             : "I believe in you! Let's build those habits back up together! 🌟"}
          </p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-500" />
            <h3 className="font-semibold text-gray-800">Key Insights</h3>
          </div>
          <button onClick={fetchInsights} disabled={loading || entries.length === 0}
            className="text-gray-300 hover:text-primary transition-colors disabled:opacity-30">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-4">Add some data to get AI-powered insights</p>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Recommendations</h3>
          <div className="space-y-2">
            {recs.map((rec, i) => (
              <div key={i} className="flex gap-3 p-3 bg-green-50 rounded-xl">
                <span className="text-base flex-shrink-0">
                  {['🏃', '💧', '🥗'][i % 3]}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

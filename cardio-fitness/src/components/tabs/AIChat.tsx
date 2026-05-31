import React, { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import CardioMascot from '../CardioMascot';
import { useFitness } from '../../context/FitnessContext';
import { askClaude } from '../../lib/claude';
import { ChatMessage } from '../../types';

const STARTERS = [
  'How did I do last week vs the week before?',
  'Am I sleeping enough?',
  'What was my best week this month?',
  'How close am I to my goal weight?',
  'What should I focus on to improve?',
];

function buildSystem(entries: ReturnType<typeof useFitness>['entries'], goals: NonNullable<ReturnType<typeof useFitness>['goals']>) {
  return `You are Cardio, a friendly and upbeat personal fitness coach. Answer questions about the user's fitness data.

User: ${goals.name} | Goal weight: ${goals.goalWeight} lbs | Daily goals: Move ${goals.moveGoal} cal · Exercise ${goals.exerciseGoal} min · Stand ${goals.standGoal} hrs

Fitness history (${entries.length} entries):
${JSON.stringify(entries)}

RESPONSE RULES — follow these strictly:
1. Keep total response under 100 words.
2. Use bullet points (• ) for any list of stats, tips, or comparisons. Never write long paragraphs.
3. Each paragraph or section: max 2 sentences.
4. Lead with the key number or takeaway first, then the insight.
5. Be specific — reference actual numbers from the data.
6. Be encouraging but concise. No filler phrases.
7. For week comparisons: compute actual averages, show the diff as a number.
8. For sleep questions: compare to the 7–9 hr recommended range.`;
}

export default function AIChat() {
  const { entries, goals, mood } = useFitness();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!goals) return null;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const reply = await askClaude(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        buildSystem(entries, goals),
      );
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div className="flex flex-col h-[calc(100svh-130px)] tab-panel">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-800">AI Analyst</h2>
          <p className="text-xs text-gray-400">Ask Cardio anything about your fitness</p>
        </div>
        <button onClick={reset} className="p-2 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center pt-4 gap-3">
            <CardioMascot mood={mood} size={130} />
            <div className="text-center">
              <p className="font-semibold text-gray-700">Hey {goals.name.split(' ')[0]}! 👋</p>
              <p className="text-sm text-gray-400 mt-1">Ask me anything about your fitness journey</p>
            </div>
            {/* Starter chips */}
            <div className="flex flex-col gap-2 w-full mt-2">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm bg-white border border-gray-100 rounded-2xl px-4 py-2.5 text-gray-600 hover:border-primary hover:text-primary hover:bg-primary-light transition-all shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  <CardioMascot mood={loading && i === messages.length - 1 ? 'okay' : mood} size={36} animate={false} />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-white text-gray-700 shadow-sm rounded-bl-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <CardioMascot mood="okay" size={36} animate={false} />
            <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300"
                    style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-red-400 bg-red-50 rounded-xl px-4 py-2">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-24 pt-2 flex-shrink-0">
        <div className="flex gap-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about your fitness..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-300 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-30 hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

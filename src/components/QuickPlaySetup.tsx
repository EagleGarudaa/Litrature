import { useState } from 'react';
import { Bot, ArrowLeft, Loader2, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface QuickPlaySetupProps {
  onStart: (humanId: string) => Promise<void>;
  onBack: () => void;
}

export function QuickPlaySetup({ onStart, onBack }: QuickPlaySetupProps) {
  const { user, signInAnonymously } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name to continue.');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Name must be 2–20 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let humanId = user?.id ?? null;

      if (!humanId) {
        const newUser = await signInAnonymously(trimmed);
        humanId = newUser?.id ?? null;
      }

      if (!humanId) {
        setError('Failed to create a guest session. Please try again.');
        setLoading(false);
        return;
      }

      await onStart(humanId);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-parchment-400 hover:text-parchment-200 transition-colors mb-8 font-ornate text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="bg-gradient-to-br from-amber-950/80 to-stone-950/80 backdrop-blur-sm rounded-2xl border-2 border-golden-900/40 shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-golden-600 to-amber-800 border-4 border-golden-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-4">
              <Bot size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-ornate font-bold text-golden-300 mb-2">Play vs AI</h1>
            <p className="text-parchment-400 text-sm leading-relaxed">
              Jump straight into a game against 5 AI opponents — no sign-in required.
              You play as Team A, AIs fill both teams.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-parchment-300 font-ornate text-sm mb-2">
                Your Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full bg-stone-900/70 border-2 border-golden-900/50 focus:border-golden-500 rounded-lg px-4 py-3 text-parchment-100 placeholder-parchment-600 font-display outline-none transition-colors"
              />
              {error && <p className="text-red-400 text-xs mt-1 font-ornate">{error}</p>}
            </div>

            <div className="bg-stone-900/40 rounded-lg p-4 border border-golden-900/20 space-y-2">
              <p className="text-parchment-400 text-xs font-ornate font-semibold uppercase tracking-wider">Game Setup</p>
              <ul className="text-parchment-500 text-xs space-y-1 font-display">
                <li>3 vs 3 (you + 2 teammates vs 3 opponents)</li>
                <li>AI difficulty: intermediate</li>
                <li>All 8 card sets in play</li>
                <li>You take the first turn</li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-golden-600 to-golden-800 hover:from-golden-500 hover:to-golden-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-ornate font-bold py-4 px-6 rounded-lg transition-all border-2 border-golden-400 shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Setting up game...
                </>
              ) : (
                <>
                  <Play size={20} className="fill-current" />
                  Start Game
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

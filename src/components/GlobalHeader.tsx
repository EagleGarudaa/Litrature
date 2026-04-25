import { useState } from 'react';
import { BookOpen, Home, GraduationCap } from 'lucide-react';
import { GameRules } from './GameRules';

interface GlobalHeaderProps {
  showHomeButton?: boolean;
  showLearnerModeToggle?: boolean;
  learnerModeActive?: boolean;
  onHomeClick?: () => void;
  onLearnerModeToggle?: () => void;
}

export function GlobalHeader({
  showHomeButton = false,
  showLearnerModeToggle = false,
  learnerModeActive = false,
  onHomeClick,
  onLearnerModeToggle,
}: GlobalHeaderProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <header className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              Literature
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {showHomeButton && onHomeClick && (
              <button
                onClick={onHomeClick}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Lobby</span>
              </button>
            )}

            {showLearnerModeToggle && onLearnerModeToggle && (
              <button
                onClick={onLearnerModeToggle}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                  learnerModeActive
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {learnerModeActive ? 'Coaching ON' : 'Learner Mode'}
                </span>
              </button>
            )}

            <button
              onClick={() => setShowRules(true)}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Rules</span>
            </button>
          </div>
        </div>
      </header>

      {showRules && <GameRules onClose={() => setShowRules(false)} />}
    </>
  );
}

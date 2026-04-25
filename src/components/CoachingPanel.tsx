import { useState } from 'react';
import { X, GraduationCap, ChevronDown, ChevronUp, Settings, Trash2 } from 'lucide-react';
import { CoachingMessage, CoachingIntensity } from '../lib/aiCoach';

interface CoachingPanelProps {
  messages: CoachingMessage[];
  intensity: CoachingIntensity;
  onIntensityChange: (intensity: CoachingIntensity) => void;
  onClose: () => void;
  onClearHistory: () => void;
}

export function CoachingPanel({
  messages,
  intensity,
  onIntensityChange,
  onClose,
  onClearHistory,
}: CoachingPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getPriorityColor = (priority: CoachingMessage['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-rose-500 bg-rose-50';
      case 'important':
        return 'border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getTypeIcon = (type: CoachingMessage['type']) => {
    switch (type) {
      case 'suggestion':
        return '💡';
      case 'explanation':
        return '📚';
      case 'warning':
        return '⚠️';
      case 'praise':
        return '🌟';
      case 'analysis':
        return '📊';
      default:
        return '💬';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border-2 border-violet-300 flex flex-col max-h-[600px] z-40">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          <h3 className="font-bold text-lg">AI Coach</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Close Coach"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {showSettings && (
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Coaching Level</label>
                  <div className="flex gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as CoachingIntensity[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => onIntensityChange(level)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          intensity === level
                            ? 'bg-violet-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-300 hover:border-violet-400'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={onClearHistory}
                  className="w-full py-2 px-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Your AI coach will provide guidance here as you play.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${getPriorityColor(message.priority)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getTypeIcon(message.type)}</span>
                    <div className="flex-1 text-sm text-slate-700 whitespace-pre-line">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <p className="text-xs text-slate-600 text-center">
              Coaching Level: <span className="font-semibold text-violet-600">{intensity}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

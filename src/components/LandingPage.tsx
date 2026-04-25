import { BookOpen, Play, GraduationCap, Bot } from 'lucide-react';
import { useState } from 'react';
import { GameRules } from './GameRules';

interface LandingPageProps {
  onPlayNow: () => void;
  onPlayVsAI: () => void;
}

export function LandingPage({ onPlayNow, onPlayVsAI }: LandingPageProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="space-y-6">
            <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600">
              Literature
            </h1>
            <p className="text-2xl text-slate-700 font-medium">
              Master the Art of Strategy, Memory & Team Coordination
            </p>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Experience the classic Indian card game where teams compete to claim complete sets through strategic calling,
              deduction, and seamless teamwork. Perfect your skills with AI coaching and compete with friends in real-time.
            </p>
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-red-800 font-semibold">
                <span className="text-red-900 font-bold">Ethics First:</span> Never discuss or disclose your cards with other players. The game's integrity depends on memory and deduction, not external communication.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onPlayVsAI}
              className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xl font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
            >
              <Bot className="w-6 h-6" />
              Play vs AI
              <span className="text-sm font-normal opacity-80 ml-1">no sign-in</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 blur transition-opacity -z-10"></div>
            </button>

            <button
              onClick={onPlayNow}
              className="group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xl font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
            >
              <Play className="w-6 h-6 fill-current" />
              Play Online
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 blur transition-opacity -z-10"></div>
            </button>

            <button
              onClick={() => setShowRules(true)}
              className="px-10 py-5 bg-white text-slate-700 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl border-2 border-slate-200 hover:border-emerald-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
            >
              <BookOpen className="w-6 h-6" />
              How to Play
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">AI Coaching</h3>
              <p className="text-slate-600 leading-relaxed">
                Learn from an intelligent AI coach that analyzes every move, explains strategies, and helps you master
                advanced techniques in real-time.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Team Strategy</h3>
              <p className="text-slate-600 leading-relaxed">
                Coordinate with your teammate through subtle signals, strategic calls, and intra-team collection to outsmart opponents.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Memory & Deduction</h3>
              <p className="text-slate-600 leading-relaxed">
                Track cards, deduce locations from failed calls, and use probability to make optimal decisions that lead to victory.
              </p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <p className="text-slate-700 text-sm leading-relaxed">
              <span className="font-semibold text-amber-800">New to Literature?</span> Don't worry! Our AI coach will guide you
              through every turn, teaching you strategies and helping you improve with each game. Turn on Learner Mode to get started.
            </p>
          </div>
        </div>
      </div>

      {showRules && <GameRules onClose={() => setShowRules(false)} />}
    </>
  );
}

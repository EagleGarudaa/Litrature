import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthForm } from './components/AuthForm';
import { UsernameSetup } from './components/UsernameSetup';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { GameTable } from './components/GameTable';
import { GameComplete } from './components/GameComplete';
import { QuickPlaySetup } from './components/QuickPlaySetup';
import { supabase } from './lib/supabase';
import { startQuickPlayGame } from './lib/aiEngine';

type GameState = 'landing' | 'auth' | 'username-setup' | 'lobby' | 'waiting' | 'playing' | 'complete' | 'quick-play-setup';

function AppContent() {
  const { user, loading } = useAuth();
  const [gameState, setGameState] = useState<GameState>('landing');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const gameStateRef = useRef<GameState>('landing');

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (currentGameId) {
      const channel = supabase
        .channel(`game-state-${currentGameId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${currentGameId}`,
          },
          (payload) => {
            const game = payload.new;
            if (game.status === 'in_progress' && gameStateRef.current !== 'playing') {
              setGameState('playing');
            } else if (game.status === 'completed' && gameStateRef.current !== 'complete') {
              setGameState('complete');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentGameId]);

  const handleJoinGame = (gameId: string) => {
    setCurrentGameId(gameId);
    setGameState('waiting');
  };

  const handleGameStart = () => {
    setGameState('playing');
  };

  const handleLeaveGame = () => {
    setCurrentGameId(null);
    setGameState('lobby');
  };

  const handleReturnToLobby = () => {
    setCurrentGameId(null);
    setGameState('lobby');
  };

  const handleNavigateToLobby = () => {
    setGameState('lobby');
  };

  const handlePlayVsAI = () => {
    setGameState('quick-play-setup');
  };

  const handleQuickPlayStart = async (humanId: string) => {
    const gameId = await startQuickPlayGame(humanId);
    if (gameId) {
      setCurrentGameId(gameId);
      setGameState('playing');
    }
  };

  useEffect(() => {
    if (!user) {
      if (gameStateRef.current !== 'landing' && gameStateRef.current !== 'auth') {
        setGameState('landing');
        setCurrentGameId(null);
      }
      return;
    }

    const checkExistingGame = async () => {
      const { data: playerGame } = await supabase
        .from('game_players')
        .select('game_id, games(id, status)')
        .eq('player_id', user.id)
        .maybeSingle();

      if (playerGame && playerGame.games) {
        const game = Array.isArray(playerGame.games) ? playerGame.games[0] : playerGame.games;
        setCurrentGameId(game.id);

        if (game.status === 'waiting') {
          setGameState('waiting');
        } else if (game.status === 'in_progress') {
          setGameState('playing');
        } else if (game.status === 'completed') {
          setGameState('complete');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('player_profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.username) {
        setGameState('lobby');
      } else {
        setGameState('username-setup');
      }
    };

    checkExistingGame();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user && gameState === 'quick-play-setup') {
    return (
      <QuickPlaySetup
        onStart={handleQuickPlayStart}
        onBack={() => setGameState('landing')}
      />
    );
  }

  if (!user && gameState === 'landing') {
    return <LandingPage onPlayNow={() => setGameState('auth')} onPlayVsAI={handlePlayVsAI} />;
  }

  if (!user && gameState === 'auth') {
    return <AuthForm />;
  }

  if (gameState === 'quick-play-setup') {
    return (
      <QuickPlaySetup
        onStart={handleQuickPlayStart}
        onBack={() => setGameState(user ? 'lobby' : 'landing')}
      />
    );
  }

  if (user && gameState === 'username-setup') {
    return <UsernameSetup onComplete={() => setGameState('lobby')} />;
  }

  if (gameState === 'lobby') {
    return <Lobby onJoinGame={handleJoinGame} onPlayVsAI={handlePlayVsAI} />;
  }

  if (gameState === 'waiting' && currentGameId) {
    return (
      <WaitingRoom
        gameId={currentGameId}
        onGameStart={handleGameStart}
        onLeave={handleLeaveGame}
        onNavigateToLobby={handleNavigateToLobby}
      />
    );
  }

  if (gameState === 'playing' && currentGameId) {
    return <GameTable gameId={currentGameId} onLeave={handleLeaveGame} />;
  }

  if (gameState === 'complete' && currentGameId) {
    return <GameComplete gameId={currentGameId} onReturnToLobby={handleReturnToLobby} />;
  }

  return null;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

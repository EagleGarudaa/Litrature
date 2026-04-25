import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  player_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface TeamChatProps {
  gameId: string;
  team: 'team_a' | 'team_b';
}

export function TeamChat({ gameId, team }: TeamChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`team-chat-${gameId}-${team}`)
      .on(
        'broadcast',
        { event: 'message' },
        (payload) => {
          setMessages(prev => [...prev, payload.payload as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, team]);

  const loadMessages = async () => {
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { data: profile } = await supabase
      .from('player_profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const message: Message = {
      id: crypto.randomUUID(),
      player_id: user.id,
      username: profile?.username || 'Player',
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    const channel = supabase.channel(`team-chat-${gameId}-${team}`);
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    scrollToBottom();
  };

  return (
    <div className="bg-slate-700 rounded-2xl p-4 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Team {team === 'team_a' ? 'A' : 'B'} Chat</h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg ${
              msg.player_id === user?.id
                ? 'bg-blue-600 ml-4'
                : 'bg-slate-600 mr-4'
            }`}
          >
            <div className="text-xs text-slate-300 mb-1">{msg.username}</div>
            <div className="text-sm">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">
            Team chat - coordinate your strategy!
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

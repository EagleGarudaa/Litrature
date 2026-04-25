import { X } from 'lucide-react';

interface GameRulesProps {
  onClose: () => void;
}

export function GameRules({ onClose }: GameRulesProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold">How to Play Literature</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close rules"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-8 space-y-8">
          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-emerald-500 pb-2">Game Overview</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Literature is a team-based card game for 4 or 6 players. Players form two teams and compete to claim complete sets
              of cards by asking for specific cards from opponents and teammates. The game combines memory, deduction, and strategic
              team coordination.
            </p>
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
              <p className="text-slate-700 font-medium">
                <span className="font-bold text-emerald-700">Objective:</span> Be the first team to claim 5 complete sets
                and have the highest points to win the game.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-red-600 pb-2">Code of Ethics</h3>
            <div className="bg-red-50 border-4 border-red-600 p-6 rounded-lg shadow-lg">
              <p className="text-slate-900 leading-relaxed mb-4 font-semibold text-lg">
                The integrity of Literature depends on players <span className="text-red-700 font-bold">NOT discussing or disclosing their cards</span> with other players through any means outside the game.
              </p>
              <div className="bg-white/80 p-4 rounded border-2 border-red-400 mb-4">
                <p className="text-slate-800 font-bold mb-2 text-red-800">Absolutely Forbidden:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-2">
                  <li>Verbally telling teammates or opponents which cards you hold</li>
                  <li>Using external communication (phone, chat, gestures, signals)</li>
                  <li>Showing your cards to anyone</li>
                  <li>Discussing card locations or giving hints outside the game mechanics</li>
                  <li>Any form of collusion or information sharing beyond in-game actions</li>
                </ul>
              </div>
              <p className="text-slate-700 leading-relaxed mb-3">
                <span className="font-bold text-red-700">Why This Matters:</span> The essence of Literature lies in memory, deduction, and strategic questioning. When players share card information outside the game, it:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mb-4">
                <li>Destroys the fundamental challenge and skill required</li>
                <li>Ruins the game experience for everyone</li>
                <li>Makes the game trivial and pointless</li>
                <li>Eliminates the excitement and satisfaction of successful deduction</li>
              </ul>
              <div className="bg-gradient-to-r from-red-100 to-orange-100 p-4 rounded border-2 border-red-500">
                <p className="text-slate-800 font-bold text-center text-lg">
                  Play with honor. Respect the game. Keep your cards secret.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-emerald-500 pb-2">Card Sets & Points</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-2">Minor Sets (5 points each set)</h4>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Low Clubs: 2♣, 3♣, 4♣, 5♣, 6♣, 7♣</li>
                  <li>Low Diamonds: 2♦, 3♦, 4♦, 5♦, 6♦, 7♦</li>
                  <li>Low Hearts: 2♥, 3♥, 4♥, 5♥, 6♥, 7♥</li>
                  <li>Low Spades: 2♠, 3♠, 4♠, 5♠, 6♠, 7♠</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-2">Major Sets (10 points each set)</h4>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>High Clubs: 9♣, 10♣, J♣, Q♣, K♣, A♣</li>
                  <li>High Diamonds: 9♦, 10♦, J♦, Q♦, K♦, A♦</li>
                  <li>High Hearts: 9♥, 10♥, J♥, Q♥, K♥, A♥</li>
                  <li>High Spades: 9♠, 10♠, J♠, Q♠, K♠, A♠</li>
                </ul>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-slate-700">
                  <span className="font-bold text-blue-700">Total:</span> 8 sets in the game. The team that claims 5 sets first wins,
                  but points determine the winner if both teams claim sets simultaneously.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-emerald-500 pb-2">Basic Gameplay</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-2">Turn Sequence</h4>
                <ol className="list-decimal list-inside text-slate-700 space-y-2 ml-4">
                  <li>On your turn, you must ask a <span className="font-bold text-emerald-700">specific opponent player</span> for a specific card</li>
                  <li>You can only ask for a card from a set that you already hold at least one card from</li>
                  <li>If the opponent player has the card, they must give it to you and you continue your turn</li>
                  <li>If the opponent player doesn't have the card, your turn ends and it becomes that player's turn</li>
                  <li>When you believe your team has all 6 cards of a set, you can declare the set</li>
                  <li>If correct, your team claims the set and earns points. If wrong, the set goes to the opponent team</li>
                </ol>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <p className="text-slate-700">
                  <span className="font-bold text-amber-700">Important:</span> During normal play, you ONLY ask cards from <span className="font-bold">opponent players</span>, never from your own teammates. You cannot ask your teammates for cards until you're ready to do an intra-team collection (see Advanced Strategy below).
                </p>
              </div>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <p className="text-slate-700">
                  <span className="font-bold text-amber-700">Important:</span> You can only ask for cards from sets where you
                  currently hold at least one card. This prevents random guessing and adds strategic depth.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-emerald-500 pb-2">Intra-Team Collection (Advanced)</h3>
            <div className="bg-indigo-50 border-2 border-indigo-500 p-4 rounded mb-4">
              <p className="text-slate-700 leading-relaxed font-semibold text-indigo-900">
                This is a SEPARATE special procedure from normal gameplay. Use this ONLY when you're confident about which specific teammate holds which cards.
              </p>
            </div>
            <p className="text-slate-700 leading-relaxed mb-4">
              When you believe your team collectively holds all 6 cards of a set AND you know which specific teammate has which cards, you can initiate intra-team collection:
            </p>
            <div className="space-y-4">
              <ol className="list-decimal list-inside text-slate-700 space-y-3 ml-4">
                <li>
                  <span className="font-semibold">Toggle Intra-Team Mode:</span> Activate the "Same Team Call" button when making your call
                </li>
                <li>
                  <span className="font-semibold">Your Cards Become Visible:</span> All cards you hold from that set become visible to all players
                </li>
                <li>
                  <span className="font-semibold">Call Cards Sequentially:</span> Call each missing card one by one from your teammate
                </li>
                <li>
                  <span className="font-semibold">Teammate Submits Card:</span> When your teammate has the card, they see a popout indicator
                  and submit it to you
                </li>
                <li>
                  <span className="font-semibold">Complete the Collection:</span> Continue calling until you've collected all 6 cards, then declare the set
                </li>
              </ol>

              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded mt-4">
                <p className="text-slate-700 mb-2">
                  <span className="font-bold text-rose-700">CRITICAL - Penalty for Wrong Intra-Team Call:</span> If you call a card from a specific teammate but a DIFFERENT player has it (even if that player is on your own team), this is a FAILED call:
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>A "FAILED!" stamp appears dramatically on screen</li>
                  <li>The player who actually holds the card reveals it</li>
                  <li>All your cards from that set transfer to the opponent team</li>
                  <li>The set now belongs to the opponent team</li>
                  <li>Even if your other teammate had the card, calling from the wrong teammate is a fail</li>
                </ul>
                <p className="text-slate-700 mt-3 font-semibold text-rose-700">
                  You must call the card from the EXACT player who holds it, even within your own team!
                </p>
              </div>

              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded mt-4">
                <p className="text-slate-700 mb-2">
                  <span className="font-bold text-emerald-700">Key Difference from Normal Play:</span>
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><span className="font-bold">Normal Play:</span> You ask opponent players for cards until you know the card locations through deduction</li>
                  <li><span className="font-bold">Intra-Team Collection:</span> You ONLY use this when confident about which specific teammate has the cards</li>
                  <li>During intra-team collection, you specify which exact teammate you're calling from</li>
                </ul>
              </div>

              <div className="bg-slate-100 p-4 rounded-lg mt-4">
                <h5 className="font-semibold text-slate-800 mb-2">Example:</h5>
                <p className="text-slate-700 text-sm leading-relaxed">
                  You hold 9♣, 10♣, J♣ and through gameplay deduction, you know your teammate Alice holds Q♣, K♣, A♣. You activate intra-team mode,
                  and your three clubs become visible to everyone. You call "Q♣ from Alice" - if she has it,
                  she submits it to you. You continue with "K♣ from Alice", then "A♣ from Alice". Once you have all six cards, you declare
                  High Clubs and claim 10 points for your team.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-emerald-500 pb-2">Strategy Tips</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h4 className="font-semibold text-emerald-800 mb-2">Memory & Tracking</h4>
                <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                  <li>Remember which calls succeeded and failed</li>
                  <li>Track which cards have been transferred</li>
                  <li>Deduce card locations from opponent behavior</li>
                  <li>Focus on fewer sets to manage memory better</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Team Coordination</h4>
                <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                  <li>Use strategic calls to signal information</li>
                  <li>Coordinate which sets each player focuses on</li>
                  <li>Time your intra-team collections carefully</li>
                  <li>Avoid starting too many sets simultaneously</li>
                </ul>
              </div>
              <div className="bg-violet-50 p-4 rounded-lg">
                <h4 className="font-semibold text-violet-800 mb-2">Deduction</h4>
                <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                  <li>Failed calls reveal card locations</li>
                  <li>Successful calls show opponent knowledge</li>
                  <li>Watch patterns in opponent targeting</li>
                  <li>Calculate probabilities before declaring</li>
                </ul>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-2">Advanced Play</h4>
                <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                  <li>Intentional fails can signal teammates</li>
                  <li>Block opponents from completing sets</li>
                  <li>Time declarations to maximize points</li>
                  <li>Protect cards from intra-team failures</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-emerald-500 pb-2">Winning the Game</h3>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg">
              <p className="text-slate-700 leading-relaxed mb-3">
                The game ends when <span className="font-bold text-emerald-700">all cards have been collected</span> and no cards remain in players' possession. All 8 sets will have been claimed by the teams.
              </p>
              <p className="text-slate-700 leading-relaxed mb-3">
                The team with the <span className="font-bold text-teal-700">highest total points</span> wins the game. Points are calculated from claimed sets:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mb-3">
                <li>Major sets (9-A): 10 points each set</li>
                <li>Minor sets (2-7): 5 points each set</li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                <span className="font-bold text-amber-700">Draw:</span> If both teams have equal points when all cards are collected, the game ends in a draw.
              </p>
            </div>
          </section>

          <section className="bg-gradient-to-r from-violet-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-violet-800 mb-3">Ready to Learn?</h3>
            <p className="text-slate-700 leading-relaxed">
              Enable <span className="font-semibold text-violet-700">Learner Mode</span> during gameplay to receive real-time coaching
              from our AI. The AI coach will explain opponent moves, suggest optimal plays, teach you strategic concepts, and help you
              improve with every game. A flashing <span className="font-semibold">TRAINEE</span> badge will appear next to your name
              so other players know you're learning.
            </p>
          </section>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-colors"
          >
            Got it! Let's Play
          </button>
        </div>
      </div>
    </div>
  );
}

import { Card, getSuitSymbol, getSuitColor } from '../lib/gameLogic';

interface CardHandProps {
  cards: Card[];
  selectedCard: Card | null;
  onSelectCard: (card: Card) => void;
}

export function CardHand({ cards, selectedCard, onSelectCard }: CardHandProps) {
  const groupedCards = cards.reduce((acc, card) => {
    const key = `${card.suit}-${card.type}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(card);
    return acc;
  }, {} as Record<string, Card[]>);

  const sortedGroups = Object.entries(groupedCards).sort((a, b) => {
    const [suitA, typeA] = a[0].split('-');
    const [suitB, typeB] = b[0].split('-');

    if (typeA !== typeB) {
      return typeA === 'minor' ? -1 : 1;
    }

    const suitOrder = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 };
    return suitOrder[suitA as keyof typeof suitOrder] - suitOrder[suitB as keyof typeof suitOrder];
  });

  const rankOrder: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  return (
    <div className="space-y-4">
      {sortedGroups.map(([groupKey, groupCards]) => {
        const sortedCards = groupCards.sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank]);
        const [suit, type] = groupKey.split('-');

        return (
          <div key={groupKey} className="bg-gradient-to-br from-amber-900/30 to-stone-900/50 rounded-lg p-4 border border-golden-800/30 backdrop-blur-sm">
            <h3 className="text-sm font-ornate text-parchment-200 mb-3 tracking-wide">
              {getSuitSymbol(suit as any)} {type === 'minor' ? 'Minors (2-7)' : 'Majors (9-A)'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {sortedCards.map((card, index) => {
                const isSelected = selectedCard?.suit === card.suit &&
                                 selectedCard?.rank === card.rank;

                return (
                  <button
                    key={`${card.suit}-${card.rank}-${index}`}
                    onClick={() => onSelectCard(card)}
                    className={`relative bg-gradient-to-br from-parchment-50 to-parchment-100 rounded-lg px-4 py-6 min-w-[60px] transition-all transform hover:scale-105 hover:shadow-xl border-2 ${
                      isSelected
                        ? 'ring-4 ring-golden-400 scale-105 border-golden-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                        : 'border-amber-800/40 shadow-md'
                    }`}
                    style={{
                      boxShadow: isSelected
                        ? '0 10px 40px -10px rgba(245,158,11,0.6), inset 0 1px 2px rgba(255,255,255,0.3)'
                        : '0 4px 12px -2px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2)',
                    }}
                  >
                    <div className="absolute inset-0 rounded-lg border-2 border-amber-900/20 pointer-events-none"></div>
                    <div className={`text-2xl font-bold font-display ${getSuitColor(card.suit)}`}>
                      {card.rank}
                    </div>
                    <div className={`text-3xl ${getSuitColor(card.suit)}`}>
                      {getSuitSymbol(card.suit)}
                    </div>
                    <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-amber-900/30"></div>
                    <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-amber-900/30"></div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {cards.length === 0 && (
        <div className="text-center text-parchment-600 py-12 font-ornate">
          No cards remaining
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import Card from './Card';
import { Card as CardType, PlayerType } from '../types';

interface HandProps {
  hand: CardType[];
  type: PlayerType;
  score: number;
  selectedIdx?: number | null;
  onSelect?: (idx: number) => void;
}

const Hand: React.FC<HandProps> = ({ hand, type, score, selectedIdx, onSelect }) => {
  const isPlayer = type === 'PLAYER';
  // ホバー状態を親コンポーネント(Hand)で管理する
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className={`p-4 rounded-2xl border-2 shadow-lg flex justify-between items-center z-20 ${isPlayer ? 'bg-blue-900/30 border-blue-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{isPlayer ? 'Player' : 'CPU'}</span>
          <span className={`text-3xl font-black italic ${isPlayer ? 'text-blue-400' : 'text-red-400'}`}>{score}</span>
        </div>
        <div className={`w-3 h-12 rounded-full ${isPlayer ? 'bg-blue-500' : 'bg-red-500'}`} />
      </div>

      <div className="flex-1 flex flex-col gap-1 min-h-0 relative">
        {hand.map((card, idx) => (
          <div 
            key={`${card.id}-${idx}`} 
            className="h-[18%] w-full min-h-0 relative transition-all duration-300"
            style={{ 
              // ホバー中のカードを最前面(z-50)にする
              zIndex: hoveredIdx === idx ? 50 : (selectedIdx === idx ? 40 : 10)
            }}
            // 動かないラッパー要素でホバーを検知
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <Card 
              card={card} 
              isSelected={isPlayer && selectedIdx === idx} 
              isHovered={hoveredIdx === idx} // ホバー状態をPropsとして渡す
              side={isPlayer ? 'left' : 'right'} 
              onClick={() => {
                if (isPlayer && onSelect) {
                  onSelect(idx);
                }
              }} 
            />
          </div>
        ))}
        {[...Array(Math.max(0, 5 - hand.length))].map((_, i) => (
          <div key={`empty-${i}`} className="h-[18%] w-full min-h-0 opacity-10 pointer-events-none">
            <Card card={null} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hand;
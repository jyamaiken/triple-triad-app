import React, { useState, useEffect } from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { Card as CardType } from '../types';
import { generateDeck } from '../utils/deckGenerator';
import Card from './Card';

interface DeckSelectProps {
  onSelect: (deck: CardType[]) => void;
}

const DeckSelect: React.FC<DeckSelectProps> = ({ onSelect }) => {
  const [options, setOptions] = useState<CardType[][]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number>(0);

  useEffect(() => {
    const newOptions = Array.from({ length: 5 }).map(() => {
      return generateDeck(30);
    });
    setOptions(newOptions);
  }, []);

  if (options.length === 0) return null;

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Pattern Selection Grid */}
      <div className="flex-1 grid grid-cols-5 gap-6">
        {options.map((deck, idx) => (
          <button 
            key={`pattern-${idx}`} 
            onMouseEnter={() => setHoveredIdx(idx)}
            onClick={() => onSelect(deck)}
            className={`relative flex flex-col items-center justify-center p-8 rounded-3xl border-4 transition-all duration-300 group
              ${hoveredIdx === idx 
                ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.02]' 
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              }`}
          >
            <div className={`text-sm font-black mb-2 ${hoveredIdx === idx ? 'text-blue-400' : 'text-slate-500'}`}>
              PATTERN 0{idx + 1}
            </div>
            <div className="text-4xl font-black italic tracking-tighter mb-6 text-white">
              COST <span className="text-blue-500">30</span>
            </div>
            
            <div className="space-y-2 w-full text-left opacity-70 group-hover:opacity-100 transition-opacity">
              {deck.map((c, i) => (
                <div key={i} className="flex justify-between text-xs font-bold border-b border-slate-800 pb-1">
                  <span className="text-slate-500 font-mono">Lv.{c.level}</span>
                  <span className="truncate max-w-[120px] text-slate-300 uppercase">{c.name}</span>
                </div>
              ))}
            </div>

            {hoveredIdx === idx && (
              <div className="mt-8 flex items-center gap-2 text-blue-400 font-black animate-bounce tracking-widest text-sm uppercase">
                Confirm Deck <Play size={18} fill="currentColor" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Deck Preview Details */}
      <div className="h-[480px] bg-slate-900/40 border-t-2 border-slate-800 rounded-t-[4rem] p-12 relative overflow-hidden backdrop-blur-sm shrink-0">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-slate-600 font-black tracking-[0.5em] text-xs uppercase">
          <ChevronRight size={16} /> Deck Preview Details <ChevronRight size={16} className="rotate-180" />
        </div>

        <div className="flex justify-center items-end gap-8 h-full pb-4">
          {options[hoveredIdx].map((card, i) => (
            <div key={`${hoveredIdx}-${card.id}-${i}`} className="w-56 h-full flex flex-col transition-all duration-500 transform hover:-translate-y-4">
               {/* カード表示エリア */}
               <div className="flex-1 min-h-0 flex items-end pb-2">
                  <Card card={{...card, owner: 'PLAYER'}} />
               </div>
               
               {/* 情報表示エリア（属性名表示を削除済み） */}
               <div className="mt-2 text-center shrink-0">
                 <div className="text-xs font-black text-blue-500 mb-1 tracking-widest">LEVEL {card.level}</div>
                 <div className="text-lg font-black tracking-tight text-white truncate px-2 uppercase">{card.name}</div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckSelect;
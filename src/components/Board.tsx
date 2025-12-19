import React from 'react';
import Card from './Card';
import { BoardTile } from '../types';

interface BoardProps {
  board: BoardTile[];
  onPlace: (idx: number) => void;
  canPlace: boolean;
  selectedCardAttr: string | null;
}

const ELEMENT_ICONS: Record<string, string> = {
  '火': '🔥', '冷': '❄️', '雷': '⚡', '地': '🌍', '風': '🌪️', '水': '💧', '毒': '💀', '聖': '✨'
};

const Board: React.FC<BoardProps> = ({ board, onPlace, canPlace, selectedCardAttr }) => {
  
  const getTileStyle = (tile: BoardTile) => {
    if (tile.card) return 'border-slate-700/30 bg-slate-800/20';
    if (!canPlace) return 'border-slate-800 bg-slate-900/50 opacity-50';

    if (!tile.element) {
      return 'border-blue-500/40 bg-blue-500/5 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)] hover:border-blue-400';
    }

    if (tile.element === selectedCardAttr) {
      return 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.3)] animate-pulse hover:border-yellow-300';
    }

    return 'border-red-900/80 bg-red-950/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)] hover:border-red-600';
  };

  return (
    <div className="w-full h-full bg-slate-900/80 p-4 rounded-[2.5rem] border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-3 relative shadow-2xl">
      {board.map((tile, i) => (
        <div 
          key={i} 
          onClick={() => onPlace(i)}
          className={`relative rounded-2xl transition-all duration-300 flex items-center justify-center border-2 overflow-hidden
            ${getTileStyle(tile)}
            ${!tile.card && canPlace ? 'cursor-pointer group hover:scale-[1.02]' : ''}
          `}
        >
          {!tile.card && tile.element && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
               <span className="text-5xl opacity-20 drop-shadow-lg group-hover:opacity-40 transition-opacity">
                 {ELEMENT_ICONS[tile.element]}
               </span>
               <span className="text-[10px] font-black text-white/10 uppercase mt-1">
                 {tile.element}
               </span>
            </div>
          )}

          {tile.card && (
            <div className="w-full h-full p-1 animate-in zoom-in-95 duration-300 z-10">
              <Card card={tile.card} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Board;
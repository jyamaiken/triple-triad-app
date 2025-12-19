import React, { useState, useEffect, useRef } from 'react';
import { Card as CardType, PlayerType } from '../types';

interface CardProps {
  card: CardType | null;
  isSelected?: boolean;
  onClick?: () => void;
  small?: boolean;
  side?: 'left' | 'right';
}

const Card: React.FC<CardProps> = ({ card, isSelected, onClick, small, side = 'left' }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayOwner, setDisplayOwner] = useState<PlayerType | null | undefined>(card?.owner);
  const prevOwnerRef = useRef<PlayerType | null | undefined>(card?.owner);
  const prevCardIdRef = useRef<number | null>(card?.id || null);

  useEffect(() => {
    if (!card) return;
    if (card.id !== prevCardIdRef.current) {
      setDisplayOwner(card.owner);
      setIsFlipping(false);
      prevOwnerRef.current = card.owner;
      prevCardIdRef.current = card.id;
      return;
    }
    if (card.owner !== prevOwnerRef.current) {
      if (prevOwnerRef.current !== undefined && prevOwnerRef.current !== null) {
        setIsFlipping(true);
        const t1 = setTimeout(() => setDisplayOwner(card.owner), 250);
        const t2 = setTimeout(() => setIsFlipping(false), 500);
        prevOwnerRef.current = card.owner;
        return () => { clearTimeout(t1); clearTimeout(t2); };
      } else {
        setDisplayOwner(card.owner);
      }
      prevOwnerRef.current = card.owner;
    }
  }, [card?.owner, card?.id]);

  if (!card) return (
    <div className="w-full aspect-[3/4] bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-700/50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-slate-700/10" />
    </div>
  );
  
  const displayStat = (val: number) => val === 10 ? 'A' : val;
  const stats = card.modifiedStats || card.stats;

  const getStatColor = (idx: number) => {
    if (!card.modifiedStats) return 'text-white';
    if (card.modifiedStats[idx] > card.stats[idx]) return 'text-cyan-300';
    if (card.modifiedStats[idx] < card.stats[idx]) return 'text-red-400';
    return 'text-white';
  };

  const getAttrStyle = (attr: string) => {
    switch (attr) {
      case '火': return { bg: 'bg-orange-600', icon: '🔥', border: 'border-orange-400' };
      case '冷': return { bg: 'bg-cyan-500', icon: '❄️', border: 'border-cyan-300' };
      case '雷': return { bg: 'bg-yellow-500', icon: '⚡', border: 'border-yellow-300' };
      case '地': return { bg: 'bg-amber-800', icon: '🌍', border: 'border-amber-600' };
      case '風': return { bg: 'bg-emerald-500', icon: '🌪️', border: 'border-emerald-300' };
      case '水': return { bg: 'bg-blue-500', icon: '💧', border: 'border-blue-300' };
      case '毒': return { bg: 'bg-purple-600', icon: '💀', border: 'border-purple-400' };
      case '聖': return { bg: 'bg-yellow-100', icon: '✨', border: 'border-yellow-400', text: 'text-slate-900' };
      default: return { bg: 'bg-slate-500', icon: '', border: 'border-slate-400' };
    }
  };

  // 枠線の太さと色を調整して所有者を明確化
  const ownerColor = displayOwner === 'PLAYER' 
    ? 'from-blue-600 to-blue-900 border-blue-400 border-4 shadow-[0_0_15px_rgba(96,165,250,0.6)]' 
    : displayOwner === 'CPU'
      ? 'from-red-600 to-red-900 border-red-400 border-4 shadow-[0_0_15px_rgba(248,113,113,0.6)]'
      : 'from-slate-700 to-slate-900 border-slate-500 border-2';

  let translateClass = '';
  if (onClick) {
    if (isSelected) {
      translateClass = side === 'left' ? '-translate-x-[60%] scale-90' : 'translate-x-[60%] scale-90';
    } else {
      translateClass = side === 'left' ? 'hover:-translate-x-[40%] hover:scale-110' : 'hover:translate-x-[40%] hover:scale-110';
    }
  }

  const transformOrigin = side === 'left' ? 'origin-right' : 'origin-left';

  return (
    <div 
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }} 
      className={`
        relative w-full aspect-[3/4] transition-all duration-300 perspective-1000 ${transformOrigin}
        ${onClick ? 'cursor-pointer' : ''}
        ${isSelected ? 'z-40 ring-4 ring-yellow-400 rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'z-10 hover:z-50'}
        ${translateClass}
        ${small ? 'scale-95' : ''}
      `}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        
        {/* Front Face - ownerColor内の border-4 を適用するため、ここの border-2 は削除 */}
        <div className={`absolute inset-0 w-full h-full rounded-xl backface-hidden overflow-hidden bg-gradient-to-br ${ownerColor} shadow-lg`} style={{ backfaceVisibility: 'hidden' }}>
          
          <div className="absolute inset-0 z-0 bg-slate-900">
             <img src={card.img} alt={card.name} className="w-full h-full object-cover opacity-90 pointer-events-none" />
             <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="absolute top-1 left-1 w-12 h-14 bg-black/60 backdrop-blur-md rounded-lg border border-white/20 z-20 flex flex-col items-center justify-center shadow-xl">
            <div className="relative w-full h-full flex flex-col items-center justify-center font-black italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
              <div className={`text-base leading-none mb-0.5 ${getStatColor(0)}`}>{displayStat(stats[0])}</div>
              <div className="flex w-full justify-between px-1.5 -my-0.5">
                 <span className={`text-base leading-none ${getStatColor(1)}`}>{displayStat(stats[1])}</span>
                 <span className={`text-base leading-none ${getStatColor(2)}`}>{displayStat(stats[2])}</span>
              </div>
              <div className={`text-base leading-none mt-0.5 ${getStatColor(3)}`}>{displayStat(stats[3])}</div>
            </div>
          </div>

          {card.attr && (
            <div className={`absolute top-1.5 right-1.5 w-7 h-7 ${getAttrStyle(card.attr).bg} ${getAttrStyle(card.attr).border} border-2 rounded-lg flex items-center justify-center shadow-lg z-20`}>
              <span className={`text-[12px] drop-shadow-sm ${getAttrStyle(card.attr).text || ''}`}>{getAttrStyle(card.attr).icon}</span>
            </div>
          )}

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent py-1.5 px-2 z-10">
            <div className="text-[9px] font-black text-white uppercase tracking-tighter text-center truncate drop-shadow-md">
              {card.name}
            </div>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,_white_0%,_transparent_60%)]" />
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 w-full h-full rounded-xl border-4 border-slate-600 bg-slate-800 flex items-center justify-center shadow-inner" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <div className="w-10 h-10 rounded-full border-4 border-slate-700 flex items-center justify-center font-black text-slate-600 italic text-lg">TT</div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.perspective-1000{perspective:1000px}.transform-style-3d{transform-style:preserve-3d}.backface-hidden{backface-visibility:hidden}.rotate-y-180{transform:rotateY(180deg)}`}} />
    </div>
  );
};

export default Card;
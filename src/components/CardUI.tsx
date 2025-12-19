import React, { useState, useEffect, useRef } from 'react';
import { Card, PlayerType } from '../types';

interface CardUIProps {
  card: Card | null;
  isSelected?: boolean;
  onClick?: () => void;
  small?: boolean;
}

const CardUI: React.FC<CardUIProps> = ({ card, isSelected, onClick, small }) => {
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

  if (!card) return <div className="w-full h-full bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-700/50" />;
  
  const displayStat = (val: number) => val === 10 ? 'A' : val;
  
  const getStatColor = (baseIdx: number) => {
    if (!card.modifiedStats) return 'text-white';
    const base = card.stats[baseIdx];
    const mod = card.modifiedStats[baseIdx];
    if (mod > base) return 'text-cyan-300';
    if (mod < base) return 'text-red-400';
    return 'text-white';
  };

  const getAttrStyle = (attr: string | null) => {
    if (!attr) return null;
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

  const attrInfo = getAttrStyle(card.attr);
  const ownerColor = displayOwner === 'PLAYER' 
    ? 'bg-gradient-to-br from-blue-600 to-blue-900 border-blue-400 shadow-blue-900/40' 
    : displayOwner === 'CPU'
      ? 'bg-gradient-to-br from-red-600 to-red-900 border-red-400 shadow-red-900/40'
      : 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-500';

  const statsToDisplay = card.modifiedStats || card.stats;

  return (
    <div onClick={onClick} className={`relative w-full h-full transition-all duration-300 perspective-1000 ${isSelected ? '-translate-y-4 scale-105 z-10 shadow-2xl' : ''} ${small ? 'scale-95' : ''}`}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        <div className={`absolute inset-0 w-full h-full rounded-xl border-2 backface-hidden overflow-hidden ${ownerColor} shadow-lg`} style={{ backfaceVisibility: 'hidden' }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_white_0%,_transparent_70%)]" />
          
          {/* カードの属性アイコン - 盤面との合致を確認しやすく強調 */}
          {card.attr && attrInfo && (
            <div className={`absolute top-1.5 right-1.5 w-7 h-7 ${attrInfo.bg} ${attrInfo.border} border-2 rounded-full flex items-center justify-center shadow-md z-20`}>
              <span className={`text-[12px] drop-shadow-sm ${attrInfo.text || ''}`}>{attrInfo.icon}</span>
            </div>
          )}

          <div className="absolute top-1.5 left-2.5 z-20 flex flex-col items-center select-none pointer-events-none font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none text-white">
            <div className={`text-xl ${getStatColor(0)}`}>{displayStat(statsToDisplay[0])}</div>
            <div className="flex gap-4 items-center h-5">
               <span className={`text-xl ${getStatColor(1)}`}>{displayStat(statsToDisplay[1])}</span>
               <span className={`text-xl ${getStatColor(2)}`}>{displayStat(statsToDisplay[2])}</span>
            </div>
            <div className={`text-xl ${getStatColor(3)}`}>{displayStat(statsToDisplay[3])}</div>
          </div>

          <div className="absolute inset-x-2 top-14 bottom-8 bg-black/50 rounded-lg overflow-hidden border border-white/5">
             <img src={card.img} alt={card.name} className="w-full h-full object-cover opacity-90" onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='8' fill='%23444' text-anchor='middle' dy='.3em'%3EIMAGE%3C/text%3E%3C/svg%3E"; }} />
          </div>
          <div className="absolute bottom-1 w-full text-[9px] text-center font-black text-white uppercase tracking-tighter drop-shadow-md truncate px-1 bg-black/20">{card.name}</div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-xl border-2 border-slate-500 bg-slate-800 flex items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <div className="w-12 h-12 rounded-full border-4 border-slate-700 flex items-center justify-center font-black text-slate-600 italic text-xl">TT</div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.perspective-1000{perspective:1000px}.transform-style-3d{transform-style:preserve-3d}.backface-hidden{backface-visibility:hidden}.rotate-y-180{transform:rotateY(180deg)}`}} />
    </div>
  );
};

export default CardUI;
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Trophy, Medal, CheckCircle2, XCircle, RefreshCw, 
  Settings2, Play, Users, Cpu as CpuIcon, Zap, User, 
  ChevronRight, Layers, Plus as PlusIcon, Sparkles 
} from 'lucide-react';

// カードデータを外部ファイルからインポート
import CARD_DATA_RAW from './data/cards.json';

// --- Types ---
export type PlayerType = 'P1' | 'P2';
export type GameState = 'TITLE' | 'DECK_SELECT' | 'COIN_TOSS' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';
export type EffectType = 'SAME' | 'PLUS' | 'COMBO' | null;

export interface GameSettings {
  elementalEnabled: boolean;
  sameEnabled: boolean;
  plusEnabled: boolean;
  cpuDifficulty: 'LOW' | 'MID' | 'HIGH' | 'EXPERT';
  pvpMode: boolean;
}

export interface Card {
  id: number;
  level: number;
  name: string;
  stats: number[]; 
  modifiedStats?: number[];
  attr: string | null;
  img: string;
  owner?: PlayerType | null;
}

export interface BoardTile {
  card: Card | null;
  element: string | null;
}

export interface MatchResult {
  winner: PlayerType | 'DRAW';
  scores: number[];
}

// --- Constants ---
const ELEMENTS = ['火', '冷', '雷', '地', '風', '水', '毒', '聖'];
const ELEMENT_ICONS: Record<string, string> = {
  '火': '🔥', '冷': '❄️', '雷': '⚡', '地': '🌍', '風': '🌪️', '水': '💧', '毒': '💀', '聖': '✨'
};

const CARD_DATA = CARD_DATA_RAW as Card[];

// --- Helper Functions ---

function resolveImgPath(path: string) {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  const cleanPath = path.replace(/^\.?\//, '');
  return `/${cleanPath}`;
}

function generateDeck(excludeIds?: Set<number>): Card[] {
  const pool = excludeIds 
    ? CARD_DATA.filter(c => !excludeIds.has(c.id)) 
    : [...CARD_DATA];
  
  const source = pool.length >= 5 ? pool : [...CARD_DATA];
  const sortedPool = source.sort(() => Math.random() - 0.5);
  return sortedPool.slice(0, 5).map(c => ({ ...c }));
}

function calculateStats(card: Card, element: string | null): number[] {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
}

// --- CPU AI Logic ---
const evaluateMove = (boardIdx: number, card: Card, currentBoard: BoardTile[], owner: PlayerType, settings: GameSettings): number => {
  const stats = calculateStats(card, currentBoard[boardIdx].element);
  let score = 0;

  const getNeighbors = (idx: number) => [
    { pos: idx - 3, side: 0, oppSide: 3, active: idx >= 3 },
    { pos: idx - 1, side: 1, oppSide: 2, active: idx % 3 !== 0 },
    { pos: idx + 1, side: 2, oppSide: 1, active: idx % 3 !== 2 },
    { pos: idx + 3, side: 3, oppSide: 0, active: idx < 6 },
  ];

  const neighborTiles = getNeighbors(boardIdx).filter(n => n.active && currentBoard[n.pos].card);
  const neighborData = neighborTiles.map(n => ({
    card: currentBoard[n.pos].card!,
    myVal: stats[n.side],
    oppVal: (currentBoard[n.pos].card!.modifiedStats || currentBoard[n.pos].card!.stats)[n.oppSide]
  }));

  let flips = 0;
  if (settings.sameEnabled) {
    const sames = neighborData.filter(n => n.myVal === n.oppVal);
    if (sames.length >= 2) {
      flips += sames.filter(n => n.card.owner !== owner).length;
      score += 50;
    }
  }
  if (settings.plusEnabled) {
    const sums: Record<number, number> = {};
    neighborData.forEach(n => { sums[n.myVal + n.oppVal] = (sums[n.myVal + n.oppVal] || 0) + 1; });
    const plusSums = Object.keys(sums).filter(s => sums[Number(s)] >= 2);
    if (plusSums.length > 0) {
      plusSums.forEach(s => { flips += neighborData.filter(n => (n.myVal + n.oppVal) === Number(s) && n.card.owner !== owner).length; });
      score += 60;
    }
  }

  flips += neighborData.filter(n => n.myVal > n.oppVal && n.card.owner !== owner).length;
  score += flips * 20;
  score += (stats.reduce((a, b) => a + b, 0) / 4) * 2;
  if ([0, 2, 6, 8].includes(boardIdx)) score += 15;

  return score;
};

const getBestMove = (board: BoardTile[], hand: Card[], settings: GameSettings): { boardIdx: number; handIdx: number } => {
  const emptyCells = board.map((t, i) => t.card === null ? i : null).filter((i): i is number => i !== null);
  if (settings.cpuDifficulty === 'LOW' || emptyCells.length === 0) {
    return { boardIdx: emptyCells[Math.floor(Math.random() * emptyCells.length)], handIdx: Math.floor(Math.random() * hand.length) };
  }
  const moves = emptyCells.flatMap(cellIdx => hand.map((card, hIdx) => ({
    boardIdx: cellIdx, handIdx: hIdx, score: evaluateMove(cellIdx, card, board, 'P2', settings)
  })));
  moves.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return { boardIdx: moves[0].boardIdx, handIdx: moves[0].handIdx };
};

// --- Components ---

const CardComponent: React.FC<{ card: Card | null; isSelected?: boolean; isHovered?: boolean; onClick?: () => void; small?: boolean; side?: 'left' | 'right'; isLandscape?: boolean }> = ({ card, isSelected, isHovered, onClick, small, side = 'left', isLandscape = false }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayOwner, setDisplayOwner] = useState(card?.owner);
  const prevOwnerRef = useRef(card?.owner);
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
      if (prevOwnerRef.current) {
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
    <div className="w-full aspect-[3/4] bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-700/50 flex items-center justify-center opacity-30">
      <div className="w-8 h-8 rounded-full border-4 border-slate-700/10" />
    </div>
  );
  
  const stats = card.modifiedStats || card.stats;
  const displayStat = (val: number) => val === 10 ? 'A' : val;
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

  const ownerClass = displayOwner === 'P1' 
    ? 'from-blue-600 to-blue-900 border-blue-400 border-4 shadow-[0_0_20px_rgba(96,165,250,0.5)]' 
    : displayOwner === 'P2' 
      ? 'from-red-600 to-red-900 border-red-400 border-4 shadow-[0_0_20px_rgba(248,113,113,0.5)]' 
      : 'from-slate-700 to-slate-900 border-slate-500 border-2';

  let translateClass = '';
  if (onClick) {
    if (isSelected) {
      // 縦向きなら上へ、横向きなら左右へスライド
      translateClass = !isLandscape 
        ? '-translate-y-[60%] scale-105' 
        : (side === 'left' ? '-translate-x-[60%] scale-95' : 'translate-x-[60%] scale-95');
    } else if (isHovered) {
      translateClass = !isLandscape
        ? '-translate-y-[20%] scale-105'
        : (side === 'left' ? 'hover:-translate-x-[40%] scale-110' : 'hover:translate-x-[40%] scale-110');
    }
  }

  const transformOrigin = side === 'left' ? 'origin-right' : 'origin-left';

  return (
    <div 
      onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }} 
      className={`relative w-full aspect-[3/4] transition-all duration-300 perspective-1000 ${transformOrigin} ${onClick ? 'cursor-pointer' : ''} ${isSelected ? 'z-40 ring-4 ring-yellow-400 rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'z-10 hover:z-50'} ${translateClass} ${small ? 'scale-90' : ''}`}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        <div className={`absolute inset-0 w-full h-full rounded-xl bg-gradient-to-br ${ownerClass} overflow-hidden shadow-lg backface-hidden`}>
          <div className="absolute inset-0 bg-slate-900">
             <img src={resolveImgPath(card.img)} alt={card.name} className="w-full h-full object-cover opacity-80 pointer-events-none" />
             <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="absolute top-1 left-1 w-12 h-14 bg-black/60 backdrop-blur-md rounded-lg border border-white/20 z-20 flex flex-col items-center justify-center shadow-xl scale-[0.7] sm:scale-100 origin-top-left">
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
            <div className={`absolute top-1.5 right-1.5 w-7 h-7 ${getAttrStyle(card.attr).bg} ${getAttrStyle(card.attr).border} border-2 rounded-lg flex items-center justify-center shadow-lg z-20 scale-75 sm:scale-100`}>
              <span className={`text-[12px] drop-shadow-sm ${getAttrStyle(card.attr).text || ''}`}>{getAttrStyle(card.attr).icon}</span>
            </div>
          )}

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-6 pb-2 px-2 z-10">
            <div className="text-[10px] sm:text-[13px] font-black text-white uppercase tracking-normal text-center truncate drop-shadow-lg">{card.name}</div>
          </div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-xl bg-slate-800 border-4 border-slate-600 flex items-center justify-center rotate-y-180 backface-hidden text-slate-500 font-black italic text-lg shadow-inner">TT</div>
      </div>
    </div>
  );
};

const BoardComp: React.FC<{ board: BoardTile[]; onPlace: (idx: number) => void; canPlace: boolean; selectedCardAttr: string | null; effect: EffectType }> = ({ board, onPlace, canPlace, selectedCardAttr, effect }) => {
  const getEffectStyle = (type: EffectType) => {
    switch (type) {
      case 'SAME': return 'text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,1)] stroke-cyan-800';
      case 'PLUS': return 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,1)] stroke-red-900';
      case 'COMBO': return 'text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,1)] stroke-yellow-700';
      default: return '';
    }
  };

  return (
    <div className="w-full h-full aspect-square bg-slate-900/80 p-2 sm:p-4 rounded-[2rem] sm:rounded-[2.5rem] border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-3 shadow-2xl relative overflow-visible">
      {board.map((tile, i) => (
        <div key={i} onClick={() => onPlace(i)} className={`relative rounded-xl sm:rounded-2xl border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${tile.card ? 'border-slate-700/30 bg-slate-800/20' : !canPlace ? 'border-slate-800 bg-slate-900/50 opacity-50' : !tile.element ? 'border-blue-500/40 bg-blue-500/5 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)] hover:border-blue-400' : tile.element === selectedCardAttr ? 'border-yellow-400 bg-yellow-400/10 animate-pulse' : 'border-red-900/80 bg-red-950/40'}`}>
          {!tile.card && tile.element && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
               <span className="text-3xl sm:text-5xl opacity-20 drop-shadow-lg">{ELEMENT_ICONS[tile.element]}</span>
               <span className="text-[8px] sm:text-[10px] font-black text-white/10 uppercase mt-1">{tile.element}</span>
            </div>
          )}
          {tile.card && <div className="w-full h-full p-1 animate-in zoom-in-95 duration-300 z-10"><CardComponent card={tile.card} isMobile={false} /></div>}
        </div>
      ))}
      {effect && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
           <div className={`text-6xl sm:text-9xl font-black italic uppercase tracking-tighter animate-bounce ${getEffectStyle(effect)}`} style={{ WebkitTextStroke: '2px black' }}>{effect}!</div>
        </div>
      )}
    </div>
  );
};

const HandComp: React.FC<{ hand: Card[]; score: number; isTurn: boolean; selectedIdx: number | null; onSelect: (idx: number) => void; color: 'blue' | 'red'; isLandscape: boolean }> = ({ hand, score, isTurn, selectedIdx, onSelect, color, isLandscape }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const isP1 = color === 'blue';
  
  // 縦向き: 横並び手札 / 横向き: 縦並び手札
  return (
    <div className={`flex ${!isLandscape ? 'flex-row w-full h-24 sm:h-32' : 'flex-col w-32 sm:w-48 h-full'} gap-2 sm:gap-4 relative shrink-0`}>
      <div className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2 shadow-lg flex ${!isLandscape ? 'flex-col items-center justify-center min-w-[3rem]' : 'justify-between items-center'} z-20 shrink-0 ${isP1 ? 'bg-blue-900/30 border-blue-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
        <div className={`flex flex-col ${!isLandscape ? 'text-center' : 'leading-tight'}`}>
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hidden sm:block">{isP1 ? 'P1' : 'P2'}</span>
          <span className={`text-xl sm:text-3xl font-black italic ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>{score}</span>
        </div>
        <div className={`${!isLandscape ? 'w-full h-1 mt-1' : 'w-2 h-8 lg:w-3 lg:h-12'} rounded-full ${isTurn ? (isP1 ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse') : 'bg-slate-700'}`} />
      </div>
      <div className={`flex-1 flex ${!isLandscape ? 'flex-row' : 'flex-col'} gap-1 min-h-0 relative items-end`}>
        {hand.map((card, i) => (
          <div 
            key={`${card.id}-${i}`} 
            className={`flex-1 ${!isLandscape ? 'h-full aspect-[3/4]' : 'h-[18%] w-full'} relative transition-all duration-300`}
            style={{ zIndex: hoveredIdx === i ? 50 : (selectedIdx === i ? 40 : 10) }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <CardComponent 
              card={card} 
              isSelected={selectedIdx === i} 
              isHovered={hoveredIdx === i}
              side={isP1 ? 'left' : 'right'} 
              isMobile={!isLandscape}
              onClick={() => isTurn && onSelect(i)} 
            />
          </div>
        ))}
        {[...Array(Math.max(0, 5 - hand.length))].map((_, i) => (
          <div key={`empty-${i}`} className={`flex-1 ${!isLandscape ? 'h-full aspect-[3/4]' : 'h-[18%] w-full'} opacity-10 pointer-events-none`}><CardComponent card={null} /></div>
        ))}
      </div>
    </div>
  );
};

// ... DeckSelect & CoinToss (前回の修正を維持) ...
const DeckSelect: React.FC<{ onSelect: (deck: Card[]) => void; player: string; color: 'blue' | 'red'; excludeIds: Set<number>; isMobile: boolean }> = ({ onSelect, player, color, excludeIds, isMobile }) => {
  const [options, setOptions] = useState<Card[][]>([]);
  const [previewIdx, setPreviewIdx] = useState<number>(0);

  useEffect(() => {
    const newOptions = Array.from({ length: 5 }).map(() => generateDeck(excludeIds));
    setOptions(newOptions);
  }, [excludeIds]);

  const handleClick = (deck: Card[], idx: number) => {
    if (previewIdx === idx) {
      onSelect(deck);
    } else {
      setPreviewIdx(idx);
    }
  };

  if (options.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-700 px-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        {options.map((deck, idx) => (
          <button 
            key={idx} 
            onClick={() => handleClick(deck, idx)} 
            className={`relative flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-2 sm:border-4 transition-all duration-300 
              ${previewIdx === idx 
                ? (color === 'blue' ? 'bg-blue-600/10 border-blue-500 scale-[1.02]' : 'bg-red-600/10 border-red-500 scale-[1.02]') 
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              }`}
          >
            <div className={`text-[10px] sm:text-xs font-black mb-1 ${previewIdx === idx ? (color === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-slate-500'}`}>PATTERN 0{idx + 1}</div>
            <div className="text-xl sm:text-3xl font-black italic tracking-tighter mb-4 text-white uppercase leading-none">SELECT <span className={color === 'blue' ? 'text-blue-500' : 'text-red-500'}>DECK</span></div>
            <div className="space-y-1 w-full text-left opacity-70 group-hover:opacity-100 transition-opacity">
              {deck.map((c, i) => (
                <div key={i} className="flex justify-between text-[8px] sm:text-[10px] font-bold border-b border-slate-800 pb-0.5"><span className="text-slate-500 font-mono">Lv.{c.level}</span><span className="truncate max-w-[80px] sm:max-w-[120px] text-slate-300 uppercase">{c.name}</span></div>
              ))}
            </div>
            {previewIdx === idx && (
              <div className={`mt-4 flex items-center gap-1 font-black animate-pulse text-xs uppercase ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                Click to Confirm <Play size={12} fill="currentColor" />
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="flex h-[200px] sm:h-[300px] lg:h-[380px] bg-slate-900/80 border-t-2 border-slate-800 rounded-t-[2rem] sm:rounded-t-[4rem] p-4 sm:p-10 justify-center items-end gap-2 sm:gap-6 overflow-hidden backdrop-blur-sm shrink-0">
          {options[previewIdx].map((card, i) => (
            <div key={`${previewIdx}-${card.id}-${i}`} className="w-20 sm:w-32 lg:w-40 flex flex-col transition-all duration-500 transform hover:-translate-y-4">
               <div className="flex-1 min-h-0 flex items-end pb-2"><CardComponent card={{...card, owner: player as any}} small isMobile={false} /></div>
               <div className="mt-2 text-center shrink-0 leading-tight hidden sm:block">
                 <div className={`text-[10px] font-black ${color === 'blue' ? 'text-blue-500' : 'text-red-500'}`}>LEVEL {card.level}</div>
                 <div className="text-sm font-black text-white truncate px-1 uppercase">{card.name}</div>
               </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const CoinToss: React.FC<{ winner: string; onComplete: () => void }> = ({ winner, onComplete }) => {
  const [rotation, setRotation] = useState(0);
  const [showResultText, setShowResultText] = useState(false);
  useEffect(() => {
    const spins = 10 + Math.floor(Math.random() * 5); // 10〜14回転
    const timer = setTimeout(() => {
      setRotation(360 * spins + (winner === 'PLAYER 1' ? 0 : 180));
      setTimeout(() => setShowResultText(true), 2800);
      setTimeout(onComplete, 4500);
    }, 100);
    return () => clearTimeout(timer);
  }, [winner, onComplete]);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl z-50 p-4">
      <div className="mb-8 sm:mb-16 text-center animate-in fade-in duration-500">
        <h2 className="text-3xl sm:text-5xl font-black italic tracking-[0.2em] text-white uppercase mb-4 leading-none">Coin Toss</h2>
        <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] sm:text-sm leading-none">Determining the First Turn...</p>
      </div>
      <div className="relative w-48 h-48 sm:w-72 sm:h-72 perspective-1000">
        <div className="w-full h-full relative transition-transform duration-[3000ms] cubic-bezier(0.25, 1, 0.5, 1) transform-style-3d" style={{ transform: `rotateY(${rotation}deg)` }}>
          <div className="absolute inset-0 w-full h-full rounded-full border-[6px] sm:border-[10px] border-blue-400 bg-gradient-to-br from-blue-500 to-blue-800 flex flex-col items-center justify-center shadow-2xl backface-hidden">
            <span className="text-white font-black text-4xl sm:text-6xl italic leading-none">P1</span>
          </div>
          <div className="absolute inset-0 w-full h-full rounded-full border-[6px] sm:border-[10px] border-red-500 bg-gradient-to-br from-red-600 to-red-900 flex flex-col items-center justify-center shadow-2xl backface-hidden rotate-y-180">
            <span className="text-white font-black text-4xl sm:text-6xl italic leading-none">P2</span>
          </div>
        </div>
      </div>
      <div className="mt-12 sm:mt-20 h-16">{showResultText && <div className="animate-in slide-in-from-bottom-4 zoom-in duration-700 px-8 py-3 rounded-full border-4 font-black italic text-xl sm:text-3xl text-white uppercase">{winner} START</div>}</div>
    </div>
  );
};

// --- Main Logic Hook ---
const useGame = () => {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [round, setRound] = useState(1);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [p1Hand, setP1Hand] = useState<Card[]>([]);
  const [p2Hand, setP2Hand] = useState<Card[]>([]);
  const [board, setBoard] = useState<BoardTile[]>([]);
  const [turn, setTurn] = useState<PlayerType>('P1');
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [tossWinner, setTossWinner] = useState<PlayerType | null>(null);
  const [selectingPlayer, setSelectingPlayer] = useState<PlayerType>('P1');
  const [activeEffect, setActiveEffect] = useState<EffectType>(null);
  const [settings, setSettings] = useState<GameSettings>({
    elementalEnabled: true, sameEnabled: true, plusEnabled: true, cpuDifficulty: 'MID', pvpMode: false
  });

  const initializeBoard = useCallback(() => {
    const b: BoardTile[] = Array(9).fill(null).map(() => ({ card: null, element: null }));
    if (!settings.elementalEnabled) return b;
    const count = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * 9);
      if (!b[idx].element) b[idx].element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    }
    return b;
  }, [settings.elementalEnabled]);

  const handleDeckSelect = (deck: Card[]) => {
    if (selectingPlayer === 'P1') {
      setP1Hand(deck.map(c => ({ ...c, owner: 'P1' })));
      // P1のカードIDリストを作成
      const p1Ids = new Set(deck.map(c => c.id));
      
      if (settings.pvpMode) {
        setSelectingPlayer('P2'); 
      } else { 
        // CPUデッキ生成時もP1のカードを除外
        setP2Hand(generateDeck(p1Ids).map(c => ({ ...c, owner: 'P2' })));
        startGame();
      }
    } else {
      setP2Hand(deck.map(c => ({ ...c, owner: 'P2' })));
      startGame();
    }
  };

  const startGame = () => {
    setBoard(initializeBoard());
    setTossWinner(Math.random() > 0.5 ? 'P1' : 'P2');
    setGameState('COIN_TOSS');
  };

  const triggerEffect = (type: EffectType) => {
    setActiveEffect(type);
    setTimeout(() => setActiveEffect(null), 2000);
  };

  const placeCard = useCallback((idx: number, hand: Card[], handIdx: number, owner: PlayerType) => {
    if (board[idx].card || turn !== owner) return;
    const nextBoard = board.map(tile => ({ ...tile }));
    const card = hand[handIdx];
    const stats = calculateStats(card, nextBoard[idx].element);
    nextBoard[idx].card = { ...card, owner, modifiedStats: stats };

    // --- RULE LOGIC ---
    let flippedIndices: number[] = [];
    let comboQueue: number[] = [];
    const getNeighbors = (i: number) => [
      { pos: i - 3, side: 0, oppSide: 3, active: i >= 3 },
      { pos: i - 1, side: 1, oppSide: 2, active: i % 3 !== 0 },
      { pos: i + 1, side: 2, oppSide: 1, active: i % 3 !== 2 },
      { pos: i + 3, side: 3, oppSide: 0, active: i < 6 },
    ];

    // Same & Plus
    let sameMatches: number[] = [];
    let plusSums: Record<number, number[]> = {};
    const neighbors = getNeighbors(idx);

    neighbors.forEach(n => {
      if (n.active) {
        const neighborCard = nextBoard[n.pos].card;
        if (neighborCard) {
          const myVal = stats[n.side];
          const oppStats = neighborCard.modifiedStats || neighborCard.stats;
          const oppVal = oppStats[n.oppSide];
          if (settings.sameEnabled && myVal === oppVal) sameMatches.push(n.pos);
          if (settings.plusEnabled) {
            const sum = myVal + oppVal;
            if (!plusSums[sum]) plusSums[sum] = [];
            plusSums[sum].push(n.pos);
          }
        }
      }
    });

    let triggeredSpecial = false;

    if (settings.sameEnabled && sameMatches.length >= 2) {
      triggerEffect('SAME');
      triggeredSpecial = true;
      sameMatches.forEach(pos => {
        if (nextBoard[pos].card!.owner !== owner) {
          nextBoard[pos].card!.owner = owner;
          flippedIndices.push(pos);
        }
        comboQueue.push(pos);
      });
    }
    if (settings.plusEnabled) {
      let plusTriggered = false;
      Object.values(plusSums).forEach(indices => {
        if (indices.length >= 2) {
          plusTriggered = true;
          indices.forEach(pos => {
            if (nextBoard[pos].card!.owner !== owner) {
              nextBoard[pos].card!.owner = owner;
              flippedIndices.push(pos);
            }
            comboQueue.push(pos);
          });
        }
      });
      if (plusTriggered) { triggerEffect('PLUS'); triggeredSpecial = true; }
    }

    // Basic Rule
    neighbors.forEach(n => {
      if (n.active) {
        const neighborCard = nextBoard[n.pos].card;
        if (neighborCard && neighborCard.owner !== owner) {
          const myVal = stats[n.side];
          const oppStats = neighborCard.modifiedStats || neighborCard.stats;
          const oppVal = oppStats[n.oppSide];
          if (myVal > oppVal) {
            nextBoard[n.pos].card!.owner = owner;
            flippedIndices.push(n.pos);
          }
        }
      }
    });

    // Combo
    while (comboQueue.length > 0) {
      const cIdx = comboQueue.shift()!;
      const cCard = nextBoard[cIdx].card!;
      const cStats = cCard.modifiedStats || cCard.stats;
      getNeighbors(cIdx).forEach(cn => {
        if (cn.active) {
          const target = nextBoard[cn.pos].card;
          if (target && target.owner !== owner) {
            const tStats = target.modifiedStats || target.stats;
            if (cStats[cn.side] > tStats[cn.oppSide]) {
              nextBoard[cn.pos].card!.owner = owner;
              if (!flippedIndices.includes(cn.pos)) {
                flippedIndices.push(cn.pos);
                comboQueue.push(cn.pos);
                triggerEffect('COMBO');
              }
            }
          }
        }
      });
    }

    setBoard(nextBoard);
    if (owner === 'P1') setP1Hand(prev => prev.filter((_, i) => i !== handIdx));
    else setP2Hand(prev => prev.filter((_, i) => i !== handIdx));
    setSelectedCardIdx(null);
    setTurn(owner === 'P1' ? 'P2' : 'P1');
  }, [board, turn, selectedCardIdx, p1Hand, p2Hand, settings]);

  const scores = useMemo(() => {
    let s1 = p1Hand.length, s2 = p2Hand.length;
    board.forEach(t => { if (t.card?.owner === 'P1') s1++; if (t.card?.owner === 'P2') s2++; });
    return [s1, s2];
  }, [board, p1Hand, p2Hand]);

  useEffect(() => {
    if (gameState === 'PLAYING' && board.every(t => t.card)) {
      const winner = scores[0] > scores[1] ? 'P1' : scores[0] < scores[1] ? 'P2' : 'DRAW';
      const results = [...matchResults, { winner: winner as any, scores }];
      setMatchResults(results);
      if (results.length >= 3 || results.filter(r => r.winner === 'P1').length >= 2 || results.filter(r => r.winner === 'P2').length >= 2) setGameState('GAME_OVER');
      else setGameState('ROUND_END');
    }
  }, [board, scores, gameState, matchResults]);

  return { gameState, setGameState, round, matchResults, p1Hand, p2Hand, board, turn, selectedCardIdx, setSelectedCardIdx, tossWinner, selectingPlayer, settings, setSettings, handleDeckSelect, placeCard, scores, setRound, setMatchResults, startGame, nextRound: () => { setRound(r => r + 1); setSelectingPlayer('P1'); setGameState('DECK_SELECT'); }, activeEffect };
};

// --- Main App ---
export default function App() {
  const g = useGame();
  const [isLandscape, setIsLandscape] = useState(false);

  // Resize Check
  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!g.settings.pvpMode && g.gameState === 'PLAYING' && g.turn === 'P2' && g.p2Hand.length > 0) {
      const timer = setTimeout(() => {
        const { boardIdx, handIdx } = getBestMove(g.board, g.p2Hand, g.settings);
        g.placeCard(boardIdx, g.p2Hand, handIdx, 'P2');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [g.turn, g.gameState, g.p2Hand, g.settings, g.board, g.placeCard]);

  const difficultyConfig = {
    LOW: { label: 'Easy', color: 'text-emerald-400', border: 'border-emerald-900/50', icon: <CpuIcon size={20} /> },
    MID: { label: 'Normal', color: 'text-blue-400', border: 'border-blue-900/50', icon: <CpuIcon size={20} /> },
    HIGH: { label: 'Hard', color: 'text-red-400', border: 'border-red-900/50', icon: <CpuIcon size={20} /> },
    EXPERT: { label: 'Expert', color: 'text-purple-400', border: 'border-purple-500/50', icon: <Sparkles size={20} /> },
  };

  // UI RENDER
  if (g.gameState === 'TITLE') return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden text-center">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      
      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full">
        <h1 className="text-6xl lg:text-9xl font-black italic mb-8 lg:mb-16 uppercase tracking-tighter drop-shadow-2xl">Triple <span className="text-blue-500">Triad</span></h1>
        
        {/* Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 w-full mb-12">
          {/* Game Mode */}
          <div className="space-y-4 text-left">
            <h3 className="text-slate-500 font-bold uppercase text-xs border-b border-slate-900 pb-2 flex items-center gap-2"><Users size={14} /> Game Mode</h3>
            <button onClick={() => g.setSettings({ ...g.settings, pvpMode: false })} className={`w-full p-4 sm:p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${!g.settings.pvpMode ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-4"><User size={20} /><span className="font-black italic uppercase">VS CPU</span></div>
              {!g.settings.pvpMode && <CheckCircle2 size={20} />}
            </button>
            <button onClick={() => g.setSettings({ ...g.settings, pvpMode: true })} className={`w-full p-4 sm:p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${g.settings.pvpMode ? 'bg-purple-600 border-purple-400 shadow-lg' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-4"><Users size={20} /><span className="font-black italic uppercase">LOCAL PVP</span></div>
              {g.settings.pvpMode && <CheckCircle2 size={20} />}
            </button>
          </div>

          {/* Rules */}
          <div className="space-y-4 text-left">
            <h3 className="text-slate-500 font-bold uppercase text-xs border-b border-slate-900 pb-2 flex items-center gap-2"><Settings2 size={14} /> Rule Settings</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => g.setSettings({...g.settings, elementalEnabled: !g.settings.elementalEnabled})} className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${g.settings.elementalEnabled ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                  <Zap size={18} className={g.settings.elementalEnabled ? 'text-emerald-400' : ''} />
                  <span className="text-[10px] font-black uppercase mt-1">Elem</span>
                </button>
                <button onClick={() => g.setSettings({...g.settings, sameEnabled: !g.settings.sameEnabled})} className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${g.settings.sameEnabled ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                  <Layers size={18} className={g.settings.sameEnabled ? 'text-blue-400' : ''} />
                  <span className="text-[10px] font-black uppercase mt-1">Same</span>
                </button>
                <button onClick={() => g.setSettings({...g.settings, plusEnabled: !g.settings.plusEnabled})} className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${g.settings.plusEnabled ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                  <PlusIcon size={18} className={g.settings.plusEnabled ? 'text-amber-400' : ''} />
                  <span className="text-[10px] font-black uppercase mt-1">Plus</span>
                </button>
              </div>
              
              {!g.settings.pvpMode && (
                <button 
                  onClick={() => {
                    const lvls: GameSettings['cpuDifficulty'][] = ['LOW', 'MID', 'HIGH', 'EXPERT'];
                    g.setSettings({...g.settings, cpuDifficulty: lvls[(lvls.indexOf(g.settings.cpuDifficulty) + 1) % 4]});
                  }} 
                  className={`w-full p-4 sm:p-6 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 bg-slate-900/50 hover:bg-slate-800/80 ${difficultyConfig[g.settings.cpuDifficulty].border}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-slate-800 ${difficultyConfig[g.settings.cpuDifficulty].color}`}>
                      {difficultyConfig[g.settings.cpuDifficulty].icon}
                    </div>
                    <div>
                      <div className={`font-black italic text-base sm:text-lg uppercase ${difficultyConfig[g.settings.cpuDifficulty].color}`}>CPU: {difficultyConfig[g.settings.cpuDifficulty].label}</div>
                      <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Intelligence</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => { g.setRound(1); g.setMatchResults([]); g.setGameState('DECK_SELECT'); }} className="px-16 sm:px-24 py-5 sm:py-8 bg-white text-slate-950 rounded-full font-black text-xl sm:text-3xl italic uppercase hover:scale-110 transition-all active:scale-95 shadow-xl">Start Battle</button>
      </div>
    </div>
  );

  if (g.gameState === 'DECK_SELECT') return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      <div className="h-full flex flex-col items-center overflow-y-auto pb-10 w-full">
         <div className="mb-4 sm:mb-6 text-center shrink-0 pt-4">
            <h2 className="text-2xl sm:text-4xl font-black italic uppercase text-white mb-1 leading-none">Deck Selection</h2>
            <div className={`px-6 sm:px-10 py-1 sm:py-1.5 rounded-full inline-block font-black uppercase text-[10px] sm:text-xs tracking-widest shadow-xl ${g.selectingPlayer === 'P1' ? 'bg-blue-600' : 'bg-red-600'}`}>
               {g.selectingPlayer === 'P1' ? 'PLAYER 1' : 'PLAYER 2'} CHOICE
            </div>
         </div>
         <div className="flex-1 w-full max-w-7xl min-h-0">
            <DeckSelect 
              key={g.selectingPlayer} 
              onSelect={g.handleDeckSelect} 
              player={g.selectingPlayer} 
              color={g.selectingPlayer === 'P1' ? 'blue' : 'red'} 
              excludeIds={g.selectingPlayer === 'P2' ? new Set(g.p1Hand.map(c => c.id)) : new Set()}
              isMobile={!isLandscape}
            />
         </div>
      </div>
    </div>
  );

  if (g.gameState === 'COIN_TOSS') return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans">
       {g.tossWinner && <CoinToss winner={g.tossWinner === 'P1' ? 'PLAYER 1' : (g.settings.pvpMode ? 'PLAYER 2' : 'CPU')} onComplete={() => g.setGameState('PLAYING')} />}
    </div>
  );

  return (
    // fixed inset-0 で100dvh対応 (iOSアドレスバー対策)
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col p-2 lg:p-6 font-sans overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      <header className="flex justify-between items-center mb-2 lg:mb-6 border-b border-slate-900 pb-2 lg:pb-4 shrink-0 z-50">
        <h1 className="text-lg lg:text-3xl font-black italic uppercase flex gap-2 lg:gap-4 items-center tracking-tighter">
          <Swords className="text-blue-500" size={!isLandscape ? 24 : 32} /> Triple Triad
        </h1>
        <div className="flex gap-4 lg:gap-12 items-center">
          <div className="hidden sm:flex gap-2">
            {[...Array(3)].map((_, i) => {
              const res = g.matchResults[i];
              return (
                <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${res ? (res.winner === 'P1' ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400') : 'bg-slate-900 border-slate-800'}`}>
                  {res ? (res.winner === 'P1' ? <CheckCircle2 size={16} /> : <XCircle size={16} />) : <span className="text-[10px] text-slate-700">{i+1}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 lg:gap-6 text-2xl lg:text-5xl font-black italic tracking-tighter leading-none">
            <div className="text-blue-500">{g.scores[0]}</div>
            <div className="text-slate-700">-</div>
            <div className="text-red-500">{g.scores[1]}</div>
          </div>
        </div>
      </header>

      {/* Main Game Area: 横向きなら flex-row, 縦向きなら flex-col */}
      <main className={`flex-1 relative min-h-0 w-full flex ${isLandscape ? 'flex-row' : 'flex-col'} justify-between items-center gap-4`}>
        {['PLAYING', 'ROUND_END', 'GAME_OVER'].includes(g.gameState) && (
          <>
            {/* P2 Hand (Top/Right) */}
            <div className={`${isLandscape ? 'w-48 h-full order-3' : 'w-full h-24 shrink-0 order-1'}`}>
              <HandComp hand={g.p2Hand} score={g.scores[1]} isTurn={g.turn === 'P2'} color="red" selectedIdx={g.turn === 'P2' && g.settings.pvpMode ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} isMobile={!isLandscape} />
            </div>
            
            {/* Board Area (Center) */}
            <div className={`flex-1 flex flex-col items-center justify-center min-h-0 order-2 relative ${isLandscape ? 'h-full' : 'w-full'}`}>
              <div className={`px-6 lg:px-12 py-1 lg:py-2 rounded-full mb-2 lg:mb-6 font-black uppercase text-xs lg:text-lg shadow-2xl border-2 z-50 transition-colors ${g.turn === 'P1' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-red-600/20 border-red-500 text-red-400'}`}>
                {g.turn === 'P1' ? "Player 1 Turn" : (g.settings.pvpMode ? "Player 2 Turn" : "CPU Thinking...")}
              </div>
              
              {/* Board Container: 縦横どちらでも画面内に収まるように制限 */}
              <div className={`aspect-square flex items-center justify-center ${isLandscape ? 'h-full max-h-[80vh]' : 'w-full max-w-[80vw]'}`}>
                <BoardComp 
                  board={g.board} 
                  onPlace={(idx) => g.selectedCardIdx !== null && g.placeCard(idx, g.turn === 'P1' ? g.p1Hand : g.p2Hand, g.selectedCardIdx, g.turn)} 
                  canPlace={g.selectedCardIdx !== null && (g.settings.pvpMode || g.turn === 'P1')} 
                  selectedCardAttr={g.selectedCardIdx !== null ? (g.turn === 'P1' ? g.p1Hand[g.selectedCardIdx].attr : g.p2Hand[g.selectedCardIdx].attr) : null} 
                  effect={g.activeEffect}
                />
              </div>
            </div>

            {/* P1 Hand (Bottom/Left) */}
            <div className={`${isLandscape ? 'w-48 h-full order-1' : 'w-full h-24 shrink-0 order-3'}`}>
              <HandComp hand={g.p1Hand} score={g.scores[0]} isTurn={g.turn === 'P1'} color="blue" selectedIdx={g.turn === 'P1' ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} isMobile={!isLandscape} />
            </div>
          </>
        )}
      </main>

      {['ROUND_END', 'GAME_OVER'].includes(g.gameState) && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6 lg:p-12">
          <div className="bg-slate-900 border-4 border-slate-800 p-8 lg:p-16 rounded-[2rem] lg:rounded-[4rem] text-center max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <Trophy className="w-12 h-12 lg:w-20 lg:h-20 text-yellow-500 mx-auto mb-4 lg:mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
            <h2 className="text-3xl lg:text-6xl font-black italic uppercase mb-4 lg:mb-8 tracking-tighter text-white leading-none">
              {g.matchResults[g.matchResults.length-1]?.winner === 'P1' ? 'PLAYER 1' : g.matchResults[g.matchResults.length-1]?.winner === 'P2' ? 'PLAYER 2' : 'DRAW'}
              <div className="text-sm lg:text-2xl mt-2 text-slate-500 tracking-widest uppercase">{g.gameState === 'GAME_OVER' ? 'SERIES CHAMPION' : 'MATCH VICTORY'}</div>
            </h2>
            <button 
              onClick={() => {
                if (g.gameState === 'GAME_OVER') { g.setRound(1); g.setMatchResults([]); g.setGameState('TITLE'); }
                else { g.setRound(r => r + 1); g.setSelectingPlayer('P1'); g.setGameState('DECK_SELECT'); }
              }} 
              className="w-full py-4 lg:py-6 bg-white text-slate-950 rounded-full font-black text-lg lg:text-2xl uppercase italic hover:bg-slate-100 transition-all active:scale-95 shadow-xl leading-none"
            >
              {g.gameState === 'GAME_OVER' ? 'Return to Title' : 'Start Next Match'}
            </button>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000{perspective:1000px}
        .transform-style-3d{transform-style:preserve-3d}
        .backface-hidden{backface-visibility:hidden}
        .rotate-y-180{transform:rotateY(180deg)}
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-effect-text { animation: effect-text 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}

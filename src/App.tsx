import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Trophy, Medal, CheckCircle2, XCircle, RefreshCw, 
  Settings2, Play, Users, Cpu as CpuIcon, Zap, User, 
  ChevronRight, Layers, Plus as PlusIcon, Sparkles 
} from 'lucide-react';

// カードデータを外部ファイルからインポート
import CARD_DATA from './data/cards.json';

// --- Types ---
export type PlayerType = 'P1' | 'P2';
export type GameState = 'TITLE' | 'DECK_SELECT' | 'COIN_TOSS' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';

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

// --- Utils ---
const generateDeck = (): Card[] => {
  const pool = [...(CARD_DATA as Card[])];
  const sortedPool = pool.sort(() => Math.random() - 0.5);
  return sortedPool.slice(0, 5).map(c => ({ ...c }));
};

const calculateStats = (card: Card, element: string | null): number[] => {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
};

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

// --- Helper Functions ---
function resolveImgPath(path: string) {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  // ViteのBASE_URLに対応 (Vercelは通常 '/')
  // '//' 重なりを防ぐため先頭のスラッシュを除去
  const env = (import.meta as any).env;
  const baseUrl = (env?.BASE_URL || '/').replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return `${baseUrl}/${cleanPath}`;
}

// --- Components ---

const CardComponent: React.FC<{ card: Card | null; isSelected?: boolean; isHovered?: boolean; onClick?: () => void; small?: boolean; side?: 'left' | 'right' }> = ({ card, isSelected, isHovered, onClick, small, side = 'left' }) => {
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
      translateClass = side === 'left' ? '-translate-x-[60%] scale-95' : 'translate-x-[60%] scale-95';
    } else if (isHovered) {
      translateClass = side === 'left' ? 'hover:-translate-x-[40%] scale-110' : 'hover:translate-x-[40%] scale-110';
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

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-6 pb-2 px-2 z-10">
            <div className="text-[13px] font-black text-white uppercase tracking-normal text-center truncate drop-shadow-lg">{card.name}</div>
          </div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-xl bg-slate-800 border-4 border-slate-600 flex items-center justify-center rotate-y-180 backface-hidden text-slate-500 font-black italic text-lg shadow-inner">TT</div>
      </div>
    </div>
  );
};

const Board: React.FC<{ board: BoardTile[]; onPlace: (idx: number) => void; canPlace: boolean; selectedCardAttr: string | null }> = ({ board, onPlace, canPlace, selectedCardAttr }) => {
  return (
    <div className="w-full h-full bg-slate-900/80 p-4 rounded-[2.5rem] border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-3 shadow-2xl relative">
      {board.map((tile, i) => (
        <div key={i} onClick={() => onPlace(i)} className={`relative rounded-2xl border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${tile.card ? 'border-slate-700/30 bg-slate-800/20' : !canPlace ? 'border-slate-800 bg-slate-900/50 opacity-50' : !tile.element ? 'border-blue-500/40 bg-blue-500/5 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)] hover:border-blue-400' : tile.element === selectedCardAttr ? 'border-yellow-400 bg-yellow-400/10 animate-pulse' : 'border-red-900/80 bg-red-950/40'}`}>
          {!tile.card && tile.element && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
               <span className="text-5xl opacity-20 drop-shadow-lg">{ELEMENT_ICONS[tile.element]}</span>
               <span className="text-[10px] font-black text-white/10 uppercase mt-1">{tile.element}</span>
            </div>
          )}
          {tile.card && <div className="w-full h-full p-1 animate-in zoom-in-95 duration-300 z-10"><CardComponent card={tile.card} /></div>}
        </div>
      ))}
    </div>
  );
};

const Hand: React.FC<{ hand: Card[]; score: number; isTurn: boolean; selectedIdx: number | null; onSelect: (idx: number) => void; color: 'blue' | 'red' }> = ({ hand, score, isTurn, selectedIdx, onSelect, color }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const isP1 = color === 'blue';
  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className={`p-4 rounded-2xl border-2 shadow-lg flex justify-between items-center z-20 ${isP1 ? 'bg-blue-900/30 border-blue-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{isP1 ? 'Player 1' : 'Player 2'}</span>
          <span className={`text-3xl font-black italic ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>{score}</span>
        </div>
        <div className={`w-3 h-12 rounded-full ${isTurn ? (isP1 ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse') : 'bg-slate-700'}`} />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-h-0 relative">
        {hand.map((card, i) => (
          <div 
            key={`${card.id}-${i}`} 
            className="h-[18%] w-full min-h-0 relative transition-all duration-300"
            style={{ zIndex: hoveredIdx === i ? 50 : (selectedIdx === i ? 40 : 10) }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <CardComponent 
              card={card} 
              isSelected={selectedIdx === i} 
              isHovered={hoveredIdx === i}
              side={isP1 ? 'left' : 'right'} 
              onClick={() => isTurn && onSelect(i)} 
            />
          </div>
        ))}
        {[...Array(Math.max(0, 5 - hand.length))].map((_, i) => (
          <div key={`empty-${i}`} className="h-[18%] w-full min-h-0 opacity-10 pointer-events-none"><CardComponent card={null} /></div>
        ))}
      </div>
    </div>
  );
};

const DeckSelect: React.FC<{ onSelect: (deck: Card[]) => void; player: string; color: 'blue' | 'red' }> = ({ onSelect, player, color }) => {
  const [options, setOptions] = useState<Card[][]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number>(0);

  useEffect(() => {
    const newOptions = Array.from({ length: 5 }).map(() => generateDeck());
    setOptions(newOptions);
  }, []);

  if (options.length === 0) return null;

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex-1 grid grid-cols-5 gap-6">
        {options.map((deck, idx) => (
          <button 
            key={`pattern-${idx}`} 
            onMouseEnter={() => setHoveredIdx(idx)}
            onClick={() => onSelect(deck)}
            className={`relative flex flex-col items-center justify-center p-8 rounded-3xl border-4 transition-all duration-300 group
              ${hoveredIdx === idx 
                ? (color === 'blue' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.02]' : 'bg-red-600/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] scale-[1.02]')
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              }`}
          >
            <div className={`text-sm font-black mb-2 ${hoveredIdx === idx ? (color === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-slate-500'}`}>
              PATTERN 0{idx + 1}
            </div>
            <div className="text-4xl font-black italic tracking-tighter mb-6 text-white uppercase">
              SELECT <span className={color === 'blue' ? 'text-blue-500' : 'text-red-500'}>DECK</span>
            </div>
            
            <div className="space-y-2 w-full text-left opacity-70 group-hover:opacity-100 transition-opacity">
              {deck.map((c, i) => (
                <div key={i} className="flex justify-between text-[10px] font-bold border-b border-slate-800 pb-1">
                  <span className="text-slate-500 font-mono">Lv.{c.level}</span>
                  <span className="truncate max-w-[120px] text-slate-300 uppercase">{c.name}</span>
                </div>
              ))}
            </div>

            {hoveredIdx === idx && (
              <div className={`mt-8 flex items-center gap-2 font-black animate-bounce tracking-widest text-xs uppercase ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                Confirm Deck <Play size={16} fill="currentColor" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="h-[400px] bg-slate-900/40 border-t-2 border-slate-800 rounded-t-[4rem] p-12 relative overflow-hidden backdrop-blur-sm shrink-0">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-slate-600 font-black tracking-[0.5em] text-xs uppercase">
          <ChevronRight size={16} /> Deck Preview Details <ChevronRight size={16} className="rotate-180" />
        </div>

        <div className="flex justify-center items-end gap-8 h-full pb-4">
          {options[hoveredIdx].map((card, i) => (
            <div key={`${hoveredIdx}-${card.id}-${i}`} className="w-48 h-full flex flex-col transition-all duration-500 transform hover:-translate-y-4">
               <div className="flex-1 min-h-0 flex items-end pb-2">
                  <CardComponent card={{...card, owner: player as any}} small />
               </div>
               <div className="mt-2 text-center shrink-0">
                 <div className={`text-[10px] font-black mb-1 tracking-widest ${color === 'blue' ? 'text-blue-500' : 'text-red-500'}`}>LEVEL {card.level}</div>
                 <div className="text-sm font-black tracking-tight text-white truncate px-2 uppercase leading-none">{card.name}</div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CoinToss: React.FC<{ winner: string; onComplete: () => void }> = ({ winner, onComplete }) => {
  const [rotation, setRotation] = useState(0);
  const [showResultText, setShowResultText] = useState(false);

  useEffect(() => {
    const spins = 6 + Math.floor(Math.random() * 3); // 6〜8回転
    const timer = setTimeout(() => {
      // 演出として回転を大幅に増やす
      setRotation(360 * spins + (winner === 'PLAYER 1' ? 0 : 180));
      // 回転アニメーション(4s)が終わる直前に結果を表示
      setTimeout(() => setShowResultText(true), 3800);
      // 全体の終了
      setTimeout(onComplete, 5500);
    }, 100);
    return () => clearTimeout(timer);
  }, [winner, onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl z-50">
      <div className="mb-16 text-center animate-in fade-in duration-500">
        <h2 className="text-5xl font-black italic tracking-[0.2em] text-white uppercase mb-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">Coin Toss</h2>
        <p className="text-slate-400 font-black tracking-widest uppercase text-sm leading-none">Determining the First Turn...</p>
      </div>

      <div className="relative w-72 h-72 perspective-1000">
        <div 
          className="w-full h-full relative transition-transform duration-[4000ms] ease-in-out transform-style-3d" 
          style={{ 
            transform: `rotateY(${rotation}deg)` 
          }}
        >
          <div className="absolute inset-0 w-full h-full rounded-full border-[10px] border-blue-400 bg-gradient-to-br from-blue-500 to-blue-800 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.6)] backface-hidden">
            <div className="bg-white/20 p-4 rounded-full mb-2"><span className="text-white font-black text-6xl italic text-center leading-none">P1</span></div>
            <span className="text-blue-100 font-black text-xs tracking-[0.3em] uppercase leading-none">Player 1</span>
          </div>
          <div className="absolute inset-0 w-full h-full rounded-full border-[10px] border-red-500 bg-gradient-to-br from-red-600 to-red-900 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.6)] backface-hidden rotate-y-180">
            <div className="bg-white/20 p-4 rounded-full mb-2"><span className="text-white font-black text-6xl italic text-center leading-none">P2</span></div>
            <span className="text-red-100 font-black text-xs tracking-[0.3em] uppercase leading-none">Player 2</span>
          </div>
        </div>
      </div>

      <div className="mt-20 h-16 flex flex-col items-center">
        {showResultText && (
          <div className="animate-in slide-in-from-bottom-4 zoom-in duration-700">
             <span className={`text-4xl font-black italic tracking-[0.1em] uppercase px-12 py-4 rounded-full border-4 shadow-2xl ${winner === 'PLAYER 1' ? 'text-blue-400 border-blue-500 bg-blue-500/20 shadow-blue-900/40' : 'text-red-400 border-red-500 bg-red-500/20 shadow-red-900/40'}`}>
               {winner} START
             </span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Logic ---
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
      if (settings.pvpMode) { setSelectingPlayer('P2'); }
      else { 
        setP2Hand(generateDeck().map(c => ({ ...c, owner: 'P2' })));
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

  const placeCard = useCallback((idx: number, hand: Card[], handIdx: number, owner: PlayerType) => {
    if (board[idx].card || turn !== owner) return;
    const nextBoard = board.map(tile => ({ ...tile }));
    const card = hand[handIdx];
    const stats = calculateStats(card, nextBoard[idx].element);
    nextBoard[idx].card = { ...card, owner, modifiedStats: stats };
    setBoard(nextBoard);
    if (owner === 'P1') setP1Hand(prev => prev.filter((_, i) => i !== handIdx));
    else setP2Hand(prev => prev.filter((_, i) => i !== handIdx));
    setSelectedCardIdx(null);
    setTurn(owner === 'P1' ? 'P2' : 'P1');
  }, [board, turn]);

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

  return { gameState, setGameState, round, matchResults, p1Hand, p2Hand, board, turn, selectedCardIdx, setSelectedCardIdx, tossWinner, selectingPlayer, settings, setSettings, handleDeckSelect, placeCard, scores, setRound, setMatchResults, startGame, nextRound: () => { setRound(r => r + 1); setSelectingPlayer('P1'); setGameState('DECK_SELECT'); } };
};

// --- Main App ---
export default function App() {
  const g = useGame();

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

  if (g.gameState === 'TITLE') return (
    <div className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      
      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full">
        <h1 className="text-9xl font-black italic mb-16 uppercase tracking-tighter drop-shadow-2xl">Triple <span className="text-blue-500">Triad</span></h1>
        
        <div className="grid grid-cols-2 gap-12 w-full mb-12">
          <div className="space-y-4 text-left">
            <h3 className="text-slate-500 font-bold uppercase text-xs border-b border-slate-900 pb-2 flex items-center gap-2"><Users size={14} /> Game Mode</h3>
            <button onClick={() => g.setSettings({ ...g.settings, pvpMode: false })} className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${!g.settings.pvpMode ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-4"><User size={20} /><span className="font-black italic">VS CPU</span></div>
              {!g.settings.pvpMode && <CheckCircle2 size={20} />}
            </button>
            <button onClick={() => g.setSettings({ ...g.settings, pvpMode: true })} className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${g.settings.pvpMode ? 'bg-purple-600 border-purple-400 shadow-lg' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-4"><Users size={20} /><span className="font-black italic">LOCAL PVP</span></div>
              {g.settings.pvpMode && <CheckCircle2 size={20} />}
            </button>
          </div>

          <div className="space-y-4 text-left">
            <h3 className="text-slate-500 font-bold uppercase text-xs border-b border-slate-900 pb-2 flex items-center gap-2"><Settings2 size={14} /> Rule Settings</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => g.setSettings({...g.settings, elementalEnabled: !g.settings.elementalEnabled})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${g.settings.elementalEnabled ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                  <Zap size={18} className={g.settings.elementalEnabled ? 'text-emerald-400' : ''} />
                  <span className="text-[10px] font-black uppercase mt-1">Elem</span>
                </button>
                <button onClick={() => g.setSettings({...g.settings, sameEnabled: !g.settings.sameEnabled})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${g.settings.sameEnabled ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                  <Layers size={18} className={g.settings.sameEnabled ? 'text-blue-400' : ''} />
                  <span className="text-[10px] font-black uppercase mt-1">Same</span>
                </button>
                <button onClick={() => g.setSettings({...g.settings, plusEnabled: !g.settings.plusEnabled})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${g.settings.plusEnabled ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
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
                  className={`w-full p-6 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 bg-slate-900/50 hover:bg-slate-800/80 ${difficultyConfig[g.settings.cpuDifficulty].border}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 ${difficultyConfig[g.settings.cpuDifficulty].color}`}>
                      {difficultyConfig[g.settings.cpuDifficulty].icon}
                    </div>
                    <div>
                      <div className={`font-black italic text-lg uppercase ${difficultyConfig[g.settings.cpuDifficulty].color}`}>CPU: {difficultyConfig[g.settings.cpuDifficulty].label}</div>
                      <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Intelligence</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => { g.setRound(1); g.setMatchResults([]); g.setGameState('DECK_SELECT'); }} className="px-24 py-8 bg-white text-slate-950 rounded-full font-black text-3xl italic uppercase hover:scale-110 transition-all active:scale-95 shadow-xl">Start Battle</button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex flex-col p-8 font-sans overflow-hidden relative">
      <header className="flex justify-between items-center mb-6 border-b border-slate-900 pb-4 shrink-0">
        <h1 className="text-3xl font-black italic uppercase flex gap-4 items-center tracking-tighter">
          <Swords className="text-blue-500" size={32} /> Triple Triad
        </h1>
        <div className="flex gap-12 items-center">
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => {
              const res = g.matchResults[i];
              return (
                <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${res ? (res.winner === 'P1' ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400') : 'bg-slate-900 border-slate-800'}`}>
                  {res ? (res.winner === 'P1' ? <CheckCircle2 size={16} /> : <XCircle size={16} />) : <span className="text-[10px] text-slate-700">{i+1}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-6 text-5xl font-black italic tracking-tighter leading-none">
            <div className="text-blue-500">{g.scores[0]}</div>
            <div className="text-slate-700">-</div>
            <div className="text-red-500">{g.scores[1]}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative min-h-0">
        {g.gameState === 'DECK_SELECT' && (
          <div className="h-full flex flex-col items-center">
             <div className="mb-6 text-center">
                <h2 className="text-4xl font-black italic uppercase text-white mb-2 leading-none">Deck Selection</h2>
                <div className={`px-10 py-1.5 rounded-full inline-block font-black uppercase text-xs tracking-widest shadow-xl ${g.selectingPlayer === 'P1' ? 'bg-blue-600' : 'bg-red-600'}`}>
                   {g.selectingPlayer === 'P1' ? 'PLAYER 1' : 'PLAYER 2'} CHOICE
                </div>
             </div>
             <div className="flex-1 w-full max-w-7xl min-h-0">
                <DeckSelect key={g.selectingPlayer} onSelect={g.handleDeckSelect} player={g.selectingPlayer} color={g.selectingPlayer === 'P1' ? 'blue' : 'red'} />
             </div>
          </div>
        )}
        
        {g.gameState === 'COIN_TOSS' && g.tossWinner && (
          <CoinToss winner={g.tossWinner === 'P1' ? 'PLAYER 1' : (g.settings.pvpMode ? 'PLAYER 2' : 'CPU')} onComplete={() => g.setGameState('PLAYING')} />
        )}

        {['PLAYING', 'ROUND_END', 'GAME_OVER'].includes(g.gameState) && (
          <div className="h-full flex gap-12 justify-center animate-in fade-in duration-500 pt-4">
            <div className="w-64 shrink-0 h-full"><Hand hand={g.p1Hand} score={g.scores[0]} isTurn={g.turn === 'P1'} color="blue" selectedIdx={g.turn === 'P1' ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} /></div>
            
            <div className="flex-1 max-w-4xl flex flex-col items-center h-full">
              <div className={`px-12 py-4 rounded-2xl mb-8 font-black uppercase text-2xl border-b-4 transition-all duration-500 shadow-2xl ${g.turn === 'P1' ? 'bg-blue-600 border-blue-800 shadow-blue-900/40' : 'bg-red-600 border-red-800 shadow-red-900/40'}`}>
                {g.turn === 'P1' ? "PLAYER 1 TURN" : (g.settings.pvpMode ? "PLAYER 2 TURN" : "CPU THINKING...")}
              </div>
              <div className="w-full flex-1 min-h-0 flex items-center justify-center p-4">
                <div className="w-full h-full max-w-lg aspect-square">
                  <Board 
                    board={g.board} 
                    onPlace={(idx) => g.selectedCardIdx !== null && g.placeCard(idx, g.turn === 'P1' ? g.p1Hand : g.p2Hand, g.selectedCardIdx, g.turn)} 
                    canPlace={g.selectedCardIdx !== null && (g.settings.pvpMode || g.turn === 'P1')} 
                    selectedCardAttr={g.selectedCardIdx !== null ? (g.turn === 'P1' ? g.p1Hand[g.selectedCardIdx].attr : g.p2Hand[g.selectedCardIdx].attr) : null} 
                  />
                </div>
              </div>
            </div>

            <div className="w-64 shrink-0 h-full">
              <Hand hand={g.p2Hand} score={g.scores[1]} isTurn={g.turn === 'P2'} color="red" selectedIdx={g.turn === 'P2' && g.settings.pvpMode ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} />
            </div>
          </div>
        )}
      </main>

      {['ROUND_END', 'GAME_OVER'].includes(g.gameState) && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-12">
          <div className="bg-slate-900 border-4 border-slate-800 p-16 rounded-[4rem] text-center max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
            <h2 className="text-6xl font-black italic uppercase mb-8 tracking-tighter text-white">
              {g.matchResults[g.matchResults.length-1]?.winner === 'P1' ? 'PLAYER 1' : g.matchResults[g.matchResults.length-1]?.winner === 'P2' ? 'PLAYER 2' : 'DRAW'}
              <div className="text-2xl mt-2 text-slate-500 tracking-widest uppercase">{g.gameState === 'GAME_OVER' ? 'SERIES CHAMPION' : 'MATCH VICTORY'}</div>
            </h2>
            <button 
              onClick={() => g.gameState === 'GAME_OVER' ? g.setGameState('TITLE') : g.nextRound()} 
              className="w-full py-6 bg-white text-slate-950 rounded-full font-black text-2xl uppercase italic hover:bg-slate-100 transition-all active:scale-95 shadow-xl leading-none"
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
      `}} />
    </div>
  );
}

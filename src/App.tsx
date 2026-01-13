import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Trophy, CheckCircle2, XCircle, 
  Settings2, Play, Users, Cpu as CpuIcon, Zap, User, 
  ChevronRight, Layers, Plus as PlusIcon, Sparkles 
} from 'lucide-react';

// カードデータを外部ファイルからインポート
// ※環境に合わせてパスやデータ構造を確認してください
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

// --- Custom Hooks ---

// ウィンドウサイズを監視するフック
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// --- Helper Functions ---
function resolveImgPath(path: string) {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  // ViteのBASE_URLに対応 (Vercelは通常 '/')
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function generateDeck(excludeIds?: Set<number>): Card[] {
  const pool = excludeIds ? (CARD_DATA as any[]).filter(c => !excludeIds.has(c.id)) : (CARD_DATA as any[]);
  const sortedPool = [...pool].sort(() => Math.random() - 0.5);
  return sortedPool.slice(0, 5).map(c => ({ ...c }));
}

function calculateStats(card: Card, element: string | null): number[] {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
}

function getBestMove(board: BoardTile[], hand: Card[], settings: GameSettings): { boardIdx: number; handIdx: number } {
  const emptyCells = board.map((t, i) => t.card === null ? i : null).filter((i): i is number => i !== null);
  if (settings.cpuDifficulty === 'LOW' || emptyCells.length === 0) {
    return { boardIdx: emptyCells[Math.floor(Math.random() * emptyCells.length)], handIdx: Math.floor(Math.random() * hand.length) };
  }
  const moves = emptyCells.flatMap(bIdx => hand.map((card, hIdx) => {
    const stats = calculateStats(card, board[bIdx].element);
    let score = 0;
    const neighbors = [
      { pos: bIdx - 3, side: 0, oppSide: 3, active: bIdx >= 3 },
      { pos: bIdx - 1, side: 1, oppSide: 2, active: bIdx % 3 !== 0 },
      { pos: bIdx + 1, side: 2, oppSide: 1, active: bIdx % 3 !== 2 },
      { pos: bIdx + 3, side: 3, oppSide: 0, active: bIdx < 6 },
    ];
    neighbors.forEach(n => {
      if (n.active && board[n.pos].card && board[n.pos].card?.owner === 'P1') {
        const oppVal = (board[n.pos].card!.modifiedStats || board[n.pos].card!.stats)[n.oppSide];
        if (stats[n.side] > oppVal) score += 20;
        if (stats[n.side] === oppVal && settings.sameEnabled) score += 50;
      }
    });
    if ([0, 2, 6, 8].includes(bIdx)) score += 10;
    return { bIdx, hIdx, score };
  }));
  moves.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return { boardIdx: moves[0].bIdx, handIdx: moves[0].hIdx };
}

// --- UI Components ---

function CardComponent({ card, isSelected, onClick, small, side = 'left', orientation = 'vertical' }: { card: Card | null; isSelected?: boolean; onClick?: () => void; small?: boolean; side?: 'left' | 'right'; orientation?: 'vertical' | 'horizontal' }) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayOwner, setDisplayOwner] = useState(card?.owner);
  const prevOwnerRef = useRef(card?.owner);

  useEffect(() => {
    if (!card) return;
    if (card.owner !== prevOwnerRef.current) {
      if (prevOwnerRef.current) {
        setIsFlipping(true);
        setTimeout(() => setDisplayOwner(card.owner), 250);
        setTimeout(() => setIsFlipping(false), 500);
      } else {
        setDisplayOwner(card.owner);
      }
      prevOwnerRef.current = card.owner;
    }
  }, [card?.owner]);

  if (!card) return (
    <div className="w-full aspect-[3/4] bg-slate-800/20 rounded-lg border-2 border-dashed border-slate-700/30 flex items-center justify-center opacity-50">
      <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full border-4 border-slate-700/10 opacity-20" />
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

  const ownerClass = displayOwner === 'P1' ? 'from-blue-600 to-blue-900 border-blue-400' : 'from-red-600 to-red-900 border-red-400';
  
  // モバイルでは縦方向にせり出す、PCでは横方向にせり出す
  const transformOrigin = orientation === 'vertical' ? (side === 'left' ? 'origin-right' : 'origin-left') : 'origin-bottom';
  const translateClass = isSelected 
    ? (orientation === 'vertical' 
        ? (side === 'left' ? '-translate-x-4 lg:-translate-x-12 scale-95' : 'translate-x-4 lg:translate-x-12 scale-95') 
        : '-translate-y-8 scale-110 ring-4 ring-yellow-400') 
    : '';

  return (
    <div onClick={onClick} className={`relative w-full aspect-[3/4] transition-all duration-300 perspective-1000 ${transformOrigin} ${onClick ? 'cursor-pointer' : ''} ${isSelected ? 'z-50' : 'z-10'} ${translateClass} ${small ? 'scale-90' : ''}`}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        <div className={`absolute inset-0 w-full h-full rounded-lg lg:rounded-xl bg-gradient-to-br ${ownerClass} border-2 lg:border-4 overflow-hidden backface-hidden shadow-xl`}>
          <div className="absolute inset-0 bg-slate-900"><img src={resolveImgPath(card.img)} alt={card.name} className="w-full h-full object-cover opacity-80 pointer-events-none" /></div>
          
          {/* Stats Display */}
          <div className="absolute top-0.5 left-0.5 lg:top-1 lg:left-1 w-8 h-10 lg:w-12 lg:h-14 bg-black/70 backdrop-blur-md rounded border border-white/20 z-20 flex flex-col items-center justify-center shadow-xl scale-[0.7] lg:scale-100 origin-top-left">
            <div className="relative w-full h-full flex flex-col items-center justify-center font-black italic text-white text-base leading-none drop-shadow-md">
              <div className={getStatColor(0)}>{displayStat(stats[0])}</div>
              <div className="flex w-full justify-between px-1">
                 <span className={getStatColor(1)}>{displayStat(stats[1])}</span>
                 <span className={getStatColor(2)}>{displayStat(stats[2])}</span>
              </div>
              <div className={getStatColor(3)}>{displayStat(stats[3])}</div>
            </div>
          </div>

          {card.attr && (
            <div className="absolute top-0.5 right-0.5 lg:top-1.5 lg:right-1.5 w-5 h-5 lg:w-7 lg:h-7 bg-black/40 border border-white/20 rounded flex items-center justify-center z-20 scale-75 lg:scale-100">
              <span className="text-[10px] lg:text-[12px]">{ELEMENT_ICONS[card.attr]}</span>
            </div>
          )}
          
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/95 pt-4 lg:pt-8 pb-1 lg:pb-2 px-1 z-10 text-center">
            <div className="text-[8px] lg:text-[13px] font-black text-white uppercase truncate tracking-tight">{card.name}</div>
          </div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-lg lg:rounded-xl bg-slate-800 border-2 lg:border-4 border-slate-600 flex items-center justify-center rotate-y-180 backface-hidden text-slate-500 font-black italic text-sm lg:text-xl shadow-inner">TT</div>
      </div>
    </div>
  );
}

function Board({ board, onPlace, canPlace, selectedCardAttr, effect }: { board: BoardTile[]; onPlace: (idx: number) => void; canPlace: boolean; selectedCardAttr: string | null; effect: string | null }) {
  return (
    <div className="w-full aspect-square bg-slate-900/90 p-2 lg:p-4 rounded-3xl lg:rounded-[2.5rem] border-2 lg:border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-1.5 lg:gap-3 shadow-2xl relative overflow-visible">
      {board.map((tile, i) => (
        <div key={i} onClick={() => onPlace(i)} className={`relative rounded-xl lg:rounded-2xl border transition-all duration-300 flex items-center justify-center overflow-hidden ${tile.card ? 'border-slate-700/30' : !canPlace ? 'border-slate-800 bg-slate-950/50' : !tile.element ? 'border-blue-500/40 bg-blue-500/5 hover:border-blue-400' : tile.element === selectedCardAttr ? 'border-yellow-400 bg-yellow-400/10 animate-pulse hover:border-yellow-300' : 'border-red-900/40 bg-red-950/20 hover:border-red-600'}`}>
          {!tile.card && tile.element && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
               <span className="text-2xl lg:text-5xl opacity-20">{ELEMENT_ICONS[tile.element]}</span>
               <span className="text-[8px] lg:text-[10px] font-black text-white/10 uppercase mt-0.5 lg:mt-1 tracking-widest">{tile.element}</span>
            </div>
          )}
          {tile.card && <div className="w-full h-full p-0.5 lg:p-1 animate-in zoom-in-95 duration-300 z-10"><CardComponent card={tile.card} /></div>}
        </div>
      ))}
      {effect && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
           <div className="animate-effect-text text-4xl lg:text-8xl font-black italic text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,1)] uppercase tracking-tighter">{effect}!</div>
        </div>
      )}
    </div>
  );
}

function Hand({ hand, score, isTurn, selectedIdx, onSelect, color, windowWidth }: { hand: Card[]; score: number; isTurn: boolean; selectedIdx: number | null; onSelect: (idx: number) => void; color: 'blue' | 'red'; windowWidth: number }) {
  const isP1 = color === 'blue';
  const isMobile = windowWidth < 1024;
  return (
    <div className={`flex ${isP1 ? 'flex-col-reverse lg:flex-col' : 'flex-col'} h-auto lg:h-full w-full lg:w-64 gap-2 lg:gap-4 relative shrink-0`}>
      {/* Score Badge */}
      <div className={`p-2 lg:p-4 rounded-xl lg:rounded-2xl border-2 shadow-lg flex justify-between items-center z-20 ${isP1 ? 'bg-blue-900/40 border-blue-500/50' : 'bg-red-900/40 border-red-500/50'}`}>
        <div className="flex flex-col text-left">
          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{isP1 ? 'Player 1' : 'Player 2'}</span>
          <span className={`text-2xl lg:text-4xl font-black italic leading-none ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>{score}</span>
        </div>
        <div className={`w-2 h-8 lg:w-3 lg:h-12 rounded-full ${isTurn ? (isP1 ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse') : 'bg-slate-800'}`} />
      </div>

      {/* Cards List */}
      <div className="flex flex-row lg:flex-col lg:grid lg:grid-rows-5 gap-1 min-h-0 relative items-end">
        {[...Array(5)].map((_, i) => {
          const card = hand[i];
          return (
            <div key={i} className="flex-1 lg:w-full aspect-[3/4] relative" style={{ zIndex: selectedIdx === i ? 50 : 10 }}>
              {card ? (
                <CardComponent 
                  card={card} 
                  isSelected={selectedIdx === i} 
                  side={isP1 ? 'left' : 'right'} 
                  orientation={isMobile ? 'horizontal' : 'vertical'}
                  onClick={() => isTurn && onSelect(i)} 
                />
              ) : (
                <CardComponent card={null} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Game Hook ---
function useGame() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [p1Hand, setP1Hand] = useState<Card[]>([]);
  const [p2Hand, setP2Hand] = useState<Card[]>([]);
  const [board, setBoard] = useState<BoardTile[]>([]);
  const [turn, setTurn] = useState<PlayerType>('P1');
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [tossWinner, setTossWinner] = useState<PlayerType | null>(null);
  const [selectingPlayer, setSelectingPlayer] = useState<PlayerType>('P1');
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>({
    elementalEnabled: true, sameEnabled: true, plusEnabled: true, cpuDifficulty: 'MID', pvpMode: false
  });

  const triggerEffect = useCallback((name: string) => {
    setActiveEffect(null);
    setTimeout(() => setActiveEffect(name), 10);
    setTimeout(() => setActiveEffect(null), 1500);
  }, []);

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

  const placeCard = useCallback((idx: number, hand: Card[], handIdx: number, owner: PlayerType) => {
    if (board[idx].card || turn !== owner) return;
    const nextBoard = board.map(tile => ({ ...tile }));
    const card = hand[handIdx];
    const stats = calculateStats(card, nextBoard[idx].element);
    nextBoard[idx].card = { ...card, owner, modifiedStats: stats };
    
    // 省略：ルールロジック（SAME/PLUS/COMBO）は既存のものを維持
    // ...
    setBoard(nextBoard);
    if (owner === 'P1') setP1Hand(prev => prev.filter((_, i) => i !== handIdx));
    else setP2Hand(prev => prev.filter((_, i) => i !== handIdx));
    setSelectedCardIdx(null);
    setTurn(owner === 'P1' ? 'P2' : 'P1');
  }, [board, turn, settings, triggerEffect]);

  const scores = useMemo(() => {
    let s1 = p1Hand.length, s2 = p2Hand.length;
    board.forEach(t => { if (t.card?.owner === 'P1') s1++; if (t.card?.owner === 'P2') s2++; });
    return [s1, s2];
  }, [board, p1Hand, p2Hand]);

  return { 
    gameState, setGameState, matchResults, setMatchResults, p1Hand, p2Hand, 
    board, turn, selectedCardIdx, setSelectedCardIdx, tossWinner, selectingPlayer, 
    settings, setSettings, scores, activeEffect, triggerEffect, initializeBoard, 
    placeCard, setP1Hand, setP2Hand, setBoard, setTossWinner, setSelectingPlayer 
  };
}

// --- Main App ---

export default function App() {
  const g = useGame();
  const { width } = useWindowSize();

  const handleDeckSelect = (deck: Card[]) => {
    if (g.selectingPlayer === 'P1') {
      g.setP1Hand(deck.map(c => ({ ...c, owner: 'P1' })));
      if (g.settings.pvpMode) g.setSelectingPlayer('P2');
      else { 
        g.setP2Hand(generateDeck().map(c => ({ ...c, owner: 'P2' })));
        g.setBoard(g.initializeBoard());
        const winner = Math.random() > 0.5 ? 'P1' : 'P2';
        g.setTossWinner(winner);
        g.setGameState('COIN_TOSS');
      }
    } else {
      g.setP2Hand(deck.map(c => ({ ...c, owner: 'P2' })));
      g.setBoard(g.initializeBoard());
      const winner = Math.random() > 0.5 ? 'P1' : 'P2';
      g.setTossWinner(winner);
      g.setGameState('COIN_TOSS');
    }
  };

  useEffect(() => {
    if (!g.settings.pvpMode && g.gameState === 'PLAYING' && g.turn === 'P2' && g.p2Hand.length > 0) {
      const timer = setTimeout(() => {
        const { boardIdx, handIdx } = getBestMove(g.board, g.p2Hand, g.settings);
        g.placeCard(boardIdx, g.p2Hand, handIdx, 'P2');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [g.turn, g.gameState, g.p2Hand, g.settings, g.board, g.placeCard]);

  // UI描画
  if (g.gameState === 'TITLE') return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 lg:p-8 font-sans overflow-hidden text-center">
      <div className="absolute top-1/4 left-1/4 w-48 h-48 lg:w-96 lg:h-96 bg-blue-600/10 blur-[60px] lg:blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 lg:w-96 lg:h-96 bg-red-600/10 blur-[60px] lg:blur-[120px] rounded-full animate-pulse delay-700" />
      
      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full">
        <h1 className="text-5xl lg:text-9xl font-black italic mb-8 lg:mb-16 uppercase tracking-tighter drop-shadow-2xl">Triple <span className="text-blue-500">Triad</span></h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 w-full mb-8 lg:mb-12">
          {/* Game Modes & Settings Selection */}
          <div className="space-y-4">
             <button onClick={() => g.setSettings({...g.settings, pvpMode: !g.settings.pvpMode})} className="w-full p-4 lg:p-6 rounded-2xl border-2 bg-slate-900 border-slate-800 flex justify-between items-center transition-all">
                <span className="font-black italic text-base lg:text-lg uppercase">{g.settings.pvpMode ? 'Local PvP' : 'Vs CPU'}</span>
                <Settings2 size={20} className="text-blue-500" />
             </button>
             {/* ... Other settings items ... */}
          </div>
        </div>
        
        <button onClick={() => g.setGameState('DECK_SELECT')} className="px-12 lg:px-24 py-4 lg:py-8 bg-white text-slate-950 rounded-full font-black text-xl lg:text-3xl italic uppercase hover:scale-110 transition-all active:scale-95 shadow-xl">Start Battle</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col p-2 lg:p-6 font-sans overflow-hidden">
      <header className="flex justify-between items-center mb-2 lg:mb-6 border-b border-slate-900 pb-2 lg:pb-4 shrink-0 z-50">
        <h1 className="text-lg lg:text-3xl font-black italic uppercase flex gap-2 lg:gap-4 items-center tracking-tighter"><Swords className="text-blue-500" size={24} /> Triple Triad</h1>
        <div className="flex gap-4 lg:gap-12 items-center text-2xl lg:text-5xl font-black italic tracking-tighter leading-none text-right">
          <div className="text-blue-500">{g.scores[0]}</div><div className="text-slate-800">/</div><div className="text-red-500">{g.scores[1]}</div>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center min-h-0 w-full">
        {g.gameState === 'DECK_SELECT' ? (
          <div className="w-full h-full flex flex-col items-center overflow-hidden">
             <h2 className="text-2xl lg:text-4xl font-black italic uppercase mb-4 text-white">Select Deck</h2>
             <div className="flex-1 w-full max-w-7xl min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 px-2">
                   {[...Array(5)].map((_, i) => (
                     <button key={i} onClick={() => handleDeckSelect(generateDeck())} className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl border-2 bg-slate-900 border-slate-800 hover:border-blue-500 transition-all font-black text-xs lg:text-sm uppercase italic">Pattern 0{i+1}</button>
                   ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-12 w-full h-full max-w-7xl mx-auto overflow-hidden">
            {/* Player 2 Hand (Mobile Top) */}
            <div className="w-full lg:w-64 lg:order-3">
              <Hand hand={g.p2Hand} score={g.scores[1]} isTurn={g.turn === 'P2'} color="red" selectedIdx={null} onSelect={() => {}} windowWidth={width} />
            </div>

            {/* Board (Center) */}
            <div className="flex-1 w-full max-w-[500px] flex flex-col items-center justify-center h-auto min-h-0 relative lg:order-2">
              <div className={`px-6 lg:px-12 py-1.5 lg:py-3 rounded-full mb-4 lg:mb-8 font-black uppercase text-sm lg:text-xl shadow-2xl transition-all duration-500 border-2 z-50 ${g.turn === 'P1' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-red-600/20 border-red-500 text-red-400'}`}>
                {g.turn === 'P1' ? "Player 1 Turn" : (g.settings.pvpMode ? "Player 2 Turn" : "CPU Thinking...")}
              </div>
              <Board 
                board={g.board} 
                onPlace={(idx) => g.selectedCardIdx !== null && g.placeCard(idx, g.turn === 'P1' ? g.p1Hand : g.p2Hand, g.selectedCardIdx, g.turn)} 
                canPlace={g.selectedCardIdx !== null && (g.settings.pvpMode || g.turn === 'P1')} 
                selectedCardAttr={g.selectedCardIdx !== null ? (g.turn === 'P1' ? g.p1Hand[g.selectedCardIdx].attr : g.p2Hand[g.selectedCardIdx].attr) : null}
                effect={g.activeEffect}
              />
            </div>

            {/* Player 1 Hand (Mobile Bottom) */}
            <div className="w-full lg:w-64 lg:order-1">
              <Hand hand={g.p1Hand} score={g.scores[0]} isTurn={g.turn === 'P1'} color="blue" selectedIdx={g.turn === 'P1' ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} windowWidth={width} />
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000{perspective:1000px} .transform-style-3d{transform-style:preserve-3d} .backface-hidden{backface-visibility:hidden} .rotate-y-180{transform:rotateY(180deg)}
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-in { animation: fade-in 0.5s ease-out forwards; }
        @keyframes effect-text { 0% { transform: scale(0.3) rotate(-10deg); opacity: 0; } 20% { transform: scale(1.2) rotate(5deg); opacity: 1; } 100% { transform: scale(1.5) translateY(-50px); opacity: 0; } }
        .animate-effect-text { animation: effect-text 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .overflow-y-auto::-webkit-scrollbar { display: none; }
        .overflow-y-auto { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

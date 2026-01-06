import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Trophy, CheckCircle2, XCircle, 
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

// --- Helper Functions ---
function resolveImgPath(path: string) {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  // GitHub Pages等のベースパスを考慮
  const baseUrl = ((import.meta as any).env.BASE_URL || '/').replace(/\/$/, '');
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

// --- UI Sub-Components ---

function CardComponent({ card, isSelected, isHovered, onClick, small, side = 'left' }: { card: Card | null; isSelected?: boolean; isHovered?: boolean; onClick?: () => void; small?: boolean; side?: 'left' | 'right' }) {
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
    <div className="w-full aspect-[3/4] bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-700/30 flex items-center justify-center opacity-50">
      <div className="w-8 h-8 rounded-full border-4 border-slate-700/10 opacity-20" />
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

  const ownerClass = displayOwner === 'P1' ? 'from-blue-600 to-blue-900 border-blue-400 shadow-lg' : 'from-red-600 to-red-900 border-red-400 shadow-lg';
  const transformOrigin = side === 'left' ? 'origin-right' : 'origin-left';
  let translateClass = isSelected ? (side === 'left' ? '-translate-x-12 scale-95' : 'translate-x-12 scale-95') : (isHovered ? 'scale-105' : '');

  return (
    <div onClick={onClick} className={`relative w-full aspect-[3/4] transition-all duration-300 perspective-1000 ${transformOrigin} ${onClick ? 'cursor-pointer' : ''} ${isSelected ? 'z-40 ring-4 ring-yellow-400 rounded-xl shadow-xl' : 'z-10'} ${translateClass} ${small ? 'scale-90' : ''}`}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        <div className={`absolute inset-0 w-full h-full rounded-xl bg-gradient-to-br ${ownerClass} border-4 overflow-hidden backface-hidden shadow-2xl`}>
          <div className="absolute inset-0 bg-slate-900"><img src={resolveImgPath(card.img)} alt={card.name} className="w-full h-full object-cover opacity-80" /></div>
          <div className="absolute top-1 left-1 w-12 h-14 bg-black/70 backdrop-blur-md rounded-lg border border-white/20 z-20 flex flex-col items-center justify-center shadow-xl">
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
            <div className="absolute top-1 right-1 w-7 h-7 bg-black/40 border border-white/20 rounded flex items-center justify-center z-20">
              <span className="text-[12px]">{ELEMENT_ICONS[card.attr]}</span>
            </div>
          )}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/95 pt-8 pb-2 px-2 z-10 text-center">
            <div className="text-[13px] font-black text-white uppercase truncate drop-shadow-md tracking-tight">{card.name}</div>
          </div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-xl bg-slate-800 border-4 border-slate-600 flex items-center justify-center rotate-y-180 backface-hidden text-slate-500 font-black italic text-xl shadow-inner">TT</div>
      </div>
    </div>
  );
}

function Board({ board, onPlace, canPlace, selectedCardAttr, effect }: { board: BoardTile[]; onPlace: (idx: number) => void; canPlace: boolean; selectedCardAttr: string | null; effect: string | null }) {
  return (
    <div className="w-full h-full bg-slate-900/90 p-4 rounded-[2.5rem] border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-3 shadow-2xl relative overflow-visible">
      {board.map((tile, i) => (
        <div key={i} onClick={() => onPlace(i)} className={`relative rounded-2xl border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${tile.card ? 'border-slate-700/30' : !canPlace ? 'border-slate-800 bg-slate-950/50' : !tile.element ? 'border-blue-500/40 bg-blue-500/5 hover:border-blue-400' : tile.element === selectedCardAttr ? 'border-yellow-400 bg-yellow-400/10 animate-pulse hover:border-yellow-300' : 'border-red-900/40 bg-red-950/20 hover:border-red-600'}`}>
          {!tile.card && tile.element && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
               <span className="text-5xl opacity-20">{ELEMENT_ICONS[tile.element]}</span>
               <span className="text-[10px] font-black text-white/10 uppercase mt-1 tracking-widest">{tile.element}</span>
            </div>
          )}
          {tile.card && <div className="w-full h-full p-1 animate-in zoom-in-95 duration-300 z-10"><CardComponent card={tile.card} /></div>}
        </div>
      ))}
      {effect && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
           <div className="animate-effect-text text-8xl font-black italic text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,1)] uppercase tracking-tighter">{effect}!</div>
        </div>
      )}
    </div>
  );
}

function Hand({ hand, score, isTurn, selectedIdx, onSelect, color }: { hand: Card[]; score: number; isTurn: boolean; selectedIdx: number | null; onSelect: (idx: number) => void; color: 'blue' | 'red' }) {
  const isP1 = color === 'blue';
  return (
    <div className="flex flex-col h-full w-64 gap-4 relative shrink-0 overflow-hidden">
      <div className={`p-4 rounded-2xl border-2 shadow-lg flex justify-between items-center z-20 ${isP1 ? 'bg-blue-900/40 border-blue-500/50' : 'bg-red-900/40 border-red-500/50'}`}>
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{isP1 ? 'Player 1' : 'Player 2'}</span>
          <span className={`text-4xl font-black italic leading-none ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>{score}</span>
        </div>
        <div className={`w-3 h-12 rounded-full ${isTurn ? (isP1 ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse') : 'bg-slate-800'}`} />
      </div>
      <div className="flex-1 grid grid-rows-5 gap-1 min-h-0 relative">
        {[...Array(5)].map((_, i) => {
          const card = hand[i];
          return (
            <div key={i} className="w-full h-full relative" style={{ zIndex: selectedIdx === i ? 40 : 10 }}>
              {card ? (
                <CardComponent 
                  card={card} 
                  isSelected={selectedIdx === i} 
                  side={isP1 ? 'left' : 'right'} 
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

function DeckSelect({ onSelect, player, color }: { onSelect: (deck: Card[]) => void; player: string; color: 'blue' | 'red' }) {
  const [options, setOptions] = useState<Card[][]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number>(0);
  useEffect(() => { setOptions(Array.from({ length: 5 }).map(() => generateDeck())); }, []);
  if (options.length === 0) return null;
  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex-1 grid grid-cols-5 gap-4">
        {options.map((deck, idx) => (
          <button key={idx} onMouseEnter={() => setHoveredIdx(idx)} onClick={() => onSelect(deck)} className={`relative flex flex-col items-center justify-center p-6 rounded-3xl border-4 transition-all duration-300 group ${hoveredIdx === idx ? (color === 'blue' ? 'bg-blue-600/10 border-blue-500 scale-[1.02]' : 'bg-red-600/10 border-red-500 scale-[1.02]') : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
            <div className={`text-xs font-black mb-2 ${hoveredIdx === idx ? (color === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-slate-500'}`}>PATTERN 0{idx + 1}</div>
            <div className="text-3xl font-black italic mb-6 text-white uppercase leading-none">SELECT <span className={color === 'blue' ? 'text-blue-500' : 'text-red-500'}>DECK</span></div>
            <div className="space-y-1 w-full text-left opacity-80 group-hover:opacity-100 transition-opacity">
              {deck.map((c, i) => (
                <div key={i} className="flex justify-between text-[10px] font-bold border-b border-slate-800 pb-1 text-slate-300">
                  <span className="text-slate-500 font-mono">Lv.{c.level}</span>
                  <span className="truncate max-w-[100px] uppercase">{c.name}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div className="h-[280px] bg-slate-900/40 border-t-2 border-slate-800 rounded-t-[3rem] p-6 flex justify-center items-end gap-4 overflow-hidden backdrop-blur-sm shrink-0">
          {options[hoveredIdx].map((card, i) => (
            <div key={i} className="w-32 flex flex-col transition-all duration-500 transform hover:-translate-y-4">
              <CardComponent card={{...card, owner: player as any}} small />
              <div className="mt-2 text-center truncate text-[9px] font-black text-white uppercase">{card.name}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function CoinToss({ winner, onComplete }: { winner: string; onComplete: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [showResultText, setShowResultText] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setRotation(360 * 5 + (winner === 'PLAYER 1' ? 0 : 180));
      setTimeout(() => setShowResultText(true), 2500);
      setTimeout(onComplete, 4000);
    }, 100);
    return () => clearTimeout(timer);
  }, [winner, onComplete]);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl z-50 text-center">
      <div className="mb-12 animate-in fade-in"><h2 className="text-5xl font-black italic text-white uppercase mb-2 leading-none">Coin Toss</h2><p className="text-slate-500 font-bold uppercase text-sm tracking-widest leading-none mt-2">Deciding first turn</p></div>
      <div className="relative w-64 h-64 perspective-1000">
        <div className="w-full h-full relative transition-transform duration-[3000ms] ease-in-out transform-style-3d" style={{ transform: `rotateY(${rotation}deg)` }}>
          <div className="absolute inset-0 w-full h-full rounded-full border-[10px] border-blue-400 bg-gradient-to-br from-blue-500 to-blue-800 flex flex-col items-center justify-center shadow-2xl backface-hidden"><span className="text-white font-black text-7xl italic">P1</span></div>
          <div className="absolute inset-0 w-full h-full rounded-full border-[10px] border-red-500 bg-gradient-to-br from-red-600 to-red-900 flex flex-col items-center justify-center shadow-2xl backface-hidden rotate-y-180"><span className="text-white font-black text-7xl italic">P2</span></div>
        </div>
      </div>
      <div className="mt-16 h-12">{showResultText && <div className="animate-in slide-in-from-bottom-4 px-10 py-3 rounded-full border-2 bg-white/10 font-black italic text-3xl text-white uppercase">{winner} START</div>}</div>
    </div>
  );
}

// --- Custom Hook ---

function useGame() {
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
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>({
    elementalEnabled: true, sameEnabled: true, plusEnabled: true, cpuDifficulty: 'MID', pvpMode: false
  });

  const triggerEffect = useCallback((name: string) => {
    setActiveEffect(null);
    setTimeout(() => setActiveEffect(name), 10);
    setTimeout(() => setActiveEffect(null), 1500);
  }, []);

  const resetGame = useCallback(() => {
    setRound(1);
    setMatchResults([]);
    setGameState('TITLE');
  }, []);

  const nextRound = useCallback(() => {
    setRound(r => r + 1);
    setSelectingPlayer('P1');
    setGameState('DECK_SELECT');
  }, []);

  const onTossComplete = useCallback(() => {
    if (!tossWinner) return;
    setTurn(tossWinner);
    setGameState('PLAYING');
  }, [tossWinner]);

  const handleDeckSelect = (deck: Card[]) => {
    if (selectingPlayer === 'P1') {
      setP1Hand(deck.map(c => ({ ...c, owner: 'P1' })));
      if (settings.pvpMode) setSelectingPlayer('P2');
      else { 
        setP2Hand(generateDeck().map(c => ({ ...c, owner: 'P2' })));
        setBoard(initializeBoard());
        const winner = Math.random() > 0.5 ? 'P1' : 'P2';
        setTossWinner(winner);
        setGameState('COIN_TOSS');
      }
    } else {
      setP2Hand(deck.map(c => ({ ...c, owner: 'P2' })));
      setBoard(initializeBoard());
      const winner = Math.random() > 0.5 ? 'P1' : 'P2';
      setTossWinner(winner);
      setGameState('COIN_TOSS');
    }
  };

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
    
    const getNeighbors = (pos: number) => [
      { pos: pos - 3, side: 0, oppSide: 3, active: pos >= 3 },
      { pos: pos - 1, side: 1, oppSide: 2, active: pos % 3 !== 0 },
      { pos: pos + 1, side: 2, oppSide: 1, active: pos % 3 !== 2 },
      { pos: pos + 3, side: 3, oppSide: 0, active: pos < 6 },
    ];

    const specialFlipped = new Set<number>();
    const neighbors = getNeighbors(idx);

    if (settings.sameEnabled) {
      if (neighbors.filter(n => nextBoard[n.pos]?.card && stats[n.side] === (nextBoard[n.pos].card!.modifiedStats || nextBoard[n.pos].card!.stats)[n.oppSide]).length >= 2) {
        triggerEffect("SAME");
        neighbors.forEach(n => { if (nextBoard[n.pos].card && nextBoard[n.pos].card?.owner !== owner) specialFlipped.add(n.pos); });
      }
    }
    if (settings.plusEnabled) {
      const sums: Record<number, number[]> = {};
      neighbors.forEach(n => { if (nextBoard[n.pos]?.card) { const sum = stats[n.side] + (nextBoard[n.pos].card!.modifiedStats || nextBoard[n.pos].card!.stats)[n.oppSide]; (sums[sum] = sums[sum] || []).push(n.pos); }});
      Object.values(sums).forEach(plist => { if (plist.length >= 2) { triggerEffect("PLUS"); plist.forEach(p => { if (nextBoard[p].card && nextBoard[p].card?.owner !== owner) specialFlipped.add(p); }); }});
    }
    neighbors.forEach(n => { if (n.active && !specialFlipped.has(n.pos)) { const target = nextBoard[n.pos].card; if (target && target.owner !== owner && stats[n.side] > (target.modifiedStats || target.stats)[n.oppSide]) nextBoard[n.pos].card = { ...target, owner }; }});
    specialFlipped.forEach(p => { nextBoard[p].card = { ...nextBoard[p].card!, owner }; });

    let comboQueue = Array.from(specialFlipped);
    const processedCombo = new Set<number>();
    let comboTriggered = false;
    while (comboQueue.length > 0) {
      const currentPos = comboQueue.shift()!;
      if (processedCombo.has(currentPos)) continue;
      processedCombo.add(currentPos);
      const curCard = nextBoard[currentPos].card!;
      const curStats = curCard.modifiedStats || curCard.stats;
      getNeighbors(currentPos).forEach(n => {
        if (n.active) {
          const target = nextBoard[n.pos].card;
          if (target && target.owner !== owner && curStats[n.side] > (target.modifiedStats || target.stats)[n.oppSide]) {
            if (!comboTriggered) { triggerEffect("COMBO"); comboTriggered = true; }
            nextBoard[n.pos].card = { ...target, owner };
            comboQueue.push(n.pos);
          }
        }
      });
    }
    setBoard(nextBoard);
    if (owner === 'P1') setP1Hand(prev => prev.filter((_, i) => i !== handIdx));
    else setP2Hand(prev => prev.filter((_, i) => i !== handIdx));
    setSelectedCardIdx(null);
    setTurn(owner === 'P1' ? 'P2' : 'P1');
  }, [board, turn, settings.sameEnabled, settings.plusEnabled, triggerEffect]);

  const scores = useMemo(() => {
    let s1 = p1Hand.length, s2 = p2Hand.length;
    board.forEach(t => { if (t.card?.owner === 'P1') s1++; if (t.card?.owner === 'P2') s2++; });
    return [s1, s2];
  }, [board, p1Hand, p2Hand]);

  return { gameState, setGameState, round, setRound, matchResults, setMatchResults, p1Hand, p2Hand, board, turn, selectedCardIdx, setSelectedCardIdx, tossWinner, selectingPlayer, settings, setSettings, handleDeckSelect, onTossComplete, placeCard, scores, activeEffect, resetGame, nextRound };
}

// --- Main Application ---

export default function App() {
  const g = useGame();

  const difficultyConfig = {
    LOW: { label: 'Easy', color: 'text-emerald-400', border: 'border-emerald-900/50', icon: <CpuIcon size={20} /> },
    MID: { label: 'Normal', color: 'text-blue-400', border: 'border-blue-900/50', icon: <CpuIcon size={20} /> },
    HIGH: { label: 'Hard', color: 'text-red-400', border: 'border-red-900/50', icon: <CpuIcon size={20} /> },
    EXPERT: { label: 'Expert', color: 'text-purple-400', border: 'border-purple-500/50', icon: <Sparkles size={20} /> },
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

  useEffect(() => {
    if (g.gameState === 'PLAYING' && g.board.length > 0 && g.board.every(t => t.card)) {
      const timer = setTimeout(() => {
        const winner = g.scores[0] > g.scores[1] ? 'P1' : g.scores[0] < g.scores[1] ? 'P2' : 'DRAW';
        const newResults = [...g.matchResults, { winner: winner as any, scores: g.scores }];
        g.setMatchResults(newResults);
        if (newResults.length >= 3 || newResults.filter(r => r.winner === 'P1').length >= 2 || newResults.filter(r => r.winner === 'P2').length >= 2) g.setGameState('GAME_OVER');
        else g.setGameState('ROUND_END');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [g.board, g.scores, g.gameState, g.matchResults, g.setMatchResults, g.setGameState]);

  if (g.gameState === 'TITLE') return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden text-center">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full">
        <div className="mb-2 text-blue-500 font-black tracking-[0.8em] uppercase text-sm">Next Gen Card Battle</div>
        <h1 className="text-7xl md:text-9xl font-black italic mb-16 uppercase tracking-tighter drop-shadow-2xl">Triple <span className="text-blue-500">Triad</span></h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full mb-12">
          <div className="space-y-4">
            <h3 className="text-slate-500 font-bold uppercase text-xs border-b border-slate-900 pb-2 flex items-center gap-2"><Users size={14} /> Game Mode</h3>
            <button onClick={() => g.setSettings({ ...g.settings, pvpMode: false })} className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${!g.settings.pvpMode ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-4 text-left leading-none"><User size={20} /><span className="font-black italic text-lg uppercase">VS CPU</span></div>
              {!g.settings.pvpMode && <CheckCircle2 size={20} />}
            </button>
            <button onClick={() => g.setSettings({ ...g.settings, pvpMode: true })} className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${g.settings.pvpMode ? 'bg-purple-600 border-purple-400 shadow-xl' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-4 text-left leading-none"><Users size={20} /><span className="font-black italic text-lg uppercase">LOCAL PVP</span></div>
              {g.settings.pvpMode && <CheckCircle2 size={20} />}
            </button>
          </div>
          <div className="space-y-4 text-left">
            <h3 className="text-slate-500 font-bold uppercase text-xs border-b border-slate-900 pb-2 flex items-center gap-2"><Settings2 size={14} /> Rule Settings</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button onClick={() => g.setSettings({...g.settings, elementalEnabled: !g.settings.elementalEnabled})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${g.settings.elementalEnabled ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-40'}`}><Zap size={18} /><span className="text-[10px] font-black uppercase mt-1">Elem</span></button>
              <button onClick={() => g.setSettings({...g.settings, sameEnabled: !g.settings.sameEnabled})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${g.settings.sameEnabled ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-40'}`}><Layers size={18} /><span className="text-[10px] font-black uppercase mt-1">Same</span></button>
              <button onClick={() => g.setSettings({...g.settings, plusEnabled: !g.settings.plusEnabled})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${g.settings.plusEnabled ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-40'}`}><PlusIcon size={18} /><span className="text-[10px] font-black uppercase mt-1">Plus</span></button>
            </div>
            
            {!g.settings.pvpMode && (
              <button 
                onClick={() => {
                  const lvls: GameSettings['cpuDifficulty'][] = ['LOW', 'MID', 'HIGH', 'EXPERT'];
                  g.setSettings({...g.settings, cpuDifficulty: lvls[(lvls.indexOf(g.settings.cpuDifficulty) + 1) % 4]});
                }} 
                className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 bg-slate-900/50 hover:bg-slate-800/80 ${difficultyConfig[g.settings.cpuDifficulty].border}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 ${difficultyConfig[g.settings.cpuDifficulty].color}`}>
                    {difficultyConfig[g.settings.cpuDifficulty].icon}
                  </div>
                  <div>
                    <div className={`font-black italic text-base uppercase ${difficultyConfig[g.settings.cpuDifficulty].color}`}>CPU: {difficultyConfig[g.settings.cpuDifficulty].label}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Intelligence Level</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            )}
          </div>
        </div>
        <button onClick={() => g.setGameState('DECK_SELECT')} className="px-24 py-8 bg-white text-slate-950 rounded-full font-black text-3xl italic uppercase hover:scale-110 transition-all active:scale-95 shadow-[0_0_60px_rgba(255,255,255,0.3)]">Start Battle</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col p-6 font-sans overflow-hidden">
      <header className="flex justify-between items-center mb-6 border-b border-slate-900 pb-4 shrink-0 z-50">
        <h1 className="text-3xl font-black italic uppercase flex gap-4 items-center tracking-tighter"><Swords className="text-blue-500" size={32} /> Triple Triad</h1>
        <div className="flex gap-12 items-center text-4xl md:text-5xl font-black italic tracking-tighter leading-none text-right">
          <div className="text-blue-500">{g.scores[0]}</div><div className="text-slate-800">/</div><div className="text-red-500">{g.scores[1]}</div>
        </div>
      </header>

      <main className="flex-1 relative flex justify-center items-center gap-8 min-h-0">
        {g.gameState === 'DECK_SELECT' ? (
          <div className="w-full h-full flex flex-col items-center">
             <div className="mb-6 text-center">
                <h2 className="text-4xl font-black italic uppercase mb-2 leading-none text-white">Deck Selection</h2>
                <div className={`px-10 py-1.5 rounded-full inline-block font-black uppercase text-xs tracking-widest shadow-xl ${g.selectingPlayer === 'P1' ? 'bg-blue-600' : 'bg-red-600'}`}>
                   {g.selectingPlayer === 'P1' ? 'PLAYER 1' : 'PLAYER 2'} CHOICE
                </div>
             </div>
             <div className="flex-1 w-full max-w-7xl min-h-0"><DeckSelect onSelect={g.handleDeckSelect} player={g.selectingPlayer} color={g.selectingPlayer === 'P1' ? 'blue' : 'red'} /></div>
          </div>
        ) : g.gameState === 'COIN_TOSS' ? (
          <CoinToss winner={g.tossWinner === 'P1' ? 'PLAYER 1' : (g.settings.pvpMode ? 'PLAYER 2' : 'CPU')} onComplete={g.onTossComplete} />
        ) : (
          <div className="flex flex-row items-center justify-center gap-12 w-full h-full max-w-7xl mx-auto overflow-hidden">
            <Hand hand={g.p1Hand} score={g.scores[0]} isTurn={g.turn === 'P1'} color="blue" selectedIdx={g.turn === 'P1' ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} />
            <div className="flex-1 max-w-2xl flex flex-col items-center justify-center h-full min-h-0 relative">
              <div className={`px-12 py-3 rounded-full mb-8 font-black uppercase text-xl shadow-2xl transition-all duration-500 border-2 z-50 ${g.turn === 'P1' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-red-600/20 border-red-500 text-red-400'}`}>
                {g.turn === 'P1' ? "Player 1 Turn" : (g.settings.pvpMode ? "Player 2 Turn" : "CPU Thinking...")}
              </div>
              <div className="w-full aspect-square max-w-[550px] relative">
                <Board 
                  board={g.board} 
                  onPlace={(idx: number) => g.selectedCardIdx !== null && g.placeCard(idx, g.turn === 'P1' ? g.p1Hand : g.p2Hand, g.selectedCardIdx, g.turn)} 
                  canPlace={g.selectedCardIdx !== null && (g.settings.pvpMode || g.turn === 'P1')} 
                  selectedCardAttr={g.selectedCardIdx !== null ? (g.turn === 'P1' ? g.p1Hand[g.selectedCardIdx].attr : g.p2Hand[g.selectedCardIdx].attr) : null}
                  effect={g.activeEffect}
                />
              </div>
            </div>
            <Hand hand={g.p2Hand} score={g.scores[1]} isTurn={g.turn === 'P2'} color="red" selectedIdx={g.turn === 'P2' && g.settings.pvpMode ? g.selectedCardIdx : null} onSelect={g.setSelectedCardIdx} />
          </div>
        )}
      </main>

      {['ROUND_END', 'GAME_OVER'].includes(g.gameState) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-[200] p-12 overflow-hidden">
          <div className="bg-slate-900 border-4 border-slate-800 p-16 rounded-[4rem] text-center max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
            <h2 className="text-6xl font-black italic uppercase mb-8 tracking-tighter text-white">
              {g.matchResults[g.matchResults.length-1]?.winner === 'P1' ? 'PLAYER 1' : g.matchResults[g.matchResults.length-1]?.winner === 'P2' ? 'PLAYER 2' : 'DRAW'}
              <div className="text-2xl mt-2 text-slate-500 tracking-widest font-black uppercase">{g.gameState === 'GAME_OVER' ? 'Series Champion' : 'Match Victory'}</div>
            </h2>
            <div className="flex gap-4">
              {g.gameState === 'GAME_OVER' ? <button onClick={g.resetGame} className="flex-1 py-6 bg-white text-slate-950 rounded-full font-black text-2xl uppercase italic hover:scale-105 transition-all active:scale-95 shadow-xl leading-none">Title</button> : <button onClick={g.nextRound} className="flex-1 py-6 bg-white text-slate-950 rounded-full font-black text-2xl uppercase italic hover:scale-105 transition-all active:scale-95 shadow-xl leading-none">Next Match</button>}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000{perspective:1000px} .transform-style-3d{transform-style:preserve-3d} .backface-hidden{backface-visibility:hidden} .rotate-y-180{transform:rotateY(180deg)}
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-in { animation: fade-in 0.5s ease-out forwards; }
        @keyframes effect-text { 0% { transform: scale(0.3) rotate(-10deg); opacity: 0; } 20% { transform: scale(1.2) rotate(5deg); opacity: 1; } 100% { transform: scale(1.5) translateY(-100px); opacity: 0; } }
        .animate-effect-text { animation: effect-text 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}
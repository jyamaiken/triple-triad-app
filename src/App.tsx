import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Trophy, CheckCircle2, XCircle, 
  Settings2, Play, Users, Cpu as CpuIcon, Zap, User, 
  ChevronRight, Layers, Plus as PlusIcon, Sparkles 
} from 'lucide-react';

// カードデータを外部ファイルからインポート
import CARD_DATA_RAW from './data/cards.json';

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

const CARD_DATA = CARD_DATA_RAW as Card[];

// --- Helper Functions ---

function resolveImgPath(path: string) {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  // Viteの型エラー回避のためのキャスト
  const env = (import.meta as any).env;
  const baseUrl = (env?.BASE_URL || '/').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function generateDeck(): Card[] {
  const pool = [...CARD_DATA].sort(() => Math.random() - 0.5);
  return pool.slice(0, 5).map(c => ({ ...c }));
}

function calculateStats(card: Card, element: string | null): number[] {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
}

// シンプルなCPU思考ロジック
function getBestMove(board: BoardTile[], hand: Card[], settings: GameSettings): { boardIdx: number; handIdx: number } {
  const emptyCells = board.map((t, i) => t.card === null ? i : null).filter((i): i is number => i !== null);
  if (emptyCells.length === 0) return { boardIdx: 0, handIdx: 0 };
  
  // 難易度調整の簡易版
  const moves = emptyCells.flatMap(bIdx => hand.map((card, hIdx) => {
    const stats = calculateStats(card, board[bIdx].element);
    let score = 0;
    // 隅っこボーナス
    if ([0, 2, 6, 8].includes(bIdx)) score += 5;
    return { bIdx, hIdx, score };
  }));
  moves.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return { boardIdx: moves[0].bIdx, handIdx: moves[0].hIdx };
}

// --- Components ---

function CardComponent({ card, isSelected, onClick, side = 'left', isMobile }: { card: Card | null; isSelected?: boolean; onClick?: () => void; side?: 'left' | 'right'; isMobile: boolean }) {
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
      <div className="w-4 h-4 lg:w-8 lg:h-8 rounded-full border-4 border-slate-700/10 opacity-20" />
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

  const ownerClass = displayOwner === 'P1' ? 'from-blue-600 to-blue-900 border-blue-400 shadow-blue-500/20' : 'from-red-600 to-red-900 border-red-400 shadow-red-500/20';
  const transformOrigin = isMobile ? 'origin-bottom' : (side === 'left' ? 'origin-right' : 'origin-left');
  const translateClass = isSelected 
    ? (isMobile ? '-translate-y-8 scale-110 ring-4 ring-yellow-400' : (side === 'left' ? '-translate-x-12 scale-95' : 'translate-x-12 scale-95')) 
    : '';

  return (
    <div onClick={onClick} className={`relative w-full aspect-[3/4] transition-all duration-300 perspective-1000 ${transformOrigin} ${onClick ? 'cursor-pointer' : ''} ${isSelected ? 'z-50' : 'z-10'} ${translateClass}`}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        <div className={`absolute inset-0 w-full h-full rounded-lg lg:rounded-xl bg-gradient-to-br ${ownerClass} border-2 lg:border-4 overflow-hidden backface-hidden shadow-xl`}>
          <div className="absolute inset-0 bg-slate-900"><img src={resolveImgPath(card.img)} alt={card.name} className="w-full h-full object-cover opacity-80 pointer-events-none" /></div>
          
          <div className="absolute top-0.5 left-0.5 w-8 h-10 lg:w-12 lg:h-14 bg-black/70 backdrop-blur-md rounded border border-white/20 z-20 flex flex-col items-center justify-center shadow-xl scale-[0.75] lg:scale-100 origin-top-left">
            <div className="relative w-full h-full flex flex-col items-center justify-center font-black italic text-white text-[10px] lg:text-sm leading-none">
              <div className={getStatColor(0)}>{displayStat(stats[0])}</div>
              <div className="flex w-full justify-between px-1">
                 <span className={getStatColor(1)}>{displayStat(stats[1])}</span>
                 <span className={getStatColor(2)}>{displayStat(stats[2])}</span>
              </div>
              <div className={getStatColor(3)}>{displayStat(stats[3])}</div>
            </div>
          </div>

          {card.attr && (
            <div className="absolute top-0.5 right-0.5 w-5 h-5 lg:w-7 lg:h-7 bg-black/40 border border-white/20 rounded flex items-center justify-center z-20 scale-75 lg:scale-100">
              <span className="text-[10px] lg:text-xs">{ELEMENT_ICONS[card.attr]}</span>
            </div>
          )}

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/95 pt-4 pb-1 px-1 z-10 text-center">
            <div className="text-[8px] lg:text-[11px] font-black text-white uppercase truncate tracking-tight">{card.name}</div>
          </div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-lg lg:rounded-xl bg-slate-800 border-2 lg:border-4 border-slate-600 flex items-center justify-center rotate-y-180 backface-hidden text-slate-500 font-black italic text-sm lg:text-xl">TT</div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [p1Hand, setP1Hand] = useState<Card[]>([]);
  const [p2Hand, setP2Hand] = useState<Card[]>([]);
  const [board, setBoard] = useState<BoardTile[]>([]);
  const [turn, setTurn] = useState<PlayerType>('P1');
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [selectingPlayer, setSelectingPlayer] = useState<PlayerType>('P1');
  const [tossWinner, setTossWinner] = useState<PlayerType | null>(null);
  const [settings, setSettings] = useState<GameSettings>({
    elementalEnabled: true, sameEnabled: true, plusEnabled: true, cpuDifficulty: 'MID', pvpMode: false
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scores = useMemo(() => {
    let s1 = p1Hand.length, s2 = p2Hand.length;
    board.forEach(t => {
      if (t.card?.owner === 'P1') s1++;
      if (t.card?.owner === 'P2') s2++;
    });
    return [s1, s2];
  }, [board, p1Hand, p2Hand]);

  const placeCard = useCallback((idx: number) => {
    if (selectedCardIdx === null || board[idx].card) return;
    const currentHand = turn === 'P1' ? p1Hand : p2Hand;
    const card = currentHand[selectedCardIdx];
    
    const newBoard = [...board];
    newBoard[idx] = { 
      ...newBoard[idx], 
      card: { ...card, owner: turn, modifiedStats: calculateStats(card, board[idx].element) } 
    };
    
    setBoard(newBoard);
    if (turn === 'P1') setP1Hand(prev => prev.filter((_, i) => i !== selectedCardIdx));
    else setP2Hand(prev => prev.filter((_, i) => i !== selectedCardIdx));
    
    setSelectedCardIdx(null);
    setTurn(turn === 'P1' ? 'P2' : 'P1');
  }, [board, turn, selectedCardIdx, p1Hand, p2Hand]);

  // CPU思考の実行
  useEffect(() => {
    if (!settings.pvpMode && gameState === 'PLAYING' && turn === 'P2' && p2Hand.length > 0) {
      const timer = setTimeout(() => {
        const { boardIdx, handIdx } = getBestMove(board, p2Hand, settings);
        // 手動でplaceCardと同じ処理を実行
        const card = p2Hand[handIdx];
        const newBoard = [...board];
        newBoard[boardIdx] = { 
          ...newBoard[boardIdx], 
          card: { ...card, owner: 'P2', modifiedStats: calculateStats(card, board[boardIdx].element) } 
        };
        setBoard(newBoard);
        setP2Hand(prev => prev.filter((_, i) => i !== handIdx));
        setTurn('P1');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, gameState, p2Hand, settings, board]);

  const startToss = () => {
    setBoard(Array(9).fill(null).map(() => ({ 
      card: null, 
      element: settings.elementalEnabled && Math.random() > 0.7 ? ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)] : null 
    })));
    const winner = Math.random() > 0.5 ? 'P1' : 'P2';
    setTossWinner(winner);
    setGameState('COIN_TOSS');
    setTimeout(() => {
      setTurn(winner);
      setGameState('PLAYING');
    }, 3000);
  };

  const difficultyConfig = {
    LOW: { label: 'EASY', color: 'text-emerald-400' },
    MID: { label: 'NORMAL', color: 'text-blue-400' },
    HIGH: { label: 'HARD', color: 'text-red-400' },
    EXPERT: { label: 'EXPERT', color: 'text-purple-400' },
  };

  if (gameState === 'TITLE') return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="max-w-4xl w-full py-10">
        <div className="mb-2 text-blue-500 font-black tracking-[0.4em] uppercase text-[10px] lg:text-sm">Card Battle Arena</div>
        <h1 className="text-6xl lg:text-9xl font-black italic mb-12 lg:mb-20 uppercase tracking-tighter drop-shadow-2xl">Triple <span className="text-blue-500">Triad</span></h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mb-12">
          {/* モード選択 */}
          <div className="space-y-4">
            <h3 className="text-slate-500 font-bold uppercase text-[10px] border-b border-slate-900 pb-2 flex items-center gap-2"><Users size={14} /> Game Mode</h3>
            <button onClick={() => setSettings({ ...settings, pvpMode: false })} className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition-all ${!settings.pvpMode ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-3 font-black italic uppercase">Vs CPU</div>
              {!settings.pvpMode && <CheckCircle2 size={18} />}
            </button>
            <button onClick={() => setSettings({ ...settings, pvpMode: true })} className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition-all ${settings.pvpMode ? 'bg-purple-600 border-purple-400' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <div className="flex items-center gap-3 font-black italic uppercase">Local PvP</div>
              {settings.pvpMode && <CheckCircle2 size={18} />}
            </button>
          </div>

          {/* ルール設定 */}
          <div className="space-y-4">
            <h3 className="text-slate-500 font-bold uppercase text-[10px] border-b border-slate-900 pb-2 flex items-center gap-2"><Settings2 size={14} /> Rules & CPU</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSettings({...settings, elementalEnabled: !settings.elementalEnabled})} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${settings.elementalEnabled ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 opacity-40'}`}><Zap size={16} /><span className="text-[8px] font-black uppercase">Elem</span></button>
              <button onClick={() => setSettings({...settings, sameEnabled: !settings.sameEnabled})} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${settings.sameEnabled ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 opacity-40'}`}><Layers size={16} /><span className="text-[8px] font-black uppercase">Same</span></button>
              <button onClick={() => setSettings({...settings, plusEnabled: !settings.plusEnabled})} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${settings.plusEnabled ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 opacity-40'}`}><PlusIcon size={16} /><span className="text-[8px] font-black uppercase">Plus</span></button>
            </div>
            {!settings.pvpMode && (
               <button 
                onClick={() => {
                  const lvls: GameSettings['cpuDifficulty'][] = ['LOW', 'MID', 'HIGH', 'EXPERT'];
                  setSettings({...settings, cpuDifficulty: lvls[(lvls.indexOf(settings.cpuDifficulty) + 1) % 4]});
                }} 
                className="w-full p-3 rounded-xl border-2 border-slate-800 bg-slate-900 flex items-center justify-between"
               >
                 <span className="text-xs font-black uppercase">CPU: <span className={difficultyConfig[settings.cpuDifficulty].color}>{difficultyConfig[settings.cpuDifficulty].label}</span></span>
                 <ChevronRight size={14} />
               </button>
            )}
          </div>
        </div>

        <button onClick={() => {
          setSelectingPlayer('P1');
          setGameState('DECK_SELECT');
        }} className="px-12 py-6 bg-white text-slate-950 rounded-full font-black text-2xl uppercase italic hover:scale-110 transition-all active:scale-95 shadow-xl">Start Battle</button>
      </div>
    </div>
  );

  if (gameState === 'DECK_SELECT') return (
    <div className="fixed inset-0 bg-slate-950 text-white p-4 flex flex-col items-center justify-center overflow-y-auto">
      <h2 className="text-3xl font-black italic mb-2 uppercase">Select Your Deck</h2>
      <div className={`px-4 py-1 rounded-full mb-8 font-black text-xs uppercase ${selectingPlayer === 'P1' ? 'bg-blue-600' : 'bg-red-600'}`}>
        {selectingPlayer === 'P1' ? 'Player 1' : 'Player 2'} Turn
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full max-w-7xl">
        {[...Array(5)].map((_, i) => (
          <button key={i} onClick={() => {
            const deck = generateDeck();
            if (selectingPlayer === 'P1') {
              setP1Hand(deck.map(c => ({...c, owner: 'P1'})));
              if (settings.pvpMode) setSelectingPlayer('P2');
              else {
                setP2Hand(generateDeck().map(c => ({...c, owner: 'P2'})));
                startToss();
              }
            } else {
              setP2Hand(deck.map(c => ({...c, owner: 'P2'})));
              startToss();
            }
          }} className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-900 hover:border-blue-500 transition-all flex flex-col items-center">
            <span className="text-slate-500 font-mono text-[10px] mb-2 uppercase tracking-widest">Pattern 0{i+1}</span>
            <div className="text-xl font-black italic text-white uppercase mb-4">Random 5</div>
            <div className="w-full space-y-1">
               {[...Array(5)].map((_, j) => <div key={j} className="h-1 bg-slate-800 rounded-full" />)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  if (gameState === 'COIN_TOSS') return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center">
       <div className="text-4xl font-black italic text-white uppercase mb-12 animate-pulse">Coin Toss...</div>
       <div className={`w-40 h-40 rounded-full border-8 animate-spin ${tossWinner === 'P1' ? 'border-blue-500' : 'border-red-500'} flex items-center justify-center`}>
          <span className="text-4xl font-black text-white">{tossWinner}</span>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col p-2 lg:p-4 font-sans overflow-hidden">
      <header className="flex justify-between items-center mb-2 border-b border-slate-900 pb-2 shrink-0">
        <h1 className="text-xl font-black italic uppercase flex gap-2 items-center tracking-tighter"><Swords className="text-blue-500" size={20} /> Triple Triad</h1>
        <div className="text-2xl font-black italic">
          <span className="text-blue-500">{scores[0]}</span><span className="text-slate-700 px-2">/</span><span className="text-red-500">{scores[1]}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-4 w-full h-full max-w-7xl mx-auto overflow-hidden">
        {/* 相手手札 (上 / 右) */}
        <div className="w-full lg:w-48 h-20 lg:h-full lg:order-3 flex flex-row lg:flex-col gap-1">
          {p2Hand.map((c, i) => (
            <div key={i} className="flex-1 h-full lg:h-[18%]" onClick={() => settings.pvpMode && turn === 'P2' && setSelectedCardIdx(i)}>
              <CardComponent card={c} side="right" isMobile={isMobile} isSelected={settings.pvpMode && turn === 'P2' && selectedCardIdx === i} />
            </div>
          ))}
          {[...Array(5 - p2Hand.length)].map((_, i) => <div key={i} className="flex-1 lg:h-[18%] opacity-20"><CardComponent card={null} isMobile={isMobile} /></div>)}
        </div>

        {/* 盤面 (中央) */}
        <div className="flex-1 w-full max-w-[500px] flex flex-col items-center justify-center min-h-0 relative lg:order-2">
          <div className={`px-6 py-1 rounded-full mb-3 font-black uppercase text-[10px] border-2 ${turn === 'P1' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-red-500 text-red-400 bg-red-500/10'}`}>
            {turn === 'P1' ? 'Player 1 Turn' : (settings.pvpMode ? 'Player 2 Turn' : 'CPU Thinking...')}
          </div>
          <div className="w-full aspect-square bg-slate-900/90 p-2 rounded-3xl border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-1.5 shadow-2xl">
            {board.map((tile, i) => (
              <div key={i} onClick={() => placeCard(i)} className={`relative rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${tile.card ? 'border-slate-700/30' : 'border-slate-800 bg-slate-950/50 hover:border-blue-500/50'}`}>
                {tile.element && !tile.card && (
                  <span className="text-2xl lg:text-4xl opacity-20 pointer-events-none">{ELEMENT_ICONS[tile.element]}</span>
                )}
                {tile.card && <div className="p-0.5 w-full h-full"><CardComponent card={tile.card} isMobile={isMobile} /></div>}
              </div>
            ))}
          </div>
        </div>

        {/* 自分手札 (下 / 左) */}
        <div className="w-full lg:w-48 h-20 lg:h-full lg:order-1 flex flex-row lg:flex-col gap-1">
          {p1Hand.map((c, i) => (
            <div key={i} className="flex-1 h-full lg:h-[18%]" onClick={() => turn === 'P1' && setSelectedCardIdx(i)}>
              <CardComponent card={c} isSelected={turn === 'P1' && selectedCardIdx === i} side="left" isMobile={isMobile} />
            </div>
          ))}
          {[...Array(5 - p1Hand.length)].map((_, i) => <div key={i} className="flex-1 lg:h-[18%] opacity-20"><CardComponent card={null} isMobile={isMobile} /></div>)}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000{perspective:1000px} .transform-style-3d{transform-style:preserve-3d} .backface-hidden{backface-visibility:hidden} .rotate-y-180{transform:rotateY(180deg)}
      `}} />
    </div>
  );
}

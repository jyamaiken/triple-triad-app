import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Swords, Trophy, CheckCircle2, XCircle, 
  Settings2, Play, Users, Cpu as CpuIcon, Zap, User, 
  ChevronRight, Layers, Plus as PlusIcon, Sparkles 
} from 'lucide-react';

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

// 組み込みカードデータ (外部JSON読み込みエラー回避のため統合)
const CARD_DATA: Card[] = [
  {"id": 1, "level": 1, "name": "ハウリザード", "stats": [1, 5, 4, 1], "attr": null, "img": "images/cards/1.png"},
  {"id": 2, "level": 1, "name": "フンゴオン", "stats": [5, 1, 1, 1], "attr": null, "img": "images/cards/2.png"},
  {"id": 85, "level": 8, "name": "イフリート", "stats": [9, 6, 2, 8], "attr": "火", "img": "images/cards/85.png"},
  {"id": 110, "level": 10, "name": "スコール", "stats": [10, 4, 6, 10], "attr": null, "img": "images/cards/110.png"},
  // ... (実際には全カードデータが含まれる想定)
];

// --- Helper Functions ---

/**
 * TypeScriptの ImportMeta エラーを回避するためのキャスト
 */
function resolveImgPath(path: string) {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  
  // import.meta.env を (import.meta as any).env にキャストして TS2339 エラーを回避
  const baseUrl = ((import.meta as any).env?.BASE_URL || '/').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function generateDeck(excludeIds?: Set<number>): Card[] {
  // 簡易的なデッキ生成ロジック
  const pool = excludeIds ? CARD_DATA.filter(c => !excludeIds.has(c.id)) : CARD_DATA;
  const sortedPool = [...pool].sort(() => Math.random() - 0.5);
  return sortedPool.slice(0, 5).map(c => ({ ...c }));
}

function calculateStats(card: Card, element: string | null): number[] {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
}

// --- Components ---

function CardComponent({ card, isSelected, isHovered, onClick, small, side = 'left', isMobile }: { card: Card | null; isSelected?: boolean; isHovered?: boolean; onClick?: () => void; small?: boolean; side?: 'left' | 'right'; isMobile: boolean }) {
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
  const transformOrigin = isMobile ? 'origin-bottom' : (side === 'left' ? 'origin-right' : 'origin-left');
  
  // モバイルでは上にせり出し、PCでは横にスライド
  let translateClass = isSelected 
    ? (isMobile ? '-translate-y-8 scale-110 ring-4 ring-yellow-400' : (side === 'left' ? '-translate-x-12 scale-95' : 'translate-x-12 scale-95')) 
    : (isHovered ? 'scale-105' : '');

  return (
    <div onClick={onClick} className={`relative w-full h-full transition-all duration-300 perspective-1000 ${transformOrigin} ${onClick ? 'cursor-pointer' : ''} ${isSelected ? 'z-50' : 'z-10'} ${translateClass} ${small ? 'scale-90' : ''}`}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
        <div className={`absolute inset-0 w-full h-full rounded-lg bg-gradient-to-br ${ownerClass} border-2 overflow-hidden backface-hidden shadow-xl`}>
          <div className="absolute inset-0 bg-slate-900"><img src={resolveImgPath(card.img)} alt={card.name} className="w-full h-full object-cover opacity-80 pointer-events-none" /></div>
          
          <div className="absolute top-0.5 left-0.5 w-8 h-10 sm:w-10 sm:h-12 bg-black/70 backdrop-blur-md rounded border border-white/20 z-20 flex flex-col items-center justify-center scale-[0.8] sm:scale-100 origin-top-left">
            <div className="relative w-full h-full flex flex-col items-center justify-center font-black italic text-white text-[10px] sm:text-xs leading-none">
              <div className={getStatColor(0)}>{displayStat(stats[0])}</div>
              <div className="flex w-full justify-between px-1">
                 <span className={getStatColor(1)}>{displayStat(stats[1])}</span>
                 <span className={getStatColor(2)}>{displayStat(stats[2])}</span>
              </div>
              <div className={getStatColor(3)}>{displayStat(stats[3])}</div>
            </div>
          </div>

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/95 pt-4 pb-1 px-1 z-10 text-center">
            <div className="text-[8px] sm:text-[10px] font-black text-white uppercase truncate tracking-tight">{card.name}</div>
          </div>
        </div>
        <div className="absolute inset-0 w-full h-full rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center rotate-y-180 backface-hidden text-slate-500 font-black italic text-sm">TT</div>
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
    newBoard[idx] = { ...newBoard[idx], card: { ...card, owner: turn, modifiedStats: calculateStats(card, board[idx].element) } };
    
    // (ここに詳細なルールロジック SAME/PLUS/COMBO を実装可能)
    
    setBoard(newBoard);
    if (turn === 'P1') setP1Hand(prev => prev.filter((_, i) => i !== selectedCardIdx));
    else setP2Hand(prev => prev.filter((_, i) => i !== selectedCardIdx));
    
    setSelectedCardIdx(null);
    setTurn(turn === 'P1' ? 'P2' : 'P1');
  }, [board, turn, selectedCardIdx, p1Hand, p2Hand]);

  if (gameState === 'TITLE') return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl sm:text-8xl font-black italic mb-12 uppercase tracking-tighter">Triple <span className="text-blue-500">Triad</span></h1>
      <button onClick={() => {
        setBoard(Array(9).fill(null).map(() => ({ card: null, element: null })));
        setP1Hand(generateDeck());
        setP2Hand(generateDeck());
        setGameState('PLAYING');
      }} className="px-12 py-6 bg-white text-slate-950 rounded-full font-black text-2xl uppercase italic hover:scale-105 transition-all active:scale-95 shadow-xl">Start Game</button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col p-2 sm:p-4 font-sans overflow-hidden">
      <header className="flex justify-between items-center mb-2 border-b border-slate-900 pb-2 shrink-0">
        <h1 className="text-xl font-black italic uppercase flex gap-2 items-center"><Swords className="text-blue-500" size={20} /> Triple Triad</h1>
        <div className="text-2xl font-black italic text-blue-500">{scores[0]} <span className="text-slate-700">/</span> <span className="text-red-500">{scores[1]}</span></div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-4 w-full h-full max-w-7xl mx-auto overflow-hidden">
        {/* Player 2 Hand (Mobile Top) */}
        <div className="w-full lg:w-48 h-24 lg:h-full lg:order-3 flex flex-row lg:flex-col gap-1">
          {p2Hand.map((c, i) => (
            <div key={i} className="flex-1 h-full lg:h-[18%]"><CardComponent card={c} side="right" isMobile={isMobile} /></div>
          ))}
        </div>

        {/* Board (Center) */}
        <div className="flex-1 w-full max-w-[500px] aspect-square bg-slate-900/90 p-2 rounded-3xl border-4 border-slate-800 grid grid-cols-3 grid-rows-3 gap-2 lg:order-2">
          {board.map((tile, i) => (
            <div key={i} onClick={() => placeCard(i)} className={`relative rounded-xl border-2 transition-all flex items-center justify-center ${tile.card ? 'border-slate-700' : 'border-slate-800 bg-slate-950/50 hover:border-blue-500/50'}`}>
              {tile.card && <CardComponent card={tile.card} isMobile={isMobile} />}
            </div>
          ))}
        </div>

        {/* Player 1 Hand (Mobile Bottom) */}
        <div className="w-full lg:w-48 h-24 lg:h-full lg:order-1 flex flex-row lg:flex-col gap-1">
          {p1Hand.map((c, i) => (
            <div key={i} className="flex-1 h-full lg:h-[18%]" onClick={() => turn === 'P1' && setSelectedCardIdx(i)}>
              <CardComponent card={c} isSelected={selectedCardIdx === i} side="left" isMobile={isMobile} />
            </div>
          ))}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000{perspective:1000px} .transform-style-3d{transform-style:preserve-3d} .backface-hidden{backface-visibility:hidden} .rotate-y-180{transform:rotateY(180deg)}
      `}} />
    </div>
  );
}

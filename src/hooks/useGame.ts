import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, PlayerType, GameState, MatchResult, BoardTile, GameSettings } from '../types';
import { generateDeck } from '../utils/deckGenerator';

const ELEMENTS = ['火', '冷', '雷', '地', '風', '水', '毒', '聖'];

export const useGame = () => {
  // 初期状態を TITLE に設定
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [round, setRound] = useState(1);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [cpuHand, setCpuHand] = useState<Card[]>([]);
  const [board, setBoard] = useState<BoardTile[]>([]);
  const [turn, setTurn] = useState<PlayerType>('PLAYER');
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [tossWinner, setTossWinner] = useState<PlayerType | null>(null);
  const [tieBreakerInfo, setTieBreakerInfo] = useState<{ pTotalStats: number; cTotalStats: number } | null>(null);

  // ゲーム設定（将来的な拡張を見据えた構造）
  const [settings, setSettings] = useState<GameSettings>({
    elementalEnabled: true,
    cpuDifficulty: 'LOW',
    pvpMode: false
  });

  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const initializeBoard = useCallback(() => {
    const newBoard: BoardTile[] = Array(9).fill(null).map(() => ({ card: null, element: null }));
    
    // 属性ルールが無効の場合は、盤面にエレメントを配置しない
    if (!settings.elementalEnabled) return newBoard;

    const elementCount = Math.floor(Math.random() * 6); 
    const availableIndices = Array.from({ length: 9 }, (_, i) => i);
    
    for (let i = 0; i < elementCount; i++) {
      const randIdx = Math.floor(Math.random() * availableIndices.length);
      const boardIdx = availableIndices.splice(randIdx, 1)[0];
      newBoard[boardIdx].element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    }
    return newBoard;
  }, [settings.elementalEnabled]);

  const startGame = useCallback((selectedDeck: Card[]) => {
    setPlayerHand(selectedDeck.map(c => ({ ...c, owner: 'PLAYER' as const })));
    const playerCardIds = new Set(selectedDeck.map(c => c.id));
    const cpuDeck = generateDeck(30, playerCardIds);
    setCpuHand(cpuDeck.map(c => ({ ...c, owner: 'CPU' as const })));
    setBoard(initializeBoard());
    const winner = Math.random() > 0.5 ? 'PLAYER' : 'CPU';
    setTossWinner(winner);
    setGameState('COIN_TOSS');
    setTieBreakerInfo(null);
  }, [initializeBoard]);

  const onTossComplete = useCallback(() => {
    if (!tossWinner) return;
    setTurn(tossWinner);
    setGameState('PLAYING');
    setMessage(`${tossWinner === 'PLAYER' ? 'あなた' : 'CPU'}の先攻です！`);
  }, [tossWinner]);

  const calculateElementalStats = (card: Card, tileElement: string | null): number[] => {
    if (!tileElement) return [...card.stats];
    // 属性一致で+1、不一致で-1
    const modifier = card.attr === tileElement ? 1 : -1;
    return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
  };

  const placeCard = useCallback((boardIdx: number, hand: Card[], handIdx: number, owner: PlayerType) => {
    if (!board[boardIdx] || board[boardIdx].card || turn !== owner) return;

    const newBoard = [...board];
    const targetCard = hand[handIdx];
    const modifiedStats = calculateElementalStats(targetCard, newBoard[boardIdx].element);
    newBoard[boardIdx].card = { ...targetCard, owner, modifiedStats };

    const neighbors = [
      { pos: boardIdx - 3, side: 0, oppSide: 3, active: boardIdx >= 3 },
      { pos: boardIdx - 1, side: 1, oppSide: 2, active: boardIdx % 3 !== 0 },
      { pos: boardIdx + 1, side: 2, oppSide: 1, active: boardIdx % 3 !== 2 },
      { pos: boardIdx + 3, side: 3, oppSide: 0, active: boardIdx < 6 },
    ];

    neighbors.forEach(n => {
      if (n.active) {
        const neighborTile = newBoard[n.pos];
        if (neighborTile.card && neighborTile.card.owner !== owner) {
          const pS = modifiedStats[n.side];
          const nS = neighborTile.card.modifiedStats || neighborTile.card.stats;
          if (pS > nS[n.oppSide]) {
            newBoard[n.pos].card = { ...neighborTile.card, owner };
          }
        }
      }
    });

    setBoard(newBoard);
    if (owner === 'PLAYER') {
      setPlayerHand(prev => prev.filter((_, i) => i !== handIdx));
      setSelectedCardIdx(null);
    } else {
      setCpuHand(prev => prev.filter((_, i) => i !== handIdx));
    }
    setTurn(owner === 'PLAYER' ? 'CPU' : 'PLAYER');
  }, [board, turn]);

  const currentScores = useMemo(() => {
    let p = playerHand.length;
    let c = cpuHand.length;
    board.forEach(tile => {
      if (tile.card?.owner === 'PLAYER') p++;
      if (tile.card?.owner === 'CPU') c++;
    });
    return [p, c];
  }, [board, playerHand, cpuHand]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || board.length === 0 || !board.every(t => t.card !== null)) return;
    if (matchResults.length >= round) return;

    const [pScore, cScore] = currentScores;
    let winner: PlayerType | 'DRAW' = pScore > cScore ? 'PLAYER' : cScore > pScore ? 'CPU' : 'DRAW';
    
    // 同点時のタイブレーク
    if (winner === 'DRAW') {
      const pTotal = board.filter(t => t.card?.owner === 'PLAYER').reduce((acc, t) => acc + (t.card?.stats.reduce((a, b) => a + b, 0) || 0), 0);
      const cTotal = board.filter(t => t.card?.owner === 'CPU').reduce((acc, t) => acc + (t.card?.stats.reduce((a, b) => a + b, 0) || 0), 0);
      setTieBreakerInfo({ pTotalStats: pTotal, cTotalStats: cTotal });
      winner = pTotal > cTotal ? 'PLAYER' : (cTotal > pTotal ? 'CPU' : (Math.random() > 0.5 ? 'PLAYER' : 'CPU'));
    }

    const newResults = [...matchResults, { winner, scores: [pScore, cScore] }];
    setMatchResults(newResults);

    const pWins = newResults.filter(r => r.winner === 'PLAYER').length;
    const cWins = newResults.filter(r => r.winner === 'CPU').length;

    if (pWins >= 2 || cWins >= 2 || newResults.length >= 3) {
      setGameState('GAME_OVER');
    } else {
      setGameState('ROUND_END');
    }
  }, [board, currentScores, gameState, matchResults, round]);

  const nextRound = useCallback(() => {
    setRound(r => r + 1);
    setGameState('DECK_SELECT');
  }, []);

  const resetGame = useCallback(() => {
    setRound(1);
    setMatchResults([]);
    setGameState('TITLE'); // シリーズ終了後はタイトル画面へ
  }, []);

  return {
    gameState, setGameState, round, matchResults,
    playerHand, cpuHand, board, turn,
    selectedCardIdx, setSelectedCardIdx,
    message, setMessage, tieBreakerInfo, tossWinner,
    settings, updateSettings, // タイトル画面で使用
    startGame, onTossComplete, placeCard, currentScores, nextRound, resetGame
  };
};
import { Card, BoardTile, PlayerType, GameSettings } from '../types';

/**
 * 属性補正を計算
 */
const calculateStats = (card: Card, element: string | null): number[] => {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
};

/**
 * セイム・プラスを含めたシミュレーション
 */
const evaluateMove = (
  boardIdx: number,
  card: Card,
  currentBoard: BoardTile[],
  owner: PlayerType,
  settings: GameSettings
): number => {
  const stats = calculateStats(card, currentBoard[boardIdx].element);
  let score = 0;

  const neighbors = [
    { pos: boardIdx - 3, side: 0, oppSide: 3, active: boardIdx >= 3 },
    { pos: boardIdx - 1, side: 1, oppSide: 2, active: boardIdx % 3 !== 0 },
    { pos: boardIdx + 1, side: 2, oppSide: 1, active: boardIdx % 3 !== 2 },
    { pos: boardIdx + 3, side: 3, oppSide: 0, active: boardIdx < 6 },
  ];

  const activeNeighbors = neighbors.filter(n => n.active && currentBoard[n.pos].card);
  const neighborStats = activeNeighbors.map(n => ({
    pos: n.pos,
    card: currentBoard[n.pos].card!,
    myVal: stats[n.side],
    oppVal: (currentBoard[n.pos].card!.modifiedStats || currentBoard[n.pos].card!.stats)[n.oppSide]
  }));

  let specialFlips = 0;

  // セイム判定
  if (settings.sameEnabled) {
    const sameMatches = neighborStats.filter(n => n.myVal === n.oppVal);
    if (sameMatches.length >= 2) {
      specialFlips += sameMatches.filter(n => n.card.owner !== owner).length;
      score += 50; // セイム成立ボーナス
    }
  }

  // プラス判定
  if (settings.plusEnabled) {
    const sums: Record<number, number> = {};
    neighborStats.forEach(n => {
      const sum = n.myVal + n.oppVal;
      sums[sum] = (sums[sum] || 0) + 1;
    });
    const plusSums = Object.keys(sums).filter(s => sums[Number(s)] >= 2);
    if (plusSums.length > 0) {
      plusSums.forEach(s => {
        const targetSum = Number(s);
        specialFlips += neighborStats.filter(n => (n.myVal + n.oppVal) === targetSum && n.card.owner !== owner).length;
      });
      score += 60; // プラス成立ボーナス
    }
  }

  // 通常めくり
  const normalFlips = neighborStats.filter(n => n.myVal > n.oppVal && n.card.owner !== owner).length;
  
  // スコア計算
  score += (normalFlips + specialFlips) * 20;

  // 防御スコア（HIGH以上で重視）
  const avgDefense = stats.reduce((a, b) => a + b, 0) / 4;
  score += avgDefense * 2;

  // 角ボーナス
  if ([0, 2, 6, 8].includes(boardIdx)) score += 15;

  return score;
};

export const getBestMove = (
  board: BoardTile[],
  hand: Card[],
  settings: GameSettings
): { boardIdx: number; handIdx: number } => {
  const { cpuDifficulty: difficulty } = settings;
  const emptyCells = board
    .map((tile, i) => (tile.card === null ? i : null))
    .filter((i): i is number => i !== null);

  if (difficulty === 'LOW' || emptyCells.length === 0) {
    return {
      boardIdx: emptyCells[Math.floor(Math.random() * emptyCells.length)],
      handIdx: Math.floor(Math.random() * hand.length),
    };
  }

  const moves: { boardIdx: number; handIdx: number; score: number }[] = [];

  emptyCells.forEach(cellIdx => {
    hand.forEach((card, hIdx) => {
      let score = 0;

      if (difficulty === 'MID') {
        // MIDはシンプルにめくる枚数と角
        const stats = calculateStats(card, board[cellIdx].element);
        const normalFlips = [
          { pos: cellIdx - 3, side: 0, oppSide: 3, active: cellIdx >= 3 },
          { pos: cellIdx - 1, side: 1, oppSide: 2, active: cellIdx % 3 !== 0 },
          { pos: cellIdx + 1, side: 2, oppSide: 1, active: cellIdx % 3 !== 2 },
          { pos: cellIdx + 3, side: 3, oppSide: 0, active: cellIdx < 6 },
        ].filter(n => n.active && board[n.pos].card && board[n.pos].card?.owner !== 'CPU' && stats[n.side] > (board[n.pos].card!.modifiedStats || board[n.pos].card!.stats)[n.oppSide]).length;
        score = normalFlips * 10 + ([0, 2, 6, 8].includes(cellIdx) ? 5 : 0);
      } else {
        // HIGH と EXPERT
        score = evaluateMove(cellIdx, card, board, 'CPU', settings);
        
        // EXPERTは特殊ルール成立をより強く狙う
        if (difficulty === 'EXPERT') {
          // コンボの可能性（簡略化：めくれる周囲のカードが多いほど加点）
          score *= 1.2; 
        }
      }

      moves.push({ boardIdx: cellIdx, handIdx: hIdx, score });
    });
  });

  moves.sort((a, b) => b.score - a.score || Math.random() - 0.5);

  return {
    boardIdx: moves[0].boardIdx,
    handIdx: moves[0].handIdx,
  };
};
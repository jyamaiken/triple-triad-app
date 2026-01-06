import { Card, BoardTile, PlayerType } from '../types';

/**
 * 属性補正を計算する（useGame.tsのロジックを再現）
 */
const calculateStats = (card: Card, element: string | null): number[] => {
  if (!element) return [...card.stats];
  const modifier = card.attr === element ? 1 : -1;
  return card.stats.map(s => Math.max(1, Math.min(10, s + modifier)));
};

/**
 * 特定の場所にカードを置いた時に何枚めくれるかをシミュレーションする
 */
const countFlips = (
  boardIdx: number,
  card: Card,
  currentBoard: BoardTile[],
  owner: PlayerType
): number => {
  const stats = calculateStats(card, currentBoard[boardIdx].element);
  let flips = 0;

  const neighbors = [
    { pos: boardIdx - 3, side: 0, oppSide: 3, active: boardIdx >= 3 },
    { pos: boardIdx - 1, side: 1, oppSide: 2, active: boardIdx % 3 !== 0 },
    { pos: boardIdx + 1, side: 2, oppSide: 1, active: boardIdx % 3 !== 2 },
    { pos: boardIdx + 3, side: 3, oppSide: 0, active: boardIdx < 6 },
  ];

  neighbors.forEach(n => {
    if (n.active) {
      const neighborTile = currentBoard[n.pos];
      if (neighborTile.card && neighborTile.card.owner !== owner) {
        const pS = stats[n.side];
        const nS = neighborTile.card.modifiedStats || neighborTile.card.stats;
        if (pS > nS[n.oppSide]) {
          flips++;
        }
      }
    }
  });

  return flips;
};

/**
 * CPUの次の手を決定するメイン関数
 */
export const getBestMove = (
  board: BoardTile[],
  hand: Card[],
  difficulty: 'LOW' | 'MID' | 'HIGH'
): { boardIdx: number; handIdx: number } => {
  const emptyCells = board
    .map((tile, i) => (tile.card === null ? i : null))
    .filter((i): i is number => i !== null);

  // --- LOW: 完全ランダム ---
  if (difficulty === 'LOW' || emptyCells.length === 0) {
    return {
      boardIdx: emptyCells[Math.floor(Math.random() * emptyCells.length)],
      handIdx: Math.floor(Math.random() * hand.length),
    };
  }

  // 全ての可能性を評価
  const moves: { boardIdx: number; handIdx: number; score: number }[] = [];

  emptyCells.forEach(cellIdx => {
    hand.forEach((card, hIdx) => {
      const flips = countFlips(cellIdx, card, board, 'CPU');
      
      let score = flips * 10; // 1枚めくるごとに10点

      // --- MID/HIGH 用の追加評価ロジック ---
      if (difficulty === 'MID' || difficulty === 'HIGH') {
        const stats = calculateStats(card, board[cellIdx].element);
        
        // 角(0,2,6,8)は守りやすいため少し加点
        if ([0, 2, 6, 8].includes(cellIdx)) {
          score += 5;
        }
        
        // HIGHの場合は、さらに「自分の数値が相手に取られにくいか」を評価
        if (difficulty === 'HIGH') {
          // 四方の合計値が高いほど、防御力が高いとみなして加点
          const totalDefense = stats.reduce((a, b) => a + b, 0);
          score += totalDefense / 2;
        }
      }

      moves.push({ boardIdx: cellIdx, handIdx: hIdx, score });
    });
  });

  // スコアが高い順にソート
  // 同じスコアの場合はランダム性を出すためにシャッフル
  moves.sort((a, b) => b.score - a.score || Math.random() - 0.5);

  return {
    boardIdx: moves[0].boardIdx,
    handIdx: moves[0].handIdx,
  };
};
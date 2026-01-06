export type PlayerType = 'PLAYER' | 'CPU';
export type GameState = 'TITLE' | 'DECK_SELECT' | 'COIN_TOSS' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';

export interface GameSettings {
  elementalEnabled: boolean; // 属性ルール
  sameEnabled: boolean;      // セイム
  plusEnabled: boolean;      // プラス
  cpuDifficulty: 'LOW' | 'MID' | 'HIGH' | 'EXPERT'; // EXPERTを追加
  pvpMode: boolean;
}

export interface Card {
  id: number;
  level: number;
  name: string;
  stats: number[]; // [上, 左, 右, 下]
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
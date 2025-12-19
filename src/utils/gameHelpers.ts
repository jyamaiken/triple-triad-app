import { Card } from '../types';
import CARDS_DATA from '../data/cards.json';

/**
 * 合計レベルが指定値になる5枚のレベル構成をランダムに生成
 */
export const getLevelsForTotal = (target: number = 30): number[] => {
  let levels: number[] = [];
  while (true) {
    levels = [];
    let currentTotal = 0;
    for (let i = 0; i < 4; i++) {
      const lv = Math.floor(Math.random() * 10) + 1;
      levels.push(lv);
      currentTotal += lv;
    }
    const lastLv = target - currentTotal;
    if (lastLv >= 1 && lastLv <= 10) {
      levels.push(lastLv);
      return levels.sort((a, b) => b - a);
    }
  }
};

/**
 * 指定されたレベル配列に基づき、重複なしでカードをランダムにピック
 */
export const generateDeckFromLevels = (levels: number[]): Card[] => {
  const usedIds = new Set<number>();
  const cards = CARDS_DATA as Card[];
  return levels.map(lv => {
    const candidates = cards.filter(c => c.level === lv && !usedIds.has(c.id));
    const card = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)] 
      : cards.filter(c => c.level === lv)[0];
    
    usedIds.add(card.id);
    return { ...card, owner: null };
  });
};
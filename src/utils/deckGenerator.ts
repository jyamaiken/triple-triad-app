import CARDS_DATA_RAW from '../data/cards.json';
import { Card } from '../types';

const CARDS_DATA = CARDS_DATA_RAW as Card[];

/**
 * 合計コストが指定値（targetTotal）になるデッキを生成する
 * * 改善されたロジック:
 * 以前の「レベル構成を先に決める」方式ではなく、「カードをランダムに選んでいく」方式に変更。
 * これにより、特定のレベル帯への偏りを防ぎ、110枚すべてのカードがより均等に出現するようにする。
 */
export const generateDeck = (targetTotal: number = 30, forbiddenIds: Set<number> = new Set()): Card[] => {
  const MAX_ATTEMPTS = 2000; // 試行回数上限

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const deck: Card[] = [];
    const currentDeckIds = new Set<number>();
    let currentTotal = 0;

    // 1. まず4枚を完全にランダムに選ぶ（禁止カード、重複を除く）
    for (let i = 0; i < 4; i++) {
      // 候補となる全カード
      const candidates = CARDS_DATA.filter(c => !forbiddenIds.has(c.id) && !currentDeckIds.has(c.id));
      
      // 万が一候補がない場合（あり得ないが安全策）
      if (candidates.length === 0) break;

      const card = candidates[Math.floor(Math.random() * candidates.length)];
      deck.push(card);
      currentDeckIds.add(card.id);
      currentTotal += card.level;
    }

    if (deck.length < 4) continue;

    // 2. 残りの1枚で合計を targetTotal に合わせる
    const requiredLevel = targetTotal - currentTotal;

    // 必要なレベルが有効範囲内（1〜10）であれば、そのレベルのカードを探す
    if (requiredLevel >= 1 && requiredLevel <= 10) {
      const lastCandidates = CARDS_DATA.filter(c => 
        c.level === requiredLevel && 
        !forbiddenIds.has(c.id) && 
        !currentDeckIds.has(c.id)
      );

      if (lastCandidates.length > 0) {
        const lastCard = lastCandidates[Math.floor(Math.random() * lastCandidates.length)];
        // デッキ完成
        return [...deck, { ...lastCard, owner: null }];
      }
    }
    // 条件に合わなければリトライ（試行回数内であれば何度でもやり直す）
  }

  // 万が一見つからなかった場合のフォールバック（最低限のデッキを返す）
  // 確率的にほぼあり得ないが、アプリのクラッシュを防ぐため
  return generateFallbackDeck(targetTotal);
};

// 緊急用フォールバック（レベル1のみなどで埋める単純なもの）
const generateFallbackDeck = (targetTotal: number): Card[] => {
  console.warn("Deck generation timed out, using fallback.");
  const deck: Card[] = [];
  let currentTotal = 0;
  // 適当に埋める
  for(let i=0; i<5; i++) {
      const card = CARDS_DATA[i]; // ID 1~5
      deck.push({...card, owner: null});
  }
  return deck;
};

// 互換性のために古い関数名もエクスポートしておくが、中身は新しいロジックを使う
export const getLevelsForTotal = (target: number) => []; // 未使用
export const generateDeckFromLevels = (levels: number[], forbiddenIds?: Set<number>) => generateDeck(30, forbiddenIds);
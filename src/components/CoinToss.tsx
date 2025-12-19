import React, { useState, useEffect } from 'react';
import { PlayerType } from '../types';

interface CoinTossProps {
  winner: PlayerType;
  onComplete: () => void;
}

const CoinToss: React.FC<CoinTossProps> = ({ winner, onComplete }) => {
  const [rotation, setRotation] = useState(0);
  const [showResultText, setShowResultText] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const spins = 6 + Math.floor(Math.random() * 2);
      // 親から受け取った固定結果に基づき回転
      setRotation(spins * 360 + (winner === 'PLAYER' ? 0 : 180));
      
      setTimeout(() => setShowResultText(true), 2800);
      setTimeout(() => onComplete(), 4500);
    }, 100);
    return () => clearTimeout(timer);
  }, [winner, onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md z-50">
      <div className="mb-16 text-center animate-in fade-in duration-500">
        <h2 className="text-5xl font-black italic tracking-[0.2em] text-white uppercase mb-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">Coin Toss</h2>
        <p className="text-slate-400 font-black tracking-widest uppercase text-sm">Determining the First Turn...</p>
      </div>

      <div className="relative w-72 h-72 perspective-1000">
        <div 
          className="w-full h-full relative transition-transform duration-[3000ms]" 
          style={{ 
            transformStyle: 'preserve-3d', 
            transitionTimingFunction: 'cubic-bezier(0.15, 0, 0.15, 1)', 
            transform: `rotateY(${rotation}deg)` 
          }}
        >
          <div className="absolute inset-0 w-full h-full rounded-full border-[10px] border-blue-400 bg-gradient-to-br from-blue-500 to-blue-800 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.6)]" style={{ backfaceVisibility: 'hidden' }}>
            <div className="bg-white/20 p-4 rounded-full mb-2"><span className="text-white font-black text-7xl italic">YOU</span></div>
            <span className="text-blue-100 font-black text-lg tracking-[0.3em] uppercase">Player Side</span>
          </div>
          <div 
            className="absolute inset-0 w-full h-full rounded-full border-[10px] border-red-500 bg-gradient-to-br from-red-600 to-red-900 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.6)]" 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="bg-white/20 p-4 rounded-full mb-2"><span className="text-white font-black text-7xl italic">CPU</span></div>
            <span className="text-red-100 font-black text-lg tracking-[0.3em] uppercase">Enemy Side</span>
          </div>
        </div>
      </div>

      <div className="mt-20 h-16 flex flex-col items-center">
        {showResultText && (
          <div className="animate-in slide-in-from-bottom-4 zoom-in duration-700">
             <span className={`text-4xl font-black italic tracking-[0.1em] uppercase px-10 py-3 rounded-full border-4 shadow-2xl ${winner === 'PLAYER' ? 'text-blue-400 border-blue-500 bg-blue-500/20' : 'text-red-400 border-red-500 bg-red-500/20'}`}>
               {winner === 'PLAYER' ? 'Your Initiative' : 'CPU Initiative'}
             </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinToss;
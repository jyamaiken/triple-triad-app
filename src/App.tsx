import React, { useEffect } from 'react';
import { Swords, Trophy, Medal, CheckCircle2, XCircle, RefreshCw, Settings2, Play, Users, Cpu as CpuIcon, Zap, User } from 'lucide-react';
import { useGame } from './hooks/useGame';
import DeckSelect from './components/DeckSelect';
import Hand from './components/Hand';
import Board from './components/Board';
import CoinToss from './components/CoinToss';

export default function App() {
  const game = useGame();

  // CPU AI の行動管理
  useEffect(() => {
    if (game.gameState === 'PLAYING' && game.turn === 'CPU' && game.cpuHand.length > 0) {
      const timer = setTimeout(() => {
        const emptyCells = game.board
          .map((tile, i) => (tile.card === null ? i : null))
          .filter((i): i is number => i !== null);
        
        if (emptyCells.length === 0) return;

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const randomHandIdx = Math.floor(Math.random() * game.cpuHand.length);
        
        game.placeCard(randomCell, game.cpuHand, randomHandIdx, 'CPU');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game.turn, game.board, game.gameState, game.cpuHand, game.placeCard]);

  // 全体の結果集計
  const seriesWins = game.matchResults.filter(r => r.winner === 'PLAYER').length;
  const seriesLosses = game.matchResults.filter(r => r.winner === 'CPU').length;
  const seriesWinner = seriesWins >= 2 ? 'PLAYER' : seriesLosses >= 2 ? 'CPU' : (game.matchResults.length === 3 ? (seriesWins > seriesLosses ? 'PLAYER' : 'CPU') : null);
  const lastResult = game.matchResults.length > 0 ? game.matchResults[game.matchResults.length - 1] : null;

  // --- タイトル画面表示 ---
  if (game.gameState === 'TITLE') {
    return (
      <div className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-12 overflow-hidden relative font-sans">
        {/* 背景演出 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse delay-700" />

        <div className="relative z-10 flex flex-col items-center max-w-4xl w-full">
          <div className="mb-2 flex items-center gap-4 text-blue-500 font-black tracking-[0.8em] uppercase text-sm animate-in fade-in slide-in-from-top-4 duration-700">
            Next Gen Card Battle
          </div>
          <h1 className="text-9xl font-black italic tracking-tighter uppercase mb-16 flex items-center gap-8 drop-shadow-2xl animate-in zoom-in-95 duration-1000">
             Triple <span className="text-blue-500">Triad</span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {/* モード選択（現在は CPU 戦のみ） */}
            <div className="space-y-6">
               <h3 className="flex items-center gap-3 text-slate-500 font-black uppercase tracking-widest text-xs border-b border-slate-900 pb-3">
                 <Users size={16} /> Game Mode
               </h3>
               <div className="grid grid-cols-1 gap-3">
                  <button className="flex items-center justify-between p-6 rounded-2xl bg-blue-600 border-2 border-blue-400 shadow-lg shadow-blue-900/20 group">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><User size={24} /></div>
                      <div>
                        <div className="font-black italic text-lg uppercase">Vs CPU</div>
                        <div className="text-[10px] text-blue-200 font-bold tracking-widest">SINGLE PLAYER SERIES</div>
                      </div>
                    </div>
                    <CheckCircle2 size={24} />
                  </button>
                  <button className="flex items-center justify-between p-6 rounded-2xl bg-slate-900/50 border-2 border-slate-800 opacity-40 cursor-not-allowed group">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center"><Users size={24} /></div>
                      <div>
                        <div className="font-black italic text-lg uppercase">Local PvP</div>
                        <div className="text-[10px] text-slate-500 font-bold tracking-widest">LOCKED</div>
                      </div>
                    </div>
                  </button>
               </div>
            </div>

            {/* ルール設定 */}
            <div className="space-y-6">
               <h3 className="flex items-center gap-3 text-slate-500 font-black uppercase tracking-widest text-xs border-b border-slate-900 pb-3">
                 <Settings2 size={16} /> Rule Settings
               </h3>
               <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => game.updateSettings({ elementalEnabled: !game.settings.elementalEnabled })}
                    className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300
                      ${game.settings.elementalEnabled 
                        ? 'bg-emerald-600/10 border-emerald-500/50 shadow-lg shadow-emerald-900/10' 
                        : 'bg-slate-900/50 border-slate-800 opacity-60'}`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${game.settings.elementalEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        <Zap size={24} fill={game.settings.elementalEnabled ? "currentColor" : "none"} />
                      </div>
                      <div>
                        <div className={`font-black italic text-lg uppercase ${game.settings.elementalEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>Elemental</div>
                        <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Board Element Bonuses</div>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${game.settings.elementalEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${game.settings.elementalEnabled ? 'left-7' : 'left-1'}`} />
                    </div>
                  </button>

                  <div className="p-6 rounded-2xl bg-slate-900/30 border-2 border-slate-800/50 opacity-40 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-left">
                       <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500"><CpuIcon size={24} /></div>
                       <div>
                         <div className="font-black italic text-lg uppercase text-slate-500">CPU: Normal</div>
                         <div className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">Default Difficulty</div>
                       </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-600 border border-slate-800 px-2 py-1 rounded">FIXED</span>
                  </div>
               </div>
            </div>
          </div>

          <button 
            onClick={() => game.setGameState('DECK_SELECT')}
            className="group relative px-24 py-8 bg-white hover:bg-blue-600 text-slate-950 hover:text-white rounded-full font-black text-3xl italic uppercase tracking-[0.2em] transition-all duration-500 hover:scale-110 hover:shadow-[0_0_50px_rgba(59,130,246,0.5)] active:scale-95"
          >
            Start Series
            <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 group-hover:scale-125 group-hover:opacity-0 transition-all duration-700" />
          </button>
        </div>

        <div className="absolute bottom-12 text-[10px] font-black tracking-[0.5em] text-slate-700 uppercase">
          Arcade System v2.8 | BO3 Rules Engine
        </div>
      </div>
    );
  }

  // --- メイン対戦画面 ---
  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col p-8 select-none font-sans">
      <header className="h-20 flex justify-between items-center mb-4 shrink-0 border-b border-slate-900 pb-4 px-4">
        <h1 className="text-4xl font-black tracking-tighter italic uppercase text-white flex items-center gap-4">
          <Swords className="text-blue-500" size={40} /> Triple Triad <span className="text-blue-400">{game.settings.elementalEnabled ? 'Elemental' : 'Standard'}</span>
        </h1>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tournament Progress</span>
            <div className="flex gap-2 mt-1">
              {[...Array(3)].map((_, i) => {
                const res = game.matchResults[i];
                return (
                  <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all duration-500 
                    ${res ? (res.winner === 'PLAYER' ? 'bg-blue-600 border-blue-400' : res.winner === 'CPU' ? 'bg-red-600 border-red-400' : 'bg-slate-700 border-slate-500') 
                          : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                    {res ? (res.winner === 'PLAYER' ? <CheckCircle2 size={18} /> : res.winner === 'CPU' ? <XCircle size={18} /> : '-') : i + 1}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-4xl font-black italic">
            <span className="text-blue-500">{seriesWins}</span>
            <span className="text-slate-700 px-2">-</span>
            <span className="text-red-500">{seriesLosses}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative">
        {game.gameState === 'DECK_SELECT' && <DeckSelect onSelect={game.startGame} />}
        
        {game.gameState === 'COIN_TOSS' && game.tossWinner && (
          <CoinToss winner={game.tossWinner} onComplete={game.onTossComplete} />
        )}

        {(game.gameState === 'PLAYING' || game.gameState === 'ROUND_END' || game.gameState === 'GAME_OVER') && (
          <div className="h-full flex gap-12 items-stretch justify-center animate-in fade-in duration-500">
            <div className="w-64 h-full shrink-0">
               <Hand hand={game.playerHand} type="PLAYER" score={game.currentScores[0]} selectedIdx={game.selectedCardIdx} onSelect={game.setSelectedCardIdx} />
            </div>

            <div className="flex-1 flex flex-col items-center justify-between py-4 max-w-[800px]">
              <div className={`px-12 py-3 rounded-2xl text-xl font-black uppercase border-b-4 transition-all
                ${game.turn === 'PLAYER' ? 'bg-blue-600 border-blue-800 shadow-xl shadow-blue-900/40' : 'bg-red-600 border-red-800'}`}>
                {game.turn === 'PLAYER' ? "YOUR TURN" : "CPU THINKING..."}
              </div>
              
              <div className="w-full flex-1 flex items-center justify-center min-h-0">
                <Board 
                  board={game.board} 
                  onPlace={(idx) => game.selectedCardIdx !== null && game.placeCard(idx, game.playerHand, game.selectedCardIdx, 'PLAYER')}
                  canPlace={game.selectedCardIdx !== null && game.turn === 'PLAYER'}
                  selectedCardAttr={game.selectedCardIdx !== null ? game.playerHand[game.selectedCardIdx].attr : null}
                />
              </div>
              <div className="h-10 mt-4 text-slate-500 font-bold uppercase tracking-widest italic text-center leading-none">
                 <span className="animate-pulse">{game.message}</span>
              </div>
            </div>

            <div className="w-64 h-full shrink-0">
               <Hand hand={game.cpuHand} type="CPU" score={game.currentScores[1]} />
            </div>
          </div>
        )}
      </main>

      {/* 対戦結果モーダル（ラウンド終了 & シリーズ終了） */}
      {(game.gameState === 'ROUND_END' || game.gameState === 'GAME_OVER') && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-12">
          <div className="max-w-3xl w-full bg-slate-900 border-4 border-slate-800 p-12 rounded-[4rem] text-center shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            
            {game.gameState === 'ROUND_END' ? (
              <>
                <div className="mb-6 flex flex-col items-center">
                  <Trophy className="w-20 h-20 text-yellow-500 mb-2 drop-shadow-lg" />
                  <span className="text-xs font-black text-blue-500 tracking-[0.5em] uppercase mb-1">Match {game.matchResults.length} Result</span>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">
                    {lastResult?.winner === 'PLAYER' ? 'VICTORY!' : lastResult?.winner === 'CPU' ? 'DEFEAT' : 'DRAW'}
                  </h2>
                </div>
                
                <div className="flex justify-center items-center gap-10 mb-8 text-8xl font-black">
                  <span className="text-blue-500">{lastResult?.scores[0] ?? 0}</span>
                  <span className="text-slate-800">-</span>
                  <span className="text-red-500">{lastResult?.scores[1] ?? 0}</span>
                </div>

                {game.tieBreakerInfo && (
                  <div className="bg-slate-950 p-6 rounded-3xl mb-10 border-2 border-yellow-500/20 max-w-lg mx-auto">
                    <p className="text-yellow-500 font-black mb-2 tracking-[0.3em] text-[10px] uppercase">Tiebreaker Score (Total Stats)</p>
                    <div className="flex justify-between px-8 text-2xl font-black">
                      <span className="text-blue-400">P: {game.tieBreakerInfo.pTotalStats}</span>
                      <span className="text-slate-600">vs</span>
                      <span className="text-red-400">C: {game.tieBreakerInfo.cTotalStats}</span>
                    </div>
                  </div>
                )}

                <button 
                  onClick={game.nextRound}
                  className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl shadow-blue-900/40"
                >
                  START NEXT ROUND <Swords size={28} />
                </button>
              </>
            ) : (
              <>
                <div className="mb-8 relative">
                   <div className="absolute inset-0 bg-yellow-500/10 blur-[80px] rounded-full" />
                   <Medal className={`w-32 h-32 mx-auto mb-4 relative z-10 ${seriesWinner === 'PLAYER' ? 'text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,0.6)]' : 'text-slate-700'}`} />
                   <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest mb-1">Series Finished</h3>
                   <h2 className={`text-7xl font-black italic uppercase tracking-tighter mb-4 
                    ${seriesWinner === 'PLAYER' ? 'text-yellow-400' : 'text-red-500'}`}>
                    {seriesWinner === 'PLAYER' ? 'Champion!' : 'Series Lost'}
                   </h2>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-12">
                  {[...Array(3)].map((_, i) => {
                    const res = game.matchResults[i];
                    return (
                      <div key={i} className={`p-6 rounded-[2rem] border-2 flex flex-col items-center justify-center relative
                        ${!res ? 'bg-slate-900/30 border-slate-800 opacity-30 scale-90' : 
                          res.winner === 'PLAYER' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                        <span className="text-[10px] font-black text-slate-500 uppercase mb-2">Match 0{i+1}</span>
                        {res ? (
                          <>
                            <span className="text-4xl font-black text-white italic tracking-tighter">{res.scores[0]}-{res.scores[1]}</span>
                            <span className={`text-[10px] font-black mt-2 uppercase tracking-widest ${res.winner === 'PLAYER' ? 'text-blue-400' : 'text-red-400'}`}>
                              {res.winner === 'PLAYER' ? 'Win' : 'Loss'}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-black text-slate-700 italic uppercase">Skipped</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={game.resetGame}
                  className="w-full py-6 bg-white hover:bg-slate-100 text-slate-950 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl"
                >
                  RETURN TO TITLE <RefreshCw size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
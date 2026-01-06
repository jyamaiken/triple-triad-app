import React, { useEffect } from 'react';
import { Swords, Trophy, Medal, CheckCircle2, XCircle, RefreshCw, Settings2, Play, Users, Cpu as CpuIcon, Zap, User, ChevronRight, Layers, Plus as PlusIcon, Sparkles } from 'lucide-react';
import { useGame } from './hooks/useGame';
import { getBestMove } from './utils/cpuLogic';
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
        // 全ての設定を渡すように修正
        const { boardIdx, handIdx } = getBestMove(
          game.board, 
          game.cpuHand, 
          game.settings
        );
        
        game.placeCard(boardIdx, game.cpuHand, handIdx, 'CPU');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game.turn, game.board, game.gameState, game.cpuHand, game.placeCard, game.settings]);

  // 全体の結果集計
  const seriesWins = game.matchResults.filter(r => r.winner === 'PLAYER').length;
  const seriesLosses = game.matchResults.filter(r => r.winner === 'CPU').length;
  const seriesWinner = seriesWins >= 2 ? 'PLAYER' : seriesLosses >= 2 ? 'CPU' : (game.matchResults.length === 3 ? (seriesWins > seriesLosses ? 'PLAYER' : 'CPU') : null);
  const lastResult = game.matchResults.length > 0 ? game.matchResults[game.matchResults.length - 1] : null;

  // 難易度ごとのスタイル定義
  const difficultyConfig = {
    LOW: { label: 'Easy', color: 'text-emerald-400', border: 'border-emerald-900/50', icon: <CpuIcon size={20} /> },
    MID: { label: 'Normal', color: 'text-blue-400', border: 'border-blue-900/50', icon: <CpuIcon size={20} /> },
    HIGH: { label: 'Hard', color: 'text-red-400', border: 'border-red-900/50', icon: <CpuIcon size={20} /> },
    EXPERT: { label: 'Expert', color: 'text-purple-400', border: 'border-purple-500/50', icon: <Sparkles size={20} /> },
  };

  // --- タイトル画面表示 ---
  if (game.gameState === 'TITLE') {
    return (
      <div className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-12 overflow-hidden relative font-sans">
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
            {/* モード選択 */}
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
                        <div className="text-[10px] text-slate-500 font-bold tracking-widest">COMING SOON</div>
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
               <div className="flex flex-col gap-4">
                  {/* 特殊ルール3種を同じデザインのグリッドで配置 */}
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => game.updateSettings({ elementalEnabled: !game.settings.elementalEnabled })}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300
                        ${game.settings.elementalEnabled ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}
                    >
                      <Zap size={22} className={game.settings.elementalEnabled ? 'text-emerald-400' : 'text-slate-600'} fill={game.settings.elementalEnabled ? "currentColor" : "none"} />
                      <span className={`text-[10px] font-black italic uppercase mt-2 ${game.settings.elementalEnabled ? 'text-white' : 'text-slate-600'}`}>Elem</span>
                    </button>
                    
                    <button 
                      onClick={() => game.updateSettings({ sameEnabled: !game.settings.sameEnabled })}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300
                        ${game.settings.sameEnabled ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}
                    >
                      <Layers size={22} className={game.settings.sameEnabled ? 'text-blue-400' : 'text-slate-600'} />
                      <span className={`text-[10px] font-black italic uppercase mt-2 ${game.settings.sameEnabled ? 'text-white' : 'text-slate-600'}`}>Same</span>
                    </button>

                    <button 
                      onClick={() => game.updateSettings({ plusEnabled: !game.settings.plusEnabled })}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300
                        ${game.settings.plusEnabled ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}
                    >
                      <PlusIcon size={22} className={game.settings.plusEnabled ? 'text-amber-400' : 'text-slate-600'} />
                      <span className={`text-[10px] font-black italic uppercase mt-2 ${game.settings.plusEnabled ? 'text-white' : 'text-slate-600'}`}>Plus</span>
                    </button>
                  </div>

                  {/* 難易度設定サイクル */}
                  <button 
                    onClick={() => {
                      const levels: ('LOW' | 'MID' | 'HIGH' | 'EXPERT')[] = ['LOW', 'MID', 'HIGH', 'EXPERT'];
                      const currentIdx = levels.indexOf(game.settings.cpuDifficulty);
                      const nextIdx = (currentIdx + 1) % levels.length;
                      game.updateSettings({ cpuDifficulty: levels[nextIdx] });
                    }}
                    className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 bg-slate-900/50 hover:bg-slate-800/80
                      ${difficultyConfig[game.settings.cpuDifficulty].border}`}
                  >
                    <div className="flex items-center gap-4 text-left">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 ${difficultyConfig[game.settings.cpuDifficulty].color}`}>
                         {difficultyConfig[game.settings.cpuDifficulty].icon}
                       </div>
                       <div>
                         <div className={`font-black italic text-lg uppercase ${difficultyConfig[game.settings.cpuDifficulty].color}`}>
                           CPU: {difficultyConfig[game.settings.cpuDifficulty].label}
                         </div>
                         <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Intelligence Level</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="text-[10px] font-black uppercase tracking-widest mr-1">Switch</span>
                      <ChevronRight size={16} />
                    </div>
                  </button>
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
          Arcade System v3.0 | Expert AI Engine
        </div>
      </div>
    );
  }

  // --- メイン対戦画面 ---
  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col p-8 select-none font-sans">
      <header className="h-20 flex justify-between items-center mb-4 shrink-0 border-b border-slate-900 pb-4 px-4">
        <h1 className="text-4xl font-black tracking-tighter italic uppercase text-white flex items-center gap-4">
          <Swords className="text-blue-500" size={40} /> Triple Triad 
          <div className="flex gap-2 ml-4">
            {game.settings.elementalEnabled && <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/30 rounded uppercase font-black">Elem</span>}
            {game.settings.sameEnabled && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] border border-blue-500/30 rounded uppercase font-black">Same</span>}
            {game.settings.plusEnabled && <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] border border-amber-500/30 rounded uppercase font-black">Plus</span>}
          </div>
        </h1>
        <div className="flex items-center gap-8">
          <div className={`px-4 py-2 bg-slate-900 rounded-xl border flex items-center gap-3 ${difficultyConfig[game.settings.cpuDifficulty].border}`}>
             <span className={difficultyConfig[game.settings.cpuDifficulty].color}>
               {difficultyConfig[game.settings.cpuDifficulty].icon}
             </span>
             <span className={`text-xs font-black uppercase tracking-widest ${difficultyConfig[game.settings.cpuDifficulty].color}`}>
               {difficultyConfig[game.settings.cpuDifficulty].label} Mode
             </span>
          </div>
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
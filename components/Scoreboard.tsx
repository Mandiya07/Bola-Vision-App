
import React from 'react';
import { useMatchContext } from '../context/MatchContext';
import { PlayIcon, PauseIcon, DollarIcon, BroadcastIcon } from './icons/ControlIcons';
import type { MatchState } from '../types';

const formatTime = (totalSeconds: number, period: MatchState['matchPeriod']) => {
    if (period === 'halfTime') return 'HT';
    if (period === 'fullTime') return 'FT';
    if (period === 'extraTimeHalfTime') return 'ET HT';
    if (period === 'penaltyShootout') return 'PENS';

    const firstHalfEnd = 45 * 60;
    const secondHalfEnd = 90 * 60;
    const etFirstHalfEnd = 105 * 60;
    const etSecondHalfEnd = 120 * 60;

    if (period === 'firstHalf' && totalSeconds >= firstHalfEnd) {
        const stoppageSeconds = totalSeconds - firstHalfEnd;
        const stoppageMinutes = Math.ceil(stoppageSeconds / 60);
        return `45 +${stoppageMinutes}'`;
    }
    
    if (period === 'secondHalf' && totalSeconds >= secondHalfEnd) {
        const stoppageSeconds = totalSeconds - secondHalfEnd;
        const stoppageMinutes = Math.ceil(stoppageSeconds / 60);
        return `90 +${stoppageMinutes}'`;
    }
    
    if (period === 'extraTimeFirstHalf' && totalSeconds >= etFirstHalfEnd) {
        const stoppageSeconds = totalSeconds - etFirstHalfEnd;
        const stoppageMinutes = Math.ceil(stoppageSeconds / 60);
        return `105 +${stoppageMinutes}'`;
    }

    if (period === 'extraTimeSecondHalf' && totalSeconds >= etSecondHalfEnd) {
        const stoppageSeconds = totalSeconds - etSecondHalfEnd;
        const stoppageMinutes = Math.ceil(stoppageSeconds / 60);
        return `120 +${stoppageMinutes}'`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const DefaultScoreboard: React.FC = () => {
  const { state } = useMatchContext();
  const { penaltyShootout } = state;

  return (
    <div className="absolute top-6 left-6 flex flex-col gap-0 z-30 animate-fade-in select-none font-body">
      {/* League Header */}
      <div className="flex items-center justify-between glass-panel text-neon-cyan text-[10px] font-display font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-t-lg border-b border-neon-cyan/20 w-full min-w-[240px] shadow-lg">
          <span>{state.leagueName || 'BOLA VISION PRO'}</span>
          <div className="flex items-center gap-2">
             {state.weather && <span className="opacity-70 text-white/60">{state.weather}</span>}
             {state.isMatchPlaying && (
                 <span className="flex h-2 w-2 relative" title="Live">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
                 </span>
             )}
          </div>
      </div>

      {/* Main Scoreboard */}
      <div className="flex h-16 glass-panel rounded-b-lg overflow-hidden border-t-0 neon-border-cyan/30">
          
          {/* Home Team */}
          <div className="flex-1 flex items-center justify-end bg-slate-900/40 pl-4 pr-3 gap-3 min-w-[140px] relative group">
              <div className="absolute left-0 top-0 bottom-0 w-1 shadow-[0_0_15px_rgba(0,243,255,0.5)]" style={{ backgroundColor: state.homeTeam.color || '#00f3ff' }}></div>
              <span className="text-white font-display font-bold text-sm uppercase tracking-wider truncate text-right">
                  {state.homeTeam.name}
              </span>
              {state.homeTeam.logo ? (
                  <img src={state.homeTeam.logo} alt="Home Logo" className="w-10 h-10 object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />
              ) : (
                  <div className="w-10 h-10 rounded-lg glass-panel border-white/20 flex items-center justify-center text-xs font-display font-bold text-white/80">
                      {state.homeTeam.name.substring(0,1)}
                  </div>
              )}
          </div>

          {/* Score & Time Center */}
          <div className="flex flex-col items-center justify-center bg-slate-950/80 px-6 min-w-[110px] border-x border-white/10 relative overflow-hidden">
              {/* Background scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
              
              <div className="flex items-center gap-3 text-3xl font-display font-black text-white leading-none z-10 tracking-tighter">
                  <span className="neon-text-cyan">{state.homeStats.goals}</span>
                  <span className="text-white/20 text-xl font-body">:</span>
                  <span className="neon-text-cyan">{state.awayStats.goals}</span>
              </div>
              <div className="text-[11px] font-mono font-bold text-neon-emerald uppercase tracking-[0.15em] mt-1 z-10 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {formatTime(state.matchTime, state.matchPeriod)}
              </div>
          </div>

          {/* Away Team */}
          <div className="flex-1 flex items-center justify-start bg-slate-900/40 pl-3 pr-4 gap-3 min-w-[140px] relative group">
               {state.awayTeam.logo ? (
                  <img src={state.awayTeam.logo} alt="Away Logo" className="w-10 h-10 object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />
              ) : (
                  <div className="w-10 h-10 rounded-lg glass-panel border-white/20 flex items-center justify-center text-xs font-display font-bold text-white/80">
                      {state.awayTeam.name.substring(0,1)}
                  </div>
              )}
              <span className="text-white font-display font-bold text-sm uppercase tracking-wider truncate text-left">
                  {state.awayTeam.name}
              </span>
              <div className="absolute right-0 top-0 bottom-0 w-1 shadow-[0_0_15px_rgba(255,0,255,0.5)]" style={{ backgroundColor: state.awayTeam.color || '#ff00ff' }}></div>
          </div>
      </div>

      {/* Penalty / Status Indicators */}
      <div className="flex flex-col gap-1.5 items-start pl-1 mt-2">
        {penaltyShootout && (
            <div className="glass-panel neon-border-cyan/50 px-4 py-1.5 rounded-lg text-[11px] font-display font-bold text-neon-yellow border border-neon-yellow/20 shadow-lg flex items-center gap-3 animate-pulse">
                <span className="tracking-widest">PENALTIES</span>
                <span className="w-px h-3 bg-neon-yellow/30"></span>
                <span className="font-mono text-sm">{penaltyShootout.homeScore} - {penaltyShootout.awayScore}</span>
            </div>
        )}
        
        {state.broadcastStatus === 'live' && (
             <div className="flex items-center gap-2 glass-panel border-red-500/30 text-red-500 text-[10px] font-display font-bold px-3 py-1 rounded-full shadow-lg">
                  <BroadcastIcon className="h-3 w-3 animate-pulse" />
                  <span className="tracking-[0.2em]">LIVE SIGNAL</span>
             </div>
        )}
        
        {state.monetization.model !== 'free' && (
            <div className="flex items-center gap-2 glass-panel border-neon-emerald/30 px-3 py-1 rounded-full text-[10px] font-display font-bold text-neon-emerald shadow-lg">
                <DollarIcon className="h-3 w-3" />
                <span className="tracking-[0.2em]">PREMIUM FEED</span>
            </div>
        )}
      </div>

      {/* Sponsor Logo */}
      {state.sponsorLogo && (
        <div className="mt-3 glass-panel p-2 rounded-lg shadow-lg inline-block w-fit opacity-80 hover:opacity-100 transition-all hover:neon-border-cyan self-start">
          <img src={state.sponsorLogo} alt="Sponsor" className="h-6 w-auto object-contain filter brightness-0 invert opacity-70" />
        </div>
      )}
    </div>
  );
};

const MinimalScoreboard: React.FC = () => {
    const { state } = useMatchContext();
    const { homeTeam, awayTeam, homeStats, awayStats, matchTime, monetization, matchPeriod, penaltyShootout, broadcastStatus } = state;
    return (
        <div className="absolute top-4 left-4 flex items-center gap-4 bg-black/70 backdrop-blur-sm p-2 rounded-full text-white font-mono shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
                {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-7 h-7 object-contain rounded-full" style={{backgroundColor: homeTeam.color || '#3b82f6'}}/>}
                <span className="font-bold text-lg">{homeStats.goals}</span>
                {penaltyShootout && <span className="text-sm text-gray-300">({penaltyShootout.homeScore})</span>}
            </div>
            <div className="flex flex-col items-center">
                <span className="text-xs text-yellow-300">{formatTime(matchTime, matchPeriod)}</span>
                 {monetization.model !== 'free' ? (
                    <DollarIcon className="w-4 h-4 text-green-400" title={`Stream Monetized: ${monetization.model.toUpperCase()}`} />
                 ) : (
                    broadcastStatus === 'live' ? <BroadcastIcon className="w-4 h-4 text-blue-400" title="Broadcasting to BolaVision.com" /> : <span className="text-sm font-bold">VS</span>
                 )}
            </div>
            <div className="flex items-center gap-2">
                {penaltyShootout && <span className="text-sm text-gray-300">({penaltyShootout.awayScore})</span>}
                <span className="font-bold text-lg">{awayStats.goals}</span>
                {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-7 h-7 object-contain rounded-full" style={{backgroundColor: awayTeam.color || '#ef4444'}} />}
            </div>
        </div>
    );
};

const BroadcastScoreboard: React.FC = () => {
    const { state } = useMatchContext();
    const { homeTeam, awayTeam, homeStats, awayStats, matchTime, isMatchPlaying, monetization, matchPeriod, penaltyShootout, leagueName } = state;
    return (
        <div className="absolute bottom-4 left-4 w-auto bg-transparent text-white animate-fade-in-up">
            {leagueName && <div className="text-center text-sm font-semibold tracking-wider text-gray-200 bg-black/50 py-0.5 px-3 rounded-t-md mb-[-2px] inline-block">{leagueName}</div>}
            <div className="flex items-end gap-0">
                <div className="flex items-center p-2 rounded-l-lg" style={{ background: `linear-gradient(90deg, ${homeTeam.color || '#3b82f6'} 0%, #000000 100%)` }}>
                    {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-10 h-10 object-contain mr-2" />}
                    <span className="text-2xl font-black uppercase tracking-wider">{homeTeam.name}</span>
                </div>
                <div className="bg-black/80 flex items-center p-2 text-4xl font-black" style={{ clipPath: 'polygon(15% 0, 100% 0, 85% 100%, 0% 100%)' }}>
                    {penaltyShootout && <span className="text-2xl text-gray-300">({penaltyShootout.homeScore}) </span>}
                    <span className="px-3">{homeStats.goals}</span>
                    <span className="text-yellow-400 text-2xl mx-1">:</span>
                    <span className="px-3">{awayStats.goals}</span>
                    {penaltyShootout && <span className="text-2xl text-gray-300"> ({penaltyShootout.awayScore})</span>}
                </div>
                <div className="flex items-center p-2 rounded-r-lg" style={{ background: `linear-gradient(-90deg, ${awayTeam.color || '#ef4444'} 0%, #000000 100%)` }}>
                    <span className="text-2xl font-black uppercase tracking-wider">{awayTeam.name}</span>
                    {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-10 h-10 object-contain ml-2" />}
                </div>
            </div>
             <div className="mt-1 flex justify-center">
                <div className="bg-black/80 px-4 py-1 rounded-full text-lg font-mono text-yellow-300 flex items-center gap-2">
                     {isMatchPlaying ? <PlayIcon className="w-5 h-5 text-green-400" /> : <PauseIcon className="w-5 h-5 text-red-400" />}
                    <span>{formatTime(matchTime, matchPeriod)}</span>
                    {monetization.model !== 'free' && (
                        <DollarIcon className="w-5 h-5 text-green-400" title={`Stream Monetized: ${monetization.model.toUpperCase()}`} />
                    )}
                </div>
            </div>
        </div>
    );
};

const Scoreboard: React.FC = () => {
  const { state } = useMatchContext();

  switch (state.scoreboardTemplate) {
    case 'minimal':
      return <MinimalScoreboard />;
    case 'broadcast':
      return <BroadcastScoreboard />;
    case 'default':
    default:
      return <DefaultScoreboard />;
  }
};

export default Scoreboard;


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
    <div className="absolute top-6 left-6 flex flex-col gap-1 z-30 animate-fade-in select-none font-sans">
      {/* League Header */}
      <div className="flex items-center justify-between bg-black/90 text-gray-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-t-lg border-b border-white/10 w-fit min-w-[200px] backdrop-blur-sm shadow-md">
          <span>{state.leagueName || 'Match Day'}</span>
          <div className="flex items-center gap-1.5">
             {state.weather && <span className="opacity-70">{state.weather}</span>}
             {state.isMatchPlaying && (
                 <span className="flex h-2 w-2 relative" title="Live">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                 </span>
             )}
          </div>
      </div>

      {/* Main Scoreboard */}
      <div className="flex h-14 shadow-2xl rounded-b-lg overflow-hidden ring-1 ring-white/10">
          
          {/* Home Team */}
          <div className="flex-1 flex items-center justify-end bg-gray-900/90 backdrop-blur-md pl-4 pr-3 gap-3 min-w-[140px] relative">
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: state.homeTeam.color || '#3b82f6' }}></div>
              <span className="text-white font-bold text-lg uppercase tracking-wide truncate text-right drop-shadow-md">
                  {state.homeTeam.name}
              </span>
              {state.homeTeam.logo ? (
                  <img src={state.homeTeam.logo} alt="Home Logo" className="w-9 h-9 object-contain drop-shadow-lg" />
              ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 border border-gray-500 flex items-center justify-center text-xs font-bold text-gray-300">
                      {state.homeTeam.name.substring(0,1)}
                  </div>
              )}
          </div>

          {/* Score & Time Center */}
          <div className="flex flex-col items-center justify-center bg-black px-5 min-w-[100px] border-x border-white/5 relative overflow-hidden">
              {/* Background gradient shine */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center gap-2 text-3xl font-black text-white leading-none z-10 font-mono tracking-tighter">
                  <span>{state.homeStats.goals}</span>
                  <span className="text-gray-600 text-xl font-sans opacity-50">-</span>
                  <span>{state.awayStats.goals}</span>
              </div>
              <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-0.5 z-10 bg-green-900/30 px-1.5 rounded">
                  {formatTime(state.matchTime, state.matchPeriod)}
              </div>
          </div>

          {/* Away Team */}
          <div className="flex-1 flex items-center justify-start bg-gray-900/90 backdrop-blur-md pl-3 pr-4 gap-3 min-w-[140px] relative">
               {state.awayTeam.logo ? (
                  <img src={state.awayTeam.logo} alt="Away Logo" className="w-9 h-9 object-contain drop-shadow-lg" />
              ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 border border-gray-500 flex items-center justify-center text-xs font-bold text-gray-300">
                      {state.awayTeam.name.substring(0,1)}
                  </div>
              )}
              <span className="text-white font-bold text-lg uppercase tracking-wide truncate text-left drop-shadow-md">
                  {state.awayTeam.name}
              </span>
              <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: state.awayTeam.color || '#ef4444' }}></div>
          </div>
      </div>

      {/* Penalty / Status Indicators */}
      <div className="flex flex-col gap-1 items-start pl-1">
        {penaltyShootout && (
            <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded text-xs font-bold text-yellow-400 border border-yellow-500/20 shadow-lg flex items-center gap-2 animate-pulse mt-1">
                <span>PENALTIES</span>
                <span className="w-px h-3 bg-yellow-500/50"></span>
                <span>{penaltyShootout.homeScore} - {penaltyShootout.awayScore}</span>
            </div>
        )}
        
        {state.broadcastStatus === 'live' && (
             <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg mt-1">
                  <BroadcastIcon className="h-3 w-3" />
                  <span>ON AIR</span>
             </div>
        )}
        
        {state.monetization.model !== 'free' && (
            <div className="flex items-center gap-1 bg-green-600 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-lg mt-1">
                <DollarIcon className="h-3 w-3" />
                <span>PAID STREAM</span>
            </div>
        )}
      </div>

      {/* Sponsor Logo */}
      {state.sponsorLogo && (
        <div className="mt-2 bg-white p-1.5 rounded-md shadow-lg inline-block w-fit opacity-90 hover:opacity-100 transition-opacity self-start">
          <img src={state.sponsorLogo} alt="Sponsor" className="h-5 w-auto object-contain" />
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

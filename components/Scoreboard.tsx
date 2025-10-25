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

  const defaultHomeColor = '#3b82f6'; // blue-500
  const defaultAwayColor = '#ef4444'; // red-500
  const { penaltyShootout } = state;

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2">
      <div className="bg-black bg-opacity-60 backdrop-blur-sm p-3 rounded-lg text-white font-bold shadow-lg">
        <div className="flex items-center space-x-4 text-2xl">
          <div className="flex items-center gap-3">
            {state.homeTeam.logo && <img src={state.homeTeam.logo} alt={`${state.homeTeam.name} logo`} className="w-8 h-8 object-contain"/>}
            <span className="uppercase tracking-wider">{state.homeTeam.name.substring(0, 3)}</span>
          </div>
          <div className="px-4 py-1 bg-gray-800 rounded-md text-3xl">
            {penaltyShootout && <span className="text-xl text-gray-300">({penaltyShootout.homeScore}) </span>}
            <span style={{ color: state.homeTeam.color || defaultHomeColor }}>{state.homeStats.goals}</span>
            <span className="mx-2">-</span>
            <span style={{ color: state.awayTeam.color || defaultAwayColor }}>{state.awayStats.goals}</span>
            {penaltyShootout && <span className="text-xl text-gray-300"> ({penaltyShootout.awayScore})</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider">{state.awayTeam.name.substring(0, 3)}</span>
            {state.awayTeam.logo && <img src={state.awayTeam.logo} alt={`${state.awayTeam.name} logo`} className="w-8 h-8 object-contain"/>}
          </div>
        </div>
        <div className="mt-2 text-center text-xl text-yellow-300 flex items-center justify-center gap-2">
          {state.broadcastStatus === 'live' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-600">
                  <BroadcastIcon className="h-4 w-4 text-white/80" />
                  <span className="text-xs font-bold tracking-widest">BROADCASTING</span>
              </div>
          )}
           {state.monetization.model !== 'free' && (
              <div className="flex items-center gap-1 bg-green-600 px-2 py-0.5 rounded-md" title={`Stream Monetized: ${state.monetization.model.toUpperCase()}`}>
                  <DollarIcon className="w-4 h-4 text-green-200" />
              </div>
          )}
          <span>{formatTime(state.matchTime, state.matchPeriod)}</span>
          {state.isMatchPlaying ? <PlayIcon className="w-5 h-5 text-green-400" /> : <PauseIcon className="w-5 h-5 text-red-400" />}
        </div>
      </div>
       {state.sponsorLogo && (
        <div className="bg-black bg-opacity-60 backdrop-blur-sm px-3 py-2 rounded-lg text-white shadow-lg animate-fade-in-fast flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Sponsored by</span>
          <img src={state.sponsorLogo} alt="Sponsor" className="max-h-8 max-w-24 object-contain" />
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

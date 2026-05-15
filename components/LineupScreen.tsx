

import React, { useState, useEffect } from 'react';
import type { Team } from '../types';
import PitchDisplay from './PitchDisplay';
import { generatePreMatchHype } from '../services/geminiService';

type Coordinates = { x: number; y: number };

// Maps formation strings to an array of 11 player coordinates.
const getFormationCoordinates = (formation: string): Coordinates[] => {
  const formations: Record<string, Coordinates[]> = {
    // Goalkeeper is always first
    "4-3-3": [
      { x: 50, y: 8 },   // GK
      { x: 15, y: 28 }, { x: 40, y: 25 }, { x: 60, y: 25 }, { x: 85, y: 28 }, // DEF
      { x: 35, y: 52 }, { x: 50, y: 45 }, { x: 65, y: 52 }, // MID (V-shape with CDM)
      { x: 20, y: 78 }, { x: 50, y: 82 }, { x: 80, y: 78 }  // FWD
    ],
    "4-4-2": [
      { x: 50, y: 8 },   // GK
      { x: 15, y: 28 }, { x: 40, y: 25 }, { x: 60, y: 25 }, { x: 85, y: 28 }, // DEF
      { x: 18, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 82, y: 50 }, // MID (Flat 4)
      { x: 40, y: 78 }, { x: 60, y: 78 } // FWD
    ],
    "3-5-2": [
        { x: 50, y: 8 },   // GK
        { x: 30, y: 25 }, { x: 50, y: 23 }, { x: 70, y: 25 }, // DEF
        { x: 12, y: 48 }, { x: 35, y: 50 }, { x: 50, y: 45 }, { x: 65, y: 50 }, { x: 88, y: 48 }, // MID (Wingbacks + Triangle)
        { x: 40, y: 80 }, { x: 60, y: 80 } // FWD
    ],
    "4-2-3-1": [
        { x: 50, y: 8 },   // GK
        { x: 15, y: 28 }, { x: 40, y: 25 }, { x: 60, y: 25 }, { x: 85, y: 28 }, // DEF
        { x: 40, y: 45 }, { x: 60, y: 45 }, // Defensive Midfielders (The "2")
        { x: 20, y: 65 }, { x: 50, y: 68 }, { x: 80, y: 65 }, // Attacking Midfielders (The "3")
        { x: 50, y: 85 } // Forward (The "1")
    ],
    "5-3-2": [
        { x: 50, y: 8 },   // GK
        { x: 12, y: 35 }, { x: 33, y: 25 }, { x: 50, y: 23 }, { x: 67, y: 25 }, { x: 88, y: 35 }, // DEF (Wingbacks + 3 CBs)
        { x: 35, y: 55 }, { x: 50, y: 50 }, { x: 65, y: 55 }, // MID
        { x: 40, y: 80 }, { x: 60, y: 80 } // FWD
    ],
    "3-4-3": [
        { x: 50, y: 8 },   // GK
        { x: 30, y: 25 }, { x: 50, y: 23 }, { x: 70, y: 25 }, // DEF
        { x: 15, y: 50 }, { x: 40, y: 52 }, { x: 60, y: 52 }, { x: 85, y: 50 }, // MID (Wide players + 2 CMs)
        { x: 20, y: 80 }, { x: 50, y: 85 }, { x: 80, y: 80 } // FWD (Wide wingers)
    ]
  };
  return formations[formation] || formations["4-4-2"]; // Default to 4-4-2 if not found
};

interface TeamLineupProps {
  team: Team;
  onPlayerPositionChange: (playerNumber: number, newPosition: { x: number, y: number }) => void;
}

const TeamLineup: React.FC<TeamLineupProps> = ({ team, onPlayerPositionChange }) => (
    <div className="flex flex-col items-center gap-6 w-full">
        <div className="flex flex-col items-center gap-3 mb-4 group">
            <div className="relative">
              {team.logo && <img src={team.logo} alt={`${team.name} logo`} className="w-24 h-24 md:w-32 md:h-32 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />}
              <div className="absolute -inset-4 border border-white/5 rounded-full animate-spin-slow opacity-20" />
            </div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic" style={{ color: team.color || '#FFFFFF', textShadow: `0 0 20px ${team.color || '#FFFFFF'}80` }}>{team.name}</h2>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-display font-bold text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30 px-3 py-1 rounded-full uppercase tracking-[0.3em]">{team.formation}</p>
              {team.coachName && <p className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest">Dir: {team.coachName}</p>}
            </div>
        </div>
        
        <div className="w-full max-w-sm glass-panel border-white/10 p-4 rounded-[2rem] shadow-2xl relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
           <PitchDisplay team={team} onPlayerPositionChange={onPlayerPositionChange} />
        </div>
        
        <div className="w-full max-w-sm glass-panel border-white/5 p-4 rounded-2xl space-y-2 max-h-56 overflow-y-auto scrollbar-hide mt-2 bg-white/5">
            <h3 className="text-[10px] font-display font-bold text-center text-white/30 uppercase tracking-[0.4em] sticky top-0 bg-slate-900/90 py-2 z-10 backdrop-blur-sm border-b border-white/5 mb-2">Squad Manifest</h3>
            {team.players.map((player) => (
                <div 
                    key={player.number}
                    className="flex items-center justify-between text-base p-3 rounded-xl border border-white/5 transition-all hover:border-white/20 hover:bg-white/5 group"
                    style={{ backgroundColor: `${team.color}0D` }}
                >
                    <div className="flex items-center gap-4">
                        <span className="font-display font-black w-8 text-center text-lg italic" style={{ color: team.color || '#FFFFFF' }}>{player.number}</span>
                        {player.photo && <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />}
                        <span className="font-display font-bold text-white/80 group-hover:text-white transition-colors truncate uppercase tracking-tight">{player.name}</span>
                    </div>
                    <span className="text-[8px] font-display font-bold text-white/30 uppercase tracking-widest">{player.role}</span>
                </div>
            ))}
        </div>
    </div>
);


interface LineupScreenProps {
  homeTeam: Team;
  awayTeam: Team;
  onLineupsConfirmed: (homeTeam: Team, awayTeam: Team) => void;
  leagueName: string;
  matchDate: string;
  matchTimeOfDay: string;
  venue: string;
}

const LineupScreen: React.FC<LineupScreenProps> = ({ homeTeam, awayTeam, onLineupsConfirmed, leagueName, matchDate, matchTimeOfDay, venue }) => {
  const [hypeText, setHypeText] = useState('');
  const [isLoadingHype, setIsLoadingHype] = useState(false);
  const [hypeError, setHypeError] = useState('');
  
  const [homeTeamState, setHomeTeamState] = useState<Team>(homeTeam);
  const [awayTeamState, setAwayTeamState] = useState<Team>(awayTeam);

  useEffect(() => {
    // Initialize player positions based on formation when component mounts
    const initializeTeam = (team: Team): Team => {
        const coordinates = getFormationCoordinates(team.formation);
        const playersWithCoords = team.players.map((player, index) => ({
            ...player,
            x: coordinates[index]?.x ?? 50,
            y: coordinates[index]?.y ?? 50,
        }));
        return { ...team, players: playersWithCoords };
    };

    setHomeTeamState(initializeTeam(homeTeam));
    setAwayTeamState(initializeTeam(awayTeam));
  }, [homeTeam, awayTeam]);

  const handlePlayerPositionChange = (teamSide: 'home' | 'away', playerNumber: number, newPosition: { x: number; y: number }) => {
    const setState = teamSide === 'home' ? setHomeTeamState : setAwayTeamState;
    setState(prevTeam => ({
        ...prevTeam,
        players: prevTeam.players.map(p => 
            p.number === playerNumber ? { ...p, x: newPosition.x, y: newPosition.y } : p
        )
    }));
  };

  const handleGenerateHype = async () => {
    setIsLoadingHype(true);
    setHypeError('');
    setHypeText('');
    try {
      const text = await generatePreMatchHype(homeTeamState, awayTeamState);
      setHypeText(text);
    } catch (error: unknown) {
      setHypeError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingHype(false);
    }
  };

  const formattedDate = matchDate ? new Date(matchDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pitch-background animate-fade-in relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-emerald/5 blur-[120px] rounded-full" />
          <div className="scanline opacity-10" />
        </div>

        <div className="absolute top-8 left-8 flex flex-col items-start z-20">
            <h1 className="text-4xl font-display font-black text-neon-cyan uppercase tracking-tighter italic">BolaVision</h1>
            <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.5em] mt-1">Tactical Interface v4.0</p>
        </div>

        <div className="w-full max-w-7xl glass-panel border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-8 md:p-12 rounded-[3rem] relative z-10 mt-16">
            <div className="text-center mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" />
                <div className="relative z-10 bg-slate-950/50 backdrop-blur-md inline-block px-8 py-2 rounded-full border border-white/5 mb-4">
                  {leagueName && <p className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.4em]">{leagueName}{venue && ` // ${venue}`}</p>}
                </div>
                <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-widest italic relative z-10">SQUAD DEPLOYMENT</h1>
                {(formattedDate || matchTimeOfDay) && <p className="text-xs font-display font-bold text-neon-cyan uppercase tracking-[0.3em] mt-4 opacity-70">{formattedDate} // {matchTimeOfDay}</p>}
                 <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 text-neon-cyan animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_10px_rgba(0,243,255,1)]" />
                   <p className="text-[10px] font-display font-bold uppercase tracking-widest">Manual Override: Drag units to re-position</p>
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <TeamLineup team={homeTeamState} onPlayerPositionChange={(num, pos) => handlePlayerPositionChange('home', num, pos)} />
                <TeamLineup team={awayTeamState} onPlayerPositionChange={(num, pos) => handlePlayerPositionChange('away', num, pos)} />
            </div>
        </div>

        <div className="w-full max-w-3xl mt-8 flex flex-col items-center gap-6 glass-panel border-white/10 p-8 rounded-[2rem] relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-neon-cyan" />
              <h2 className="text-xl font-display font-black text-white uppercase tracking-[0.3em]">Neural Analysis</h2>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-neon-cyan" />
            </div>
            
            <button 
              onClick={handleGenerateHype} 
              disabled={isLoadingHype}
              className="glass-panel border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 text-neon-cyan font-display font-black uppercase tracking-[0.2em] py-4 px-10 rounded-2xl transition-all hover:scale-105 hover:border-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.1)] disabled:opacity-50 disabled:cursor-wait flex items-center gap-3"
            >
              {isLoadingHype ? (
                <>
                  <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">⚡</span>
                  <span>Synthesize AI Intel</span>
                </>
              )}
            </button>
            
            {hypeText && (
                <div className="mt-4 relative group animate-fade-in-fast w-full">
                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan/20 to-transparent blur opacity-50" />
                    <blockquote className="relative p-6 glass-panel border-white/10 bg-white/5 rounded-2xl italic">
                        <p className="text-lg font-body text-white/90 leading-relaxed tracking-wide">"{hypeText}"</p>
                        <footer className="text-right text-[10px] font-display font-bold text-white/30 uppercase tracking-widest mt-4">— BolaVision Neural Pundit v2.4</footer>
                    </blockquote>
                </div>
            )}
            {hypeError && (
                <p className="mt-4 text-neon-yellow text-[10px] font-display font-bold uppercase tracking-widest animate-pulse">{hypeError}</p>
            )}
        </div>

        <div className="w-full max-w-7xl mt-12 mb-12 flex flex-col items-center gap-2 relative z-10">
            <button 
              onClick={() => onLineupsConfirmed(homeTeamState, awayTeamState)} 
              className="glass-panel border-white/10 bg-white/5 hover:bg-white/10 text-white font-display font-black uppercase tracking-[0.3em] py-5 px-16 text-lg rounded-3xl transition-all hover:scale-105 hover:border-neon-cyan hover:text-neon-cyan shadow-[0_20px_50px_rgba(0,0,0,0.5)] group"
            >
                Initialize Calibration
                <span className="ml-4 opacity-30 group-hover:opacity-100 transition-opacity">→</span>
            </button>
        </div>
    </div>
  );
};

export default LineupScreen;

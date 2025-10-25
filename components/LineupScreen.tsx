

import React, { useState, useEffect } from 'react';
import type { Team, Player } from '../types';
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
    <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex flex-col items-center gap-2 mb-4">
            {team.logo && <img src={team.logo} alt={`${team.name} logo`} className="w-24 h-24 object-contain" />}
            <h2 className="text-3xl font-bold text-center" style={{ color: team.color || '#FFFFFF' }}>{team.name}</h2>
            <p className="text-lg text-gray-300 font-semibold bg-black/30 px-3 py-1 rounded-full">{team.formation}</p>
            {team.coachName && <p className="text-md text-gray-400 mt-1">Coach: {team.coachName}</p>}
        </div>
        
        <div className="w-full max-w-sm">
           <PitchDisplay team={team} onPlayerPositionChange={onPlayerPositionChange} />
        </div>
        
        <div className="w-full max-w-sm bg-black/20 p-3 rounded-lg space-y-2 max-h-48 overflow-y-auto mt-2">
            <h3 className="font-semibold text-center text-gray-300 sticky top-0 bg-black/50 py-1">Full Roster</h3>
            {team.players.map((player, index) => (
                <div 
                    key={player.number}
                    className="flex items-center justify-between text-base p-2 rounded"
                    style={{ backgroundColor: `${team.color}20` }}
                >
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-bold w-8 text-center" style={{ color: team.color || '#FFFFFF' }}>#{player.number}</span>
                        <span className="font-semibold truncate">{player.name}</span>
                    </div>
                    <span className="text-sm text-gray-300">{player.role}</span>
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
    } catch (error: any) {
      setHypeError(error.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingHype(false);
    }
  };

  const formattedDate = matchDate ? new Date(matchDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pitch-background animate-fade-in relative">
        <h1 className="absolute top-6 left-6 text-3xl font-bold opacity-80" style={{ color: '#00e676' }}>BolaVision</h1>
        <div className="w-full max-w-7xl bg-black/50 backdrop-blur-md rounded-xl shadow-2xl p-8">
            <div className="text-center mb-6">
                {leagueName && <p className="text-xl font-semibold text-gray-300">{leagueName}{venue && ` | ${venue}`}</p>}
                <h1 className="text-4xl font-extrabold text-yellow-300 tracking-wider uppercase">Match Day Lineups</h1>
                {(formattedDate || matchTimeOfDay) && <p className="text-lg text-gray-400">{formattedDate} - {matchTimeOfDay}</p>}
                 <p className="text-sm text-cyan-300 mt-2">Hint: You can drag players on the pitch to adjust their positions!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <TeamLineup team={homeTeamState} onPlayerPositionChange={(num, pos) => handlePlayerPositionChange('home', num, pos)} />
                <TeamLineup team={awayTeamState} onPlayerPositionChange={(num, pos) => handlePlayerPositionChange('away', num, pos)} />
            </div>
        </div>

        <div className="w-full max-w-3xl mt-6 flex flex-col items-center gap-4 bg-black/50 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-yellow-300">Pre-Match Buzz</h2>
            <button 
              onClick={handleGenerateHype} 
              disabled={isLoadingHype}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-wait"
            >
              {isLoadingHype ? 'Pundit is Thinking...' : '⚡ Generate AI Banter'}
            </button>
            {hypeText && (
                <blockquote className="mt-4 p-4 border-l-4 border-yellow-400 bg-gray-800/50 rounded-r-lg animate-fade-in-fast">
                    <p className="text-lg italic text-gray-200">"{hypeText}"</p>
                    <footer className="text-right text-sm text-gray-400 mt-2">- BolaVision AI Pundit</footer>
                </blockquote>
            )}
            {hypeError && (
                <p className="mt-4 text-red-400 text-center">{hypeError}</p>
            )}
        </div>

        <div className="w-full max-w-7xl mt-6 flex flex-col items-center gap-2">
            <button onClick={() => onLineupsConfirmed(homeTeamState, awayTeamState)} className="bg-green-600 hover:bg-green-700 font-bold py-3 px-8 text-lg rounded-lg transition-transform transform hover:scale-105">
                Proceed to Calibration
            </button>
        </div>
    </div>
  );
};

export default LineupScreen;

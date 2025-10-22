import React, { useEffect } from 'react';
import type { Team } from '../types';

interface FormationDisplayProps {
    homeTeam: Team;
    awayTeam: Team;
    onClose: () => void;
}

const FormationDisplay: React.FC<FormationDisplayProps> = ({ homeTeam, awayTeam, onClose }) => {

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 15000); // Auto-close after 15 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const PlayerMarker: React.FC<{ player: any, color: string }> = ({ player, color }) => (
        <div 
            className="absolute flex flex-col items-center group"
            style={{ top: `${player.y}%`, left: `${player.x}%`, transform: 'translate(-50%, -50%)' }}
        >
            <div 
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm text-white border-2 border-black/50 shadow-lg" 
                style={{ backgroundColor: color }}
            >
                {player.number}
            </div>
            <div className="mt-1 px-2 py-0.5 bg-black/70 text-white text-xs rounded-md whitespace-nowrap">
                {player.name}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="w-full max-w-4xl bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl text-white border-2 border-gray-700 overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                <header className="text-center p-4 border-b-2 border-gray-700">
                    <h1 className="text-3xl font-extrabold text-yellow-300 tracking-wider uppercase">Starting Lineups</h1>
                </header>
                
                <main className="grid grid-cols-1 md:grid-cols-2">
                    <div className="flex flex-col items-center p-4">
                        {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-16 h-16 object-contain" />}
                        <h2 className="text-2xl font-bold mt-2" style={{color: homeTeam.color}}>{homeTeam.name}</h2>
                        <p className="font-semibold text-gray-300">{homeTeam.formation}</p>
                    </div>
                     <div className="flex flex-col items-center p-4 border-t-2 md:border-t-0 md:border-l-2 border-gray-700">
                        {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-16 h-16 object-contain" />}
                        <h2 className="text-2xl font-bold mt-2" style={{color: awayTeam.color}}>{awayTeam.name}</h2>
                        <p className="font-semibold text-gray-300">{awayTeam.formation}</p>
                    </div>
                </main>

                <div className="relative aspect-[2/1.3] w-full pitch-background border-y-2 border-gray-700">
                    {/* Home Team Players (Bottom Half) */}
                    {homeTeam.players.slice(0, 11).map(p => (
                        <PlayerMarker key={`home-${p.number}`} player={p} color={homeTeam.color || '#3b82f6'} />
                    ))}
                    
                    {/* Away Team Players (Top Half, Y-flipped) */}
                    {awayTeam.players.slice(0, 11).map(p => (
                        <PlayerMarker 
                            key={`away-${p.number}`}
                            player={{ ...p, y: 100 - (p.y || 50) }}
                            color={awayTeam.color || '#ef4444'}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FormationDisplay;
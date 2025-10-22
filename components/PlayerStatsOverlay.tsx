import React, { useState, useMemo } from 'react';
import { useMatchContext } from '../context/MatchContext';
import type { Player, PlayerStats } from '../types';

interface PlayerStatsOverlayProps {
    isVisible: boolean;
    onClose: () => void;
}

const StatRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 px-3 bg-gray-700/50 rounded">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-white font-bold text-lg">{value}</span>
    </div>
);

const PlayerStatsOverlay: React.FC<PlayerStatsOverlayProps> = ({ isVisible, onClose }) => {
    const { state } = useMatchContext();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const allPlayers = useMemo(() => [
        ...state.homeTeam.players.map(p => ({ ...p, team: state.homeTeam, side: 'home' })),
        ...state.awayTeam.players.map(p => ({ ...p, team: state.awayTeam, side: 'away' }))
    ], [state.homeTeam, state.awayTeam]);

    const filteredPlayers = useMemo(() =>
        allPlayers.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.number.toString().includes(searchTerm)
        ).sort((a, b) => a.name.localeCompare(b.name)),
    [allPlayers, searchTerm]);
    
    const selectedPlayer = useMemo(() => {
        if (!selectedPlayerId) return null;
        return allPlayers.find(p => `${p.side}-${p.number}` === selectedPlayerId);
    }, [selectedPlayerId, allPlayers]);
    
    if (!isVisible) return null;

    const playerRoleStats: (keyof PlayerStats)[] = selectedPlayer?.role === 'Goalkeeper'
        ? ['saves', 'passes', 'goals']
        : ['goals', 'assists', 'shots', 'passes', 'tackles'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] text-white border border-gray-700 overflow-hidden flex" onClick={e => e.stopPropagation()}>
                {/* Player List */}
                <div className="w-1/3 border-r border-gray-700 flex flex-col">
                    <div className="p-3 border-b border-gray-700">
                         <input
                            type="text"
                            placeholder="Find player..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 text-white rounded p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {filteredPlayers.map(player => (
                            <li key={`${player.side}-${player.number}`} onClick={() => setSelectedPlayerId(`${player.side}-${player.number}`)}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition ${selectedPlayerId === `${player.side}-${player.number}` ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border-2" style={{ backgroundColor: player.team.color, borderColor: 'rgba(255,255,255,0.5)' }}>
                                    {player.number}
                                </div>
                                <div className="flex-1 truncate">
                                    <p className="font-semibold">{player.name}</p>
                                    <p className="text-xs text-gray-400">{player.team.name}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                
                {/* Stats Display */}
                <div className="w-2/3 p-6 flex flex-col">
                    <div className="flex justify-end mb-4 flex-shrink-0">
                       <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                    </div>
                    {selectedPlayer ? (
                        <div className="flex flex-col items-center text-center animate-fade-in-fast flex-grow overflow-y-auto">
                            <img src={selectedPlayer.photo || `https://ui-avatars.com/api/?name=${selectedPlayer.name.replace(' ', '+')}&background=random&size=128`} alt={selectedPlayer.name} className="w-28 h-28 rounded-full object-cover border-4" style={{ borderColor: selectedPlayer.team.color }} />
                            <h2 className="text-3xl font-bold mt-3">{selectedPlayer.name}</h2>
                            <p className="text-6xl font-black text-gray-500 -mt-2">{selectedPlayer.number}</p>
                            <div className="flex items-center gap-2 mb-4">
                                {selectedPlayer.team.logo && <img src={selectedPlayer.team.logo} alt={selectedPlayer.team.name} className="w-6 h-6 object-contain" />}
                                <p className="font-semibold" style={{ color: selectedPlayer.team.color }}>{selectedPlayer.team.name}</p>
                            </div>
                            
                            <div className="w-full max-w-sm mt-4 space-y-2">
                                {playerRoleStats.map(statKey => (
                                    <StatRow key={statKey} label={statKey.replace(/([A-Z])/g, ' $1').toUpperCase()} value={selectedPlayer.stats[statKey]} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select a player to view their stats.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerStatsOverlay;

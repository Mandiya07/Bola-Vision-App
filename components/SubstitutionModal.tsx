import React, { useState, useEffect, useMemo } from 'react';
import { useMatchContext } from '../context/MatchContext';
import type { Player } from '../types';

interface SubstitutionModalProps {
    onClose: () => void;
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = ({ onClose }) => {
    const { state, dispatch, processGameEventWithCommentary } = useMatchContext();
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
    const [playerOutNumber, setPlayerOutNumber] = useState<string | undefined>(
        state.homeTeam.players.length > 0 ? state.homeTeam.players[0].number.toString() : undefined
    );

    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState('');
    const [newPlayerRole, setNewPlayerRole] = useState<Player['role']>('Forward');
    const [error, setError] = useState('');
    const [playerSearch, setPlayerSearch] = useState('');
    
    const teamData = useMemo(() => 
        selectedTeam === 'home' ? state.homeTeam : state.awayTeam,
        [selectedTeam, state.homeTeam, state.awayTeam]
    );
    const roles: Player['role'][] = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

    const filteredPlayers = useMemo(() => teamData.players.filter(p =>
        p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
        p.number.toString().includes(playerSearch)
    ), [teamData.players, playerSearch]);

    useEffect(() => {
        const isCurrentSelectionValid = filteredPlayers.some(p => p.number.toString() === playerOutNumber);

        if (!isCurrentSelectionValid && filteredPlayers.length > 0) {
            setPlayerOutNumber(filteredPlayers[0].number.toString());
        } else if (filteredPlayers.length === 0) {
            setPlayerOutNumber(undefined);
        }
    }, [filteredPlayers, playerOutNumber]);

    const handleTeamChange = (team: 'home' | 'away') => {
        setSelectedTeam(team);
        const newTeamPlayers = team === 'home' ? state.homeTeam.players : state.awayTeam.players;
        setPlayerOutNumber(newTeamPlayers.length > 0 ? newTeamPlayers[0].number.toString() : undefined);
        setPlayerSearch('');
    }
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const playerOut = teamData.players.find(p => p.number.toString() === playerOutNumber);
        const num = parseInt(newPlayerNumber, 10);

        if (!playerOut) {
            setError("Select a player to substitute.");
            return;
        }
        if (!newPlayerName.trim()) {
            setError("New player's name cannot be empty.");
            return;
        }
        if (isNaN(num) || num <= 0) {
            setError("Invalid player number.");
            return;
        }

        const allPlayers = [...state.homeTeam.players, ...state.awayTeam.players];
        if (allPlayers.some(p => p.number === num)) {
            setError(`Player number ${num} is already in use.`);
            return;
        }
        
        const playerIn: Player = { 
            name: newPlayerName, 
            number: num, 
            role: newPlayerRole,
            stats: { goals: 0, assists: 0, shots: 0, passes: 0, tackles: 0, saves: 0 }
        };

        // Dispatch state update to context
        dispatch({ type: 'SUBSTITUTE_PLAYER', payload: { team: selectedTeam, playerIn, playerOut } });
        
        // Process event for commentary
        processGameEventWithCommentary({
            id: Date.now(),
            matchTime: state.matchTime,
            type: 'SUBSTITUTION',
            teamName: teamData.name,
            playerIn,
            playerOut
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-11/12 max-w-lg p-6 text-white" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-orange-400">Make a Substitution</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-4xl leading-none">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Team</label>
                        <select
                            value={selectedTeam}
                            onChange={(e) => handleTeamChange(e.target.value as 'home' | 'away')}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="home">{state.homeTeam.name}</option>
                            <option value="away">{state.awayTeam.name}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Player Off</label>
                        <input
                            type="text"
                            placeholder="Find player by name or number..."
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-orange-500 mb-2"
                            disabled={teamData.players.length === 0}
                         />
                         <select
                            value={playerOutNumber || ''}
                            onChange={(e) => setPlayerOutNumber(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-orange-500"
                            disabled={filteredPlayers.length === 0}
                        >
                            {filteredPlayers.length === 0 ? (
                                <option value="">No matching players</option>
                            ) : (
                                filteredPlayers.map(p => (
                                    <option key={p.number} value={p.number.toString()}>#{p.number} {p.name}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="border-t border-gray-600 pt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Player On</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="number"
                                placeholder="No."
                                value={newPlayerNumber}
                                onChange={e => setNewPlayerNumber(e.target.value)}
                                className="w-20 bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-green-500"
                            />
                            <input
                                type="text"
                                placeholder="Player Name"
                                value={newPlayerName}
                                onChange={e => setNewPlayerName(e.target.value)}
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                         <select
                            value={newPlayerRole}
                            onChange={(e) => setNewPlayerRole(e.target.value as Player['role'])}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-green-500"
                        >
                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-700 font-bold py-3 rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                            disabled={teamData.players.length === 0}
                        >
                            Confirm Substitution
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubstitutionModal;

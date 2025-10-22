import React, { useMemo, useEffect, useState } from 'react';
import type { Player, Team } from '../types';

interface PlayerSelectorProps {
  homeTeam: Team;
  awayTeam: Team;
  selectedTeam: 'home' | 'away';
  onTeamChange: (team: 'home' | 'away') => void;
  selectedPlayer: Player | undefined;
  onPlayerChange: (player: Player | undefined) => void;
  disabled: boolean;
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  homeTeam,
  awayTeam,
  selectedTeam,
  onTeamChange,
  selectedPlayer,
  onPlayerChange,
  disabled,
}) => {
  const [playerSearch, setPlayerSearch] = useState('');

  const currentTeamPlayers = useMemo(() => 
    selectedTeam === 'home' ? homeTeam.players : awayTeam.players,
    [selectedTeam, homeTeam.players, awayTeam.players]
  );

  const filteredPlayers = useMemo(() => currentTeamPlayers.filter(p =>
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    p.number.toString().includes(playerSearch)
  ), [currentTeamPlayers, playerSearch]);

  useEffect(() => {
    // Reset search when team changes
    setPlayerSearch('');
  }, [selectedTeam]);

  useEffect(() => {
    // If the selected player is not in the filtered list (due to search or team change), update the selection
    const isSelectedPlayerInFilteredList = filteredPlayers.some(p => p.number === selectedPlayer?.number);
    if (!isSelectedPlayerInFilteredList) {
      onPlayerChange(filteredPlayers[0] || undefined);
    }
  }, [filteredPlayers, selectedPlayer, onPlayerChange]);

  const handleSelectPlayer = (playerNumberStr: string) => {
    if (!playerNumberStr) {
      onPlayerChange(undefined);
      return;
    }
    const player = currentTeamPlayers.find(p => p.number.toString() === playerNumberStr);
    onPlayerChange(player);
  }

  return (
    <div className="flex justify-center items-start gap-4 px-2 bg-gray-800/50 p-2 rounded-lg">
      <div className="flex-1 flex flex-col justify-center items-center gap-1">
        <label className="text-gray-300 font-semibold text-sm">Team:</label>
        <select value={selectedTeam} onChange={(e) => onTeamChange(e.target.value as 'home' | 'away')} className="w-full max-w-xs bg-gray-700 text-white rounded p-1 border border-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm" disabled={disabled}>
          <option value="home">{homeTeam.name}</option>
          <option value="away">{awayTeam.name}</option>
        </select>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center gap-1">
        <label className="text-gray-300 font-semibold text-sm">Player:</label>
        <input
          type="text"
          placeholder="Find by name/no."
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          className="w-full max-w-xs bg-gray-900 text-white rounded p-1 border border-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm text-center"
          disabled={currentTeamPlayers.length === 0 || disabled}
        />
        <select value={selectedPlayer?.number?.toString() ?? ''} onChange={(e) => handleSelectPlayer(e.target.value)} className="w-full max-w-xs bg-gray-700 text-white rounded p-1 border border-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm" disabled={filteredPlayers.length === 0 || disabled}>
          {filteredPlayers.length === 0 ? (
            <option value="">No matching players</option>
          ) : (
            filteredPlayers.map(p => <option key={p.number} value={p.number.toString()}>#{p.number} {p.name}</option>)
          )}
        </select>
      </div>
    </div>
  );
};

export default PlayerSelector;

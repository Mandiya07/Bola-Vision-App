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
    const timer = setTimeout(() => setPlayerSearch(''), 0);
    return () => clearTimeout(timer);
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
    <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 px-4 glass-panel border-white/5 p-4 rounded-2xl">
      <div className="flex-1 flex flex-col gap-2">
        <label className="text-white/40 font-display font-bold text-[10px] uppercase tracking-[0.2em] ml-1">Team Designation</label>
        <select 
          value={selectedTeam} 
          onChange={(e) => onTeamChange(e.target.value as 'home' | 'away')} 
          className="w-full glass-panel border-white/10 text-white rounded-xl p-2.5 font-display font-bold text-xs uppercase tracking-wider focus:border-neon-cyan outline-none transition-all cursor-pointer appearance-none bg-slate-900/40" 
          disabled={disabled}
        >
          <option value="home">{homeTeam.name}</option>
          <option value="away">{awayTeam.name}</option>
        </select>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <label className="text-white/40 font-display font-bold text-[10px] uppercase tracking-[0.2em] ml-1">Subject Identification</label>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="SCAN BY NAME / NO."
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
            className="w-full glass-panel border-white/10 text-white rounded-xl p-2.5 font-display font-bold text-[10px] uppercase tracking-widest focus:border-neon-cyan outline-none transition-all placeholder:text-white/20 bg-slate-900/40"
            disabled={currentTeamPlayers.length === 0 || disabled}
          />
          <select 
            value={selectedPlayer?.number?.toString() ?? ''} 
            onChange={(e) => handleSelectPlayer(e.target.value)} 
            className="w-full glass-panel border-white/10 text-white rounded-xl p-2.5 font-display font-bold text-xs uppercase tracking-wider focus:border-neon-cyan outline-none transition-all cursor-pointer appearance-none bg-slate-900/40" 
            disabled={filteredPlayers.length === 0 || disabled}
          >
            {filteredPlayers.length === 0 ? (
              <option value="">NO MATCHING SUBJECTS</option>
            ) : (
              filteredPlayers.map(p => <option key={p.number} value={p.number.toString()}>#{p.number} {p.name}</option>)
            )}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PlayerSelector;

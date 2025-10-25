import React, { useState, MouseEvent } from 'react';
import type { Team, Player } from '../types';

interface PitchDisplayProps {
  team: Team;
  onPlayerPositionChange: (playerNumber: number, newPosition: { x: number, y: number }) => void;
}

const PitchDisplay: React.FC<PitchDisplayProps> = ({ team, onPlayerPositionChange }) => {
  const [draggedPlayer, setDraggedPlayer] = useState<number | null>(null);

  const playersOnPitch = team.players.slice(0, 11);
  const teamColor = team.color || '#FFFFFF';
  
  const handleMouseDown = (e: MouseEvent, playerNumber: number) => {
    e.preventDefault();
    setDraggedPlayer(playerNumber);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggedPlayer === null) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values to stay within the pitch boundaries
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    onPlayerPositionChange(draggedPlayer, { x, y });
  };
  
  const handleMouseUp = () => {
    setDraggedPlayer(null);
  };

  return (
    <div 
        className="aspect-[7/10] w-full bg-green-700/50 border-2 border-white/30 rounded-lg p-2 relative overflow-hidden" 
        style={{ background: 'radial-gradient(ellipse at center, #2e7d32, #1b5e20)' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      {/* Pitch Markings */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border-2 border-white/30 rounded-b-lg border-t-0"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border-2 border-white/30 rounded-t-lg border-b-0"></div>
      <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square border-2 border-white/30 rounded-full"></div>

      {/* Players */}
      {playersOnPitch.map(player => (
        <div 
          key={player.number} 
          className={`absolute group transition-transform duration-100 ${draggedPlayer === player.number ? 'scale-125 z-20' : 'z-10'}`}
          style={{ top: `${player.y}%`, left: `${player.x}%`, transform: 'translate(-50%, -50%)' }}
          onMouseDown={(e) => handleMouseDown(e, player.number)}
        >
          <div 
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 border-black/50 shadow-lg transition-transform group-hover:scale-125 ${draggedPlayer === player.number ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ backgroundColor: teamColor }}
          >
            {player.number}
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {player.name} - {player.role}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PitchDisplay;

import React from 'react';
import type { Player } from '../types';
import { TrophyIcon } from './icons/ControlIcons';

interface PlayerOfTheMatchGraphicProps {
  player: Player;
  team: { name: string; logo?: string; color?: string };
  reasoning: string;
}

const PlayerOfTheMatchGraphic: React.FC<PlayerOfTheMatchGraphicProps> = ({ player, team, reasoning }) => {
  const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=EAB308&color=000&size=256`;
  const teamColor = team.color || '#EAB308'; // Default to gold

  return (
    <div className="relative w-full max-w-sm mx-auto bg-gray-900 border-2 border-yellow-400 rounded-xl shadow-2xl p-6 flex flex-col items-center text-center animate-fade-in-up"
         style={{
             background: `radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.9) 70%), linear-gradient(45deg, ${teamColor}1A, #000000 60%)`,
             boxShadow: `0 0 30px ${teamColor}40`,
         }}
    >
        <div className="absolute top-0 -translate-y-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <TrophyIcon className="w-5 h-5" />
            Player of the Match
        </div>

        <img
            src={playerPhoto}
            alt={player.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 mb-4"
        />

        <h2 className="text-3xl font-black text-white leading-tight">{player.name}</h2>
        <p className="text-5xl font-black text-white/50 -mt-2 mb-2">{player.number}</p>

        <div className="flex items-center gap-2 mb-4">
            {team.logo && <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain" />}
            <p className="text-lg font-semibold" style={{ color: teamColor }}>{team.name}</p>
        </div>

        <div className="w-full border-t border-yellow-400/30 pt-3">
            <p className="text-yellow-100 italic">"{reasoning}"</p>
            <p className="text-xs text-yellow-400/60 mt-2">- AI Analyst</p>
        </div>
    </div>
  );
};

export default PlayerOfTheMatchGraphic;

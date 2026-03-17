import React, { useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { GameEventType } from '../types';

const getEventTypeDisplay = (type: GameEventType) => {
    switch(type) {
        case 'SHOT_ON_TARGET': return 'SHOT ON TARGET';
        case 'SHOT_OFF_TARGET': return 'SHOT';
        case 'SAVE': return 'SAVE';
        case 'TACKLE': return 'TACKLE';
        case 'ASSIST': return 'ASSIST';
        default: return '';
    }
}

const PlayerStatPopup: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const { playerStatGraphic } = state;

    useEffect(() => {
        if (playerStatGraphic) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_PLAYER_STAT_GRAPHIC' });
            }, 8000); // Display for 8 seconds

            return () => clearTimeout(timer);
        }
    }, [playerStatGraphic, dispatch]);

    if (!playerStatGraphic) {
        return null;
    }

    const { player, team: teamSide, eventType } = playerStatGraphic;
    const team = teamSide === 'home' ? state.homeTeam : state.awayTeam;
    const eventDisplay = getEventTypeDisplay(eventType);

    const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=random&size=256`;

    return (
        <div className="absolute bottom-24 left-4 w-full max-w-[320px] z-40 pointer-events-none animate-fade-in-up md:bottom-8 md:left-8">
            <div 
              key={player.number + eventType} // Re-trigger animation if same player has a new event
              className="relative glass-panel border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-out bg-slate-950/90"
              style={{ borderLeft: `4px solid ${team.color || '#fff'}`, animationDelay: '7.5s', animationFillMode: 'forwards' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center p-4 gap-4 text-white relative z-10">
                    {/* Player Photo */}
                    <div className="flex-shrink-0 relative">
                         <img src={playerPhoto} alt={player.name} className="w-20 h-20 object-cover rounded-xl grayscale brightness-110 border border-white/10" />
                         <div className="absolute inset-0 bg-neon-cyan/5 mix-blend-overlay rounded-xl" />
                         <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-neon-cyan opacity-50" />
                         <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-neon-cyan opacity-50" />
                    </div>
                    
                    {/* Player Info & Stats */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                           <h2 className="text-lg font-display font-black leading-tight truncate uppercase tracking-tight">{player.name}</h2>
                           <span className="text-xl font-display font-black text-white/20 italic">{player.number}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                           {team.logo && <img src={team.logo} alt={team.name} className="w-4 h-4 object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />}
                           <p className="text-[10px] font-display font-bold uppercase tracking-widest opacity-70 truncate" style={{color: team.color || '#fff'}}>{team.name}</p>
                        </div>

                        {/* Stats grid - Digital Readout Style */}
                        <div className="grid grid-cols-3 gap-2 text-[8px] font-display font-bold uppercase tracking-widest">
                           <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex flex-col items-center">
                             <span className="text-xs text-neon-cyan mb-0.5">{player.stats.goals}</span>
                             <p className="opacity-40">GLS</p>
                           </div>
                           <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex flex-col items-center">
                             <span className="text-xs text-neon-cyan mb-0.5">{player.stats.assists}</span>
                             <p className="opacity-40">AST</p>
                           </div>
                           <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex flex-col items-center">
                             <span className="text-xs text-neon-cyan mb-0.5">{player.stats.shots}</span>
                             <p className="opacity-40">SHT</p>
                           </div>
                        </div>
                    </div>
                </div>

                {/* Event Banner - Futuristic Style */}
                <div className="absolute top-0 right-0 bg-neon-cyan/20 border-l border-b border-neon-cyan/30 text-neon-cyan py-1 px-3 rounded-bl-xl">
                    <span className="text-[8px] font-display font-black uppercase tracking-[0.2em]">{eventDisplay}</span>
                </div>
                
                {/* Decorative scanning line */}
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon-cyan/20 overflow-hidden">
                  <div className="w-1/3 h-full bg-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.5)] animate-scanline-horizontal" />
                </div>
            </div>
        </div>
    );
};

export default PlayerStatPopup;

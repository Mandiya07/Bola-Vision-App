import React, { useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { GameEventType } from '../types';

const getEventTypeDisplay = (type: GameEventType) => {
    switch(type) {
        case 'GOAL': return 'GOAL!';
        case 'YELLOW_CARD': return 'YELLOW CARD';
        case 'RED_CARD': return 'RED CARD';
        default: return '';
    }
}

const getEventColors = (type: GameEventType): { bg: string, text: string } => {
    switch(type) {
        case 'GOAL': return { bg: 'bg-yellow-400', text: 'text-black' };
        case 'YELLOW_CARD': return { bg: 'bg-yellow-400', text: 'text-black' };
        case 'RED_CARD': return { bg: 'bg-red-500', text: 'text-white' };
        default: return { bg: 'bg-gray-500', text: 'text-white' };
    }
}

const PlayerGraphic: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const { playerGraphicEvent } = state;

    useEffect(() => {
        if (playerGraphicEvent) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_PLAYER_GRAPHIC' });
            }, 7000); // Display for 7 seconds

            return () => clearTimeout(timer);
        }
    }, [playerGraphicEvent, dispatch]);

    if (!playerGraphicEvent) {
        return null;
    }

    const { player, team: teamSide, eventType } = playerGraphicEvent;
    const team = teamSide === 'home' ? state.homeTeam : state.awayTeam;
    const eventDisplay = getEventTypeDisplay(eventType);
    const eventColors = getEventColors(eventType);

    // Fallback for photo using a UI avatar service
    const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=random&size=256`;

    return (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-lg h-40 z-40 pointer-events-none animate-fade-in-up">
            <div className="relative w-full h-full glass-panel border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 opacity-90" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50" />
                
                {/* Team color accent bar */}
                <div className="absolute right-0 top-0 bottom-0 w-1.5 shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ backgroundColor: team.color || '#fff' }}></div>

                <div className="relative w-full h-full flex items-center p-6 gap-6">
                    {/* Player Photo with Scan Effect */}
                    <div className="relative flex-shrink-0 w-28 h-28 rounded-2xl border-2 overflow-hidden group" style={{ borderColor: `${team.color || '#fff'}4D` }}>
                         <img src={playerPhoto} alt={player.name} className="w-full h-full object-cover grayscale brightness-125 contrast-125" />
                         <div className="absolute inset-0 bg-neon-cyan/10 mix-blend-overlay" />
                         {/* Scanline animation on photo */}
                         <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan/40 shadow-[0_0_10px_rgba(0,243,255,0.5)] animate-scanline-fast" />
                         {/* Corner markers */}
                         <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-neon-cyan" />
                         <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-neon-cyan" />
                         <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-neon-cyan" />
                         <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-neon-cyan" />
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 flex flex-col justify-center text-white min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-display font-bold text-neon-cyan uppercase tracking-[0.3em] px-1.5 py-0.5 border border-neon-cyan/30 rounded bg-neon-cyan/10">Active Subject</span>
                            <p className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.2em]">{player.role}</p>
                        </div>
                        <h2 className="text-3xl font-display font-black leading-none truncate uppercase tracking-tight mb-2">
                            {player.name}
                        </h2>
                        <div className="flex items-center gap-3">
                           {team.logo && <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />}
                           <p className="text-sm font-display font-bold text-white/70 uppercase tracking-widest truncate">{team.name}</p>
                        </div>
                    </div>
                    
                    {/* Number and Event */}
                    <div className="flex flex-col items-end justify-between h-full py-1">
                        <div className="text-6xl font-display font-black italic leading-none" style={{ color: team.color || '#fff', textShadow: `0 0 20px ${team.color || '#fff'}80` }}>
                            {player.number}
                        </div>
                        <div className={`px-4 py-1.5 rounded-lg text-[10px] font-display font-black uppercase tracking-[0.2em] border shadow-[0_0_15px_rgba(0,0,0,0.3)] ${eventColors.bg} ${eventColors.text} ${eventType === 'GOAL' ? 'animate-pulse' : ''}`}>
                            {eventDisplay}
                        </div>
                    </div>
                </div>

                {/* Decorative UI elements */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-30">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-white rounded-full" />
                  ))}
                </div>
            </div>
        </div>
    );
};

export default PlayerGraphic;

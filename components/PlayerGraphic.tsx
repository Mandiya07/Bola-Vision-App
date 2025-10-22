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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md h-32 z-30 pointer-events-none animate-fade-in-up">
            <div className="relative w-full h-full" style={{ filter: `drop-shadow(0 10px 8px rgba(0, 0, 0, 0.5))` }}>
                {/* Background with team color accent */}
                <div 
                    className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm rounded-lg"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%)' }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-2" style={{ backgroundColor: team.color || '#fff' }}></div>
                </div>

                <div className="relative w-full h-full flex items-center p-4 gap-4">
                    {/* Player Photo */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-full border-4" style={{ borderColor: team.color || '#fff' }}>
                         <img src={playerPhoto} alt={player.name} className="w-full h-full object-cover rounded-full" />
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 flex flex-col justify-center text-white min-w-0">
                        <p className="text-sm font-semibold opacity-80">{player.role}</p>
                        <h2 className="text-2xl font-bold leading-tight truncate">{player.name}</h2>
                        <div className="flex items-center gap-2">
                           {team.logo && <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain" />}
                           <p className="text-lg font-semibold opacity-90 truncate">{team.name}</p>
                        </div>
                    </div>
                    
                    {/* Number and Event */}
                    <div className="flex flex-col items-end justify-between h-full">
                        <div className="text-5xl font-black" style={{ color: team.color || '#fff', WebkitTextStroke: '1px black' }}>
                            {player.number}
                        </div>
                        <div className={`px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider ${eventColors.bg} ${eventColors.text}`}>
                            {eventDisplay}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerGraphic;

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
        <div className="absolute bottom-5 left-5 w-full max-w-sm z-30 pointer-events-none animate-fade-in-up">
            <div 
              key={player.number + eventType} // Re-trigger animation if same player has a new event
              className="relative bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-2xl border-l-4 overflow-hidden animate-fade-out"
              style={{ borderColor: team.color || '#fff', animationDelay: '7.5s', animationFillMode: 'forwards' }}
            >
                <div className="flex items-center p-3 gap-3 text-white">
                    {/* Player Photo */}
                    <div className="flex-shrink-0">
                         <img src={playerPhoto} alt={player.name} className="w-20 h-20 object-cover rounded-md" />
                    </div>
                    
                    {/* Player Info & Stats */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                           <h2 className="text-xl font-bold leading-tight truncate">{player.name}</h2>
                           <span className="text-2xl font-black text-white/50">{player.number}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                           {team.logo && <img src={team.logo} alt={team.name} className="w-4 h-4 object-contain" />}
                           <p className="text-sm font-semibold opacity-90 truncate" style={{color: team.color || '#fff'}}>{team.name}</p>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                           <div className="text-center"><span className="font-bold text-base">{player.stats.goals}</span><p className="text-gray-400">Gls</p></div>
                           <div className="text-center"><span className="font-bold text-base">{player.stats.assists}</span><p className="text-gray-400">Ast</p></div>
                           <div className="text-center"><span className="font-bold text-base">{player.stats.shots}</span><p className="text-gray-400">Sht</p></div>
                        </div>
                    </div>
                </div>

                {/* Event Banner */}
                <div className="absolute -bottom-1 -right-8 bg-yellow-400 text-black py-1 px-10 transform rotate-[-30deg] origin-bottom-right">
                    <span className="text-xs font-black uppercase tracking-wider">{eventDisplay}</span>
                </div>
            </div>
        </div>
    );
};

export default PlayerStatPopup;

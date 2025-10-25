import React, { useEffect, useState } from 'react';
import { useMatchContext } from '../context/MatchContext';

const KeyPlayerSpotlight: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const { keyPlayerSpotlight } = state;
    const [typedAnalysis, setTypedAnalysis] = useState('');

    useEffect(() => {
        if (keyPlayerSpotlight) {
            setTypedAnalysis(''); // Reset on new spotlight
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_KEY_PLAYER_SPOTLIGHT' });
            }, 10000); // Display for 10 seconds

            return () => clearTimeout(timer);
        }
    }, [keyPlayerSpotlight, dispatch]);

    useEffect(() => {
        if (keyPlayerSpotlight?.analysis) {
            let i = 0;
            const typingInterval = setInterval(() => {
                if (i < keyPlayerSpotlight.analysis.length) {
                    setTypedAnalysis(prev => prev + keyPlayerSpotlight.analysis.charAt(i));
                    i++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 30); // Typing speed
            return () => clearInterval(typingInterval);
        }
    }, [keyPlayerSpotlight?.analysis]);


    if (!keyPlayerSpotlight) {
        return null;
    }

    const { player, team: teamSide, analysis } = keyPlayerSpotlight;
    const team = teamSide === 'home' ? state.homeTeam : state.awayTeam;

    const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=random&size=256`;

    return (
        <div 
            key={player.number}
            className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-11/12 max-w-lg h-auto md:h-36 z-30 pointer-events-none animate-fade-in-up md:bottom-5 md:translate-y-0 md:max-w-3xl"
        >
             <div 
                className="relative w-full h-full bg-gray-900/80 backdrop-blur-md rounded-lg shadow-2xl border-b-4 overflow-hidden animate-fade-out"
                style={{ borderColor: team.color || '#fff', animationDelay: '9.5s', animationFillMode: 'forwards' }}
             >
                <div className="flex items-center p-4 gap-5 h-full">
                    {/* Player Photo & Number */}
                    <div className="relative flex-shrink-0 w-28 h-28">
                         <img src={playerPhoto} alt={player.name} className="w-full h-full object-cover rounded-full border-4" style={{ borderColor: team.color || '#fff' }} />
                         <div 
                            className="absolute -bottom-1 -right-1 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl border-2 border-gray-900" 
                            style={{ backgroundColor: team.color, color: 'white', textShadow: '1px 1px 2px black' }}
                        >
                           {player.number}
                         </div>
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex flex-col justify-center text-white min-w-0">
                        <h2 className="text-3xl font-bold leading-tight truncate">{player.name}</h2>
                         <div className="flex items-center gap-2">
                           {team.logo && <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />}
                           <p className="text-lg font-semibold opacity-90 truncate">{team.name}</p>
                        </div>
                        <p className="text-md font-semibold opacity-70 mt-1">{player.role}</p>
                    </div>

                    <div className="w-px h-24 bg-gray-600/70 mx-2"></div>
                    
                    {/* Stats & AI Analysis */}
                    <div className="flex-1 flex flex-col justify-between h-full text-white">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                           <div><span className="font-bold text-lg">{player.stats.goals}</span><p className="text-gray-400">Goals</p></div>
                           <div><span className="font-bold text-lg">{player.stats.assists}</span><p className="text-gray-400">Assists</p></div>
                           <div><span className="font-bold text-lg">{player.stats.shots}</span><p className="text-gray-400">Shots</p></div>
                        </div>
                        <div className="text-sm italic text-gray-300 h-12 overflow-hidden">
                            <p>{typedAnalysis}<span className="animate-ping">|</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KeyPlayerSpotlight;

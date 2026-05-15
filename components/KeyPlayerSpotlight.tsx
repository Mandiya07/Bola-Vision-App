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

    const { player, team: teamSide } = keyPlayerSpotlight;
    const team = teamSide === 'home' ? state.homeTeam : state.awayTeam;

    const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=random&size=256`;

    return (
        <div 
            key={player.number}
            className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-11/12 max-w-lg h-auto md:h-40 z-30 pointer-events-none animate-fade-in-up md:bottom-32 md:translate-y-0 md:max-w-3xl"
        >
             <div 
                className="relative w-full h-full glass-panel border-t-2 border-l-2 bg-slate-950/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-out"
                style={{ borderColor: team.color || '#fff', animationDelay: '9.5s', animationFillMode: 'forwards' }}
             >
                {/* AI Scanline effect inside the card */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent h-20 -top-full animate-scanline-infinite pointer-events-none opacity-30"></div>
                
                <div className="flex items-center p-5 gap-6 h-full relative z-10">
                    {/* Player Photo & Number */}
                    <div className="relative flex-shrink-0 w-32 h-32">
                         <div className="absolute inset-0 rounded-full animate-pulse-slow bg-gradient-to-tr from-neon-cyan/20 to-transparent"></div>
                         <img src={playerPhoto} alt={player.name} className="w-full h-full object-cover rounded-full border-2 p-1 bg-slate-900 shadow-[0_0_20px_rgba(0,243,255,0.2)]" style={{ borderColor: team.color || '#fff' }} />
                         <div 
                            className="absolute -bottom-1 -right-1 w-14 h-14 rounded-full flex flex-col items-center justify-center font-black border-2 border-slate-900 shadow-xl" 
                            style={{ backgroundColor: team.color, color: 'white' }}
                        >
                           <span className="text-2xl leading-none">{player.number}</span>
                           <span className="text-[10px] uppercase opacity-80 leading-none">NO.</span>
                         </div>
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex flex-col justify-center text-white min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-neon-cyan/10 text-neon-cyan text-[10px] font-display font-bold px-2 py-0.5 rounded border border-neon-cyan/20 uppercase tracking-widest">Neural Spotlight</span>
                            <span className="text-white/40 text-[10px] font-mono">ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                        </div>
                        <h2 className="text-4xl font-display font-bold leading-tight truncate gradient-text-white">{player.name}</h2>
                         <div className="flex items-center gap-2">
                           {team.logo && <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain" />}
                           <p className="text-lg font-display font-bold text-white/90 truncate uppercase tracking-tight">{team.name}</p>
                        </div>
                        <p className="text-sm font-display font-bold text-neon-cyan/80 mt-1 uppercase tracking-[0.2em]">{player.role}</p>
                    </div>

                    <div className="hidden md:block w-px h-28 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-2"></div>
                    
                    {/* Stats & AI Analysis */}
                    <div className="flex-1 flex flex-col justify-between h-full text-white py-2">
                        <div className="grid grid-cols-3 gap-4 text-center">
                           <div className="glass-panel border-white/5 py-1 px-2 rounded-lg">
                                <span className="font-display font-black text-xl text-neon-cyan leading-none">{player.stats.goals}</span>
                                <p className="text-[9px] font-display font-bold text-white/40 uppercase tracking-tighter">Goals</p>
                           </div>
                           <div className="glass-panel border-white/5 py-1 px-2 rounded-lg">
                                <span className="font-display font-black text-xl text-neon-cyan leading-none">{player.stats.assists}</span>
                                <p className="text-[9px] font-display font-bold text-white/40 uppercase tracking-tighter">Assists</p>
                           </div>
                           <div className="glass-panel border-white/5 py-1 px-2 rounded-lg">
                                <span className="font-display font-black text-xl text-neon-cyan leading-none">{player.stats.shots}</span>
                                <p className="text-[9px] font-display font-bold text-white/40 uppercase tracking-tighter">Shots</p>
                           </div>
                        </div>
                        <div className="text-sm font-medium leading-relaxed text-slate-300 h-16 overflow-hidden mt-3 relative">
                            <div className="absolute left-0 top-0 w-full h-full bg-slate-950/20 blur-sm -z-10"></div>
                            <p className="font-mono text-[13px]"><span className="text-neon-cyan mr-1">&gt;</span>{typedAnalysis}<span className="inline-block w-2 h-4 bg-neon-cyan animate-pulse ml-1 align-middle"></span></p>
                        </div>
                    </div>
                </div>

                {/* Cyberpunk corner accents */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-cyan/30 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-neon-cyan/30 rounded-bl-xl"></div>
            </div>
        </div>
    );
};

export default KeyPlayerSpotlight;

import React, { useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';

const GoalAnimation: React.FC = () => {
    const { state, dispatch } = useMatchContext();

    useEffect(() => {
        if (state.goalEvent) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_GOAL_ANIMATION' });
            }, 4000); // Animation lasts 4 seconds

            return () => clearTimeout(timer);
        }
    }, [state.goalEvent, dispatch]);

    if (!state.goalEvent) {
        return null;
    }

    const scoringTeam = state.goalEvent.team === 'home' ? state.homeTeam : state.awayTeam;
    const teamColor = scoringTeam.color || '#FFFFFF';

    return (
        <div 
            className="absolute inset-0 flex items-center justify-center z-[100] animate-fade-in overflow-hidden"
            style={{ backgroundColor: `${teamColor}1A` }} // Very subtle team color
        >
            {/* Background scanlines and grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12">
                    {[...Array(144)].map((_, i) => (
                        <div key={i} className="border-[0.5px] border-white/10" />
                    ))}
                </div>
            </div>

            <div 
                key={state.matchTime} // Re-trigger animation on new goal
                className="relative text-center animate-fade-out flex flex-col items-center justify-center" 
                style={{ animationDelay: '3.5s', animationFillMode: 'forwards' }}
            >
                {scoringTeam.logo && (
                    <img 
                        src={scoringTeam.logo} 
                        alt={`${scoringTeam.name} logo`}
                        className="absolute inset-0 w-full h-full object-contain opacity-5 z-0 scale-150 blur-sm"
                    />
                )}
                
                <div className="relative z-10">
                    <div className="text-[10px] font-display font-bold text-neon-cyan uppercase tracking-[0.5em] mb-4 animate-pulse">
                        System Alert: Scoring Protocol Initialized
                    </div>
                    
                    <h1
                        className="text-8xl md:text-[12rem] font-display font-black uppercase tracking-[0.1em] text-white relative"
                        style={{ 
                            textShadow: `0 0 30px ${teamColor}, 0 0 60px ${teamColor}80`
                        }}
                    >
                        <span className="inline-block relative" style={{ animation: 'goal-text-animation 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                            GOAL
                            <span className="absolute -inset-1 text-neon-cyan opacity-30 blur-sm animate-pulse">GOAL</span>
                        </span>
                    </h1>

                    <div className="mt-6 flex items-center justify-center gap-4">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-neon-cyan" />
                        <div className="text-xl font-display font-bold text-white uppercase tracking-[0.3em]">
                            {scoringTeam.name}
                        </div>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-neon-cyan" />
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-20 -left-20 w-40 h-40 border-l-2 border-t-2 border-neon-cyan opacity-20" />
                <div className="absolute -bottom-20 -right-20 w-40 h-40 border-r-2 border-b-2 border-neon-cyan opacity-20" />
            </div>
        </div>
    );
};

export default GoalAnimation;

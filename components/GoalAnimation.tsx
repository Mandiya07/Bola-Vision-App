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
            className="absolute inset-0 flex items-center justify-center z-50 animate-fade-in"
            style={{ backgroundColor: `${teamColor}33` }} // Semi-transparent team color
        >
            <div 
                key={state.matchTime} // Re-trigger animation on new goal
                className="relative text-center animate-fade-out" 
                style={{ animationDelay: '3.5s', animationFillMode: 'forwards' }}
            >
                {scoringTeam.logo && (
                    <img 
                        src={scoringTeam.logo} 
                        alt={`${scoringTeam.name} logo`}
                        className="absolute inset-0 w-full h-full object-contain opacity-10 z-0"
                    />
                )}
                <h1
                    className="text-8xl md:text-9xl font-black uppercase tracking-widest text-white"
                    style={{ 
                        WebkitTextStroke: `4px ${teamColor}`,
                        textShadow: `0 0 20px ${teamColor}, 0 0 40px ${teamColor}80`
                    }}
                >
                    <span className="inline-block" style={{ animation: 'goal-text-animation 0.5s ease-out forwards' }}>
                        GOAL!
                    </span>
                </h1>
            </div>
        </div>
    );
};

export default GoalAnimation;

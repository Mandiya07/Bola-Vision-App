import React, { useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';

const GoalImpactOverlay: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const { goalImpactEvent } = state;

    useEffect(() => {
        if (goalImpactEvent) {
            // This overlay appears after the goal animation, so it needs its own timer
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_GOAL_IMPACT' });
            }, 6000); // Display for 6 seconds

            return () => clearTimeout(timer);
        }
    }, [goalImpactEvent, dispatch]);

    if (!goalImpactEvent) {
        return null;
    }

    const { player, team, impact, newProbability } = goalImpactEvent;
    const teamData = team === 'home' ? state.homeTeam : state.awayTeam;
    const teamColor = teamData.color || '#FFFFFF';

    const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=random&size=256`;

    const impactSign = impact > 0 ? '+' : '';
    const impactColor = impact > 0 ? 'text-green-400' : 'text-red-400';
    
    const ProbBar: React.FC<{ prob: number, color: string, label: string }> = ({ prob, color, label }) => (
        <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-300">{label}</span>
            <div className="text-2xl font-bold" style={{ color }}>{(prob * 100).toFixed(1)}%</div>
        </div>
    );

    return (
        <div 
            className="absolute inset-0 flex items-center justify-center z-[45] bg-black/80 backdrop-blur-sm animate-fade-in"
        >
            <div 
                key={player.number}
                className="relative text-center bg-gray-900/50 border-2 rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-fade-out"
                style={{
                    borderColor: teamColor,
                    animationDelay: '5.5s',
                    animationFillMode: 'forwards'
                }}
            >
                <img 
                    src={playerPhoto}
                    alt={player.name}
                    className="w-24 h-24 rounded-full object-cover border-4 mx-auto mb-2"
                    style={{ borderColor: teamColor }}
                />
                <h2 className="text-3xl font-bold text-white">{player.name}</h2>
                <p className="text-lg font-semibold mb-4" style={{ color: teamColor }}>Scores for {teamData.name}!</p>
                
                <div className="bg-black/50 p-4 rounded-lg">
                    <h3 className="text-sm uppercase font-bold text-gray-400">Goal Impact</h3>
                    <p className={`text-6xl font-black ${impactColor}`}>
                        {impactSign}{impact.toFixed(1)}%
                    </p>
                    <p className="text-lg text-gray-200">Change in Win Probability</p>
                </div>
                
                <div className="mt-4 flex justify-around items-center bg-black/30 p-2 rounded-lg">
                    <ProbBar prob={newProbability.home} color={state.homeTeam.color || '#3b82f6'} label={state.homeTeam.name.substring(0,3).toUpperCase()} />
                    <ProbBar prob={newProbability.draw} color="#9ca3af" label="DRAW" />
                    <ProbBar prob={newProbability.away} color={state.awayTeam.color || '#ef4444'} label={state.awayTeam.name.substring(0,3).toUpperCase()} />
                </div>
            </div>
        </div>
    );
};

export default GoalImpactOverlay;

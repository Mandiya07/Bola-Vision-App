import React from 'react';
import { useMatchContext } from '../context/MatchContext';
import { useProContext } from '../context/ProContext';

const WinProbabilityBar: React.FC = () => {
    const { state } = useMatchContext();
    const { isPro } = useProContext();
    const { winProbability, homeTeam, awayTeam } = state;

    if (!isPro || !winProbability) {
        return null;
    }

    const { home, away, draw } = winProbability;
    const homePercent = (home * 100).toFixed(1);
    const awayPercent = (away * 100).toFixed(1);
    const drawPercent = (draw * 100).toFixed(1);

    const defaultHomeColor = '#3b82f6';
    const defaultAwayColor = '#ef4444';
    const drawColor = '#6b7280'; // gray-500

    return (
        <div className="absolute bottom-72 left-1/2 -translate-x-1/2 w-11/12 max-w-xl bg-gray-900/80 backdrop-blur-md rounded-lg shadow-2xl p-2 text-white animate-fade-in-up z-20 md:bottom-36">
            <div className="text-center text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">Win Probability</div>
            <div className="flex h-6 w-full rounded-md overflow-hidden bg-gray-700">
                <div 
                    className="flex items-center justify-center transition-all duration-700 ease-out"
                    style={{ width: `${homePercent}%`, backgroundColor: homeTeam.color || defaultHomeColor }}
                    title={`${homeTeam.name} Win: ${homePercent}%`}
                >
                   {home > 0.1 && <span className="text-xs font-bold text-white mix-blend-difference">{homePercent}%</span>}
                </div>
                <div 
                    className="flex items-center justify-center transition-all duration-700 ease-out"
                    style={{ width: `${drawPercent}%`, backgroundColor: drawColor }}
                    title={`Draw: ${drawPercent}%`}
                >
                    {draw > 0.1 && <span className="text-xs font-bold text-white mix-blend-difference">{drawPercent}%</span>}
                </div>
                <div 
                    className="flex items-center justify-center transition-all duration-700 ease-out"
                    style={{ width: `${awayPercent}%`, backgroundColor: awayTeam.color || defaultAwayColor }}
                    title={`${awayTeam.name} Win: ${awayPercent}%`}
                >
                    {away > 0.1 && <span className="text-xs font-bold text-white mix-blend-difference">{awayPercent}%</span>}
                </div>
            </div>
        </div>
    );
};

export default WinProbabilityBar;

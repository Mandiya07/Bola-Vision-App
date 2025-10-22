import React from 'react';
import { useMatchContext } from '../context/MatchContext';
import { CheckCircleIcon, XCircleIcon } from './icons/ControlIcons';
import type { Team } from '../types';

const PenaltyShootoutOverlay: React.FC = () => {
    const { state } = useMatchContext();
    const { penaltyShootout, homeTeam, awayTeam, matchPeriod } = state;

    if (matchPeriod !== 'penaltyShootout' || !penaltyShootout) {
        return null;
    }

    const { homeAttempts, awayAttempts, homeScore, awayScore, currentTaker } = penaltyShootout;

    const renderAttemptMarkers = (team: 'home' | 'away') => {
        const attempts = team === 'home' ? homeAttempts : awayAttempts;
        const totalAttempts = Math.max(5, attempts.length);
        const markers = [];

        for (let i = 0; i < totalAttempts; i++) {
            const attempt = attempts[i];
            const isCurrent = (currentTaker === team) && (i === attempts.length);

            let content;
            if (attempt) {
                if (attempt.outcome === 'goal') {
                    content = <CheckCircleIcon className="w-6 h-6 text-green-400" />;
                } else {
                    content = <XCircleIcon className="w-6 h-6 text-red-400" />;
                }
            } else {
                content = <div className={`w-5 h-5 rounded-full border-2 ${isCurrent ? 'border-yellow-400 animate-pulse' : 'border-gray-500'}`}></div>;
            }
            markers.push(
                <div key={`${team}-${i}`} className="flex items-center justify-center">
                    {content}
                </div>
            );
        }
        return markers;
    };
    
    const TeamDisplay: React.FC<{teamData: Team, score: number, isCurrent: boolean}> = ({teamData, score, isCurrent}) => (
         <div className={`flex items-center gap-3 transition-all duration-300 ${isCurrent ? 'scale-110' : 'opacity-70'}`}>
            {teamData.logo && <img src={teamData.logo} alt={teamData.name} className="w-10 h-10 object-contain" />}
            <span className="text-xl font-bold uppercase tracking-wider">{teamData.name.substring(0, 3)}</span>
            <span className="text-3xl font-black" style={{color: teamData.color}}>{score}</span>
        </div>
    );

    return (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-full max-w-lg bg-black/70 backdrop-blur-md rounded-xl shadow-2xl p-4 text-white border-2 border-yellow-400/50 animate-fade-in z-30">
            <h2 className="text-center text-xl font-bold text-yellow-300 uppercase tracking-widest mb-3">Penalty Shootout</h2>
            
            <div className="flex items-center justify-between mb-4">
                <TeamDisplay teamData={homeTeam} score={homeScore} isCurrent={currentTaker === 'home'} />
                <TeamDisplay teamData={awayTeam} score={awayScore} isCurrent={currentTaker === 'away'} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-around items-center bg-gray-800/50 p-2 rounded-lg">
                    {renderAttemptMarkers('home')}
                </div>
                <div className="flex justify-around items-center bg-gray-800/50 p-2 rounded-lg">
                    {renderAttemptMarkers('away')}
                </div>
            </div>
        </div>
    );
};

export default PenaltyShootoutOverlay;

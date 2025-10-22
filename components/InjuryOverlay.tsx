import React, { useState, useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import type { MatchState } from '../types';
import { MedicalIcon, PlayIcon, SubstitutionIcon } from './icons/ControlIcons';

interface InjuryOverlayProps {
    injuryStoppage: NonNullable<MatchState['injuryStoppage']>;
    onShowSubModal: () => void;
}

const formatStoppageTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const InjuryOverlay: React.FC<InjuryOverlayProps> = ({ injuryStoppage, onShowSubModal }) => {
    const { state, dispatch } = useMatchContext();
    const { player, team: teamSide, startTime } = injuryStoppage;
    
    const [elapsedTime, setElapsedTime] = useState(state.matchTime - startTime);
    
    const team = teamSide === 'home' ? state.homeTeam : state.awayTeam;

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleResume = () => {
        dispatch({ type: 'RESUME_FROM_INJURY' });
        // Generate a follow-up commentary if needed
    };

    const handleSubstitute = () => {
        onShowSubModal();
        // The sub modal will handle the rest, but we still need to resume play
        // Or perhaps the sub modal should trigger the resume?
        // For now, let's assume the user will resume manually after subbing.
        // A better UX might be for the sub modal to trigger the resume.
        // Let's stick to the core task for now.
    };

    const playerPhoto = player.photo || `https://ui-avatars.com/api/?name=${player.name.replace(' ', '+')}&background=random&size=256`;

    return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 animate-fade-in">
            <div className="relative bg-gray-900/80 backdrop-blur-md border-2 border-cyan-500 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center text-white">
                <div className="absolute top-4 left-4 flex items-center gap-2 text-cyan-400">
                    <MedicalIcon className="w-6 h-6 animate-pulse" />
                    <span className="font-bold uppercase tracking-wider">Injury Stoppage</span>
                </div>

                <div className="mt-12 mb-6">
                    <img src={playerPhoto} alt={player.name} className="w-24 h-24 rounded-full object-cover border-4 mx-auto mb-4" style={{ borderColor: team.color }}/>
                    <h2 className="text-2xl font-bold">{player.name}</h2>
                    <p className="text-lg" style={{ color: team.color }}>{team.name}</p>
                </div>

                <div className="bg-black/50 rounded-lg p-4 mb-8">
                    <p className="text-gray-400 text-sm">Stoppage Time</p>
                    <p className="text-5xl font-mono font-bold text-yellow-300">{formatStoppageTime(elapsedTime)}</p>
                </div>
                
                <div className="flex justify-center gap-4">
                    <button onClick={handleSubstitute} className="bg-orange-600 hover:bg-orange-700 font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 flex items-center gap-2">
                        <SubstitutionIcon className="w-6 h-6" />
                        Substitute Player
                    </button>
                    <button onClick={handleResume} className="bg-green-600 hover:bg-green-700 font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 flex items-center gap-2">
                        <PlayIcon className="w-6 h-6" />
                        Resume Play
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InjuryOverlay;
import React, { useEffect, useState } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { PollIcon } from './icons/ControlIcons';

const PollOverlay: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const { activePoll } = state;
    const [hasVoted, setHasVoted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (activePoll) {
            setIsVisible(true);
            setHasVoted(false); // Reset vote status for new poll
            
            // Auto-hide logic
            const duration = activePoll.isLive ? 30000 : 10000; // 30s for live, 10s for results
            const timer = setTimeout(() => {
                setIsVisible(false);
                // Give it time to fade out before clearing from state
                setTimeout(() => dispatch({ type: 'CLEAR_POLL' }), 500);
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [activePoll, dispatch]);

    if (!activePoll || !isVisible) {
        return null;
    }

    const totalVotes = activePoll.options.reduce((sum, opt) => sum + opt.votes, 0);

    const handleVote = (optionId: string) => {
        if (hasVoted || !activePoll.isLive) return;
        dispatch({ type: 'VOTE_POLL', payload: { optionId } });
        setHasVoted(true);
    };

    return (
        <div className={`absolute bottom-5 left-5 w-full max-w-sm bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl p-4 text-white border-t-4 border-blue-500 z-30 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div className="flex items-center gap-3 mb-3">
                <PollIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <h3 className="font-bold text-lg leading-tight">{activePoll.question}</h3>
            </div>
            
            <div className="space-y-2">
                {activePoll.options.map(option => {
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    const isLive = activePoll.isLive;

                    if (isLive) {
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleVote(option.id)}
                                disabled={hasVoted}
                                className="w-full text-left p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                <span className="font-semibold">{option.text}</span>
                                {hasVoted && (
                                     <div className="mt-1 text-right text-xs text-blue-300">{option.votes} votes</div>
                                )}
                            </button>
                        );
                    } else {
                        // Results view
                        return (
                            <div key={option.id} className="w-full p-2 rounded-lg bg-gray-700 overflow-hidden">
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="font-semibold">{option.text}</span>
                                    <span className="font-bold">{percentage.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-600 rounded-full">
                                    <div 
                                        className="h-2 bg-blue-500 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${percentage}%`}}
                                    ></div>
                                </div>
                            </div>
                        );
                    }
                })}
            </div>
             <p className="text-xs text-gray-500 text-right mt-2">{totalVotes} Total Votes</p>
        </div>
    );
};

export default PollOverlay;
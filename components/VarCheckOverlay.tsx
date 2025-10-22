import React, { useEffect, useRef } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { getEventDescription } from '../services/geminiService';
import { BrainIcon, PlayIcon } from './icons/ControlIcons';

const VarCheckOverlay: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (state.varCheck?.videoUrl && videoRef.current) {
            videoRef.current.src = state.varCheck.videoUrl;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.error("Replay video failed to play:", e));
        }
    }, [state.varCheck?.videoUrl]);

    if (!state.varCheck) return null;

    const { status, event, videoUrl, analysis, recommendation } = state.varCheck;
    
    const handleClose = () => {
        dispatch({ type: 'CLEAR_VAR_CHECK' });
        // Optionally resume play, or let the operator do it manually
        // if (!state.isMatchPlaying) {
        //     dispatch({ type: 'TOGGLE_PLAY' });
        // }
    };

    const getRecommendationColors = (): { bg: string, text: string } => {
        switch (recommendation) {
            case 'Goal':
            case 'Foul':
            case 'Red Card':
            case 'Yellow Card':
            case 'Offside':
                return { bg: 'bg-red-600', text: 'text-white' };
            case 'No Goal':
            case 'No Foul':
            case 'Onside':
            case 'Play On':
                return { bg: 'bg-green-600', text: 'text-white' };
            default:
                return { bg: 'bg-gray-600', text: 'text-white' };
        }
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <div className="w-full max-w-4xl bg-gray-900/80 border-2 border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden">
                <header className="p-3 bg-black/50 border-b-2 border-cyan-500/50">
                    <h1 className="text-2xl font-bold text-center text-cyan-300 uppercase tracking-widest">
                        AI Referee Review
                    </h1>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="relative aspect-video bg-black flex items-center justify-center p-2">
                        {videoUrl ? (
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        ) : (
                             <p className="text-gray-400">Loading replay...</p>
                        )}
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-md text-sm">
                            <p className="font-bold text-white">Reviewing: <span className="text-yellow-400">{getEventDescription(event)}</span></p>
                        </div>
                    </div>

                    <div className="p-6 flex flex-col justify-center items-center text-center">
                        {status === 'analyzing' && (
                            <div className="animate-fade-in-fast">
                                <BrainIcon className="w-16 h-16 text-cyan-400 mx-auto animate-pulse mb-4" />
                                <h2 className="text-2xl font-bold text-white">ANALYZING INCIDENT</h2>
                                <p className="text-gray-300 mt-2">The AI Referee is reviewing the play...</p>
                            </div>
                        )}
                        {status === 'complete' && (
                             <div className="animate-fade-in-fast w-full">
                                <h2 className="text-lg font-semibold text-gray-400 uppercase tracking-wider">Recommendation</h2>
                                <div className={`my-2 py-3 px-6 rounded-lg text-3xl font-black uppercase tracking-widest inline-block ${getRecommendationColors().bg} ${getRecommendationColors().text}`}>
                                    {recommendation || 'Undetermined'}
                                </div>
                                <div className="mt-4 bg-black/30 p-3 rounded-lg max-h-40 overflow-y-auto">
                                    <h3 className="text-sm font-bold text-cyan-300 mb-1">AI Reasoning:</h3>
                                    <p className="text-gray-200 text-left text-sm whitespace-pre-wrap">{analysis}</p>
                                </div>
                            </div>
                        )}
                        {status === 'error' && (
                             <div className="animate-fade-in-fast">
                                <h2 className="text-2xl font-bold text-red-500">Analysis Error</h2>
                                <p className="text-gray-300 mt-2 max-h-40 overflow-y-auto">{analysis}</p>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="p-3 bg-black/50 border-t-2 border-cyan-500/50 text-center">
                    <button onClick={handleClose} className="bg-cyan-600 hover:bg-cyan-700 font-bold py-2 px-8 rounded-lg transition-transform transform hover:scale-105 flex items-center gap-2 mx-auto">
                        <PlayIcon className="w-5 h-5" />
                        Close & Resume
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default VarCheckOverlay;

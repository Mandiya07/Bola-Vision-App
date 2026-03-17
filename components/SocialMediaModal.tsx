import React, { useState, useMemo, useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { generateSocialMediaPost, generateSocialMediaImage } from '../services/geminiService';
import { getEventDescription } from '../services/geminiService';
import type { GameEvent, SocialPostEvent } from '../types';
import { GoalIcon, YellowCardIcon, RedCardIcon, BrainIcon, TrophyIcon } from './icons/ControlIcons';

interface SocialMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: SocialPostEvent | null;
}

const getEventIcon = (type: GameEvent['type'] | 'FINAL_SCORE' | 'HALF_TIME') => {
    switch (type) {
        case 'GOAL':
            return <GoalIcon className="w-5 h-5 text-yellow-300" />;
        case 'YELLOW_CARD':
            return <YellowCardIcon className="w-5 h-5" />;
        case 'RED_CARD':
            return <RedCardIcon className="w-5 h-5" />;
        case 'FINAL_SCORE':
        case 'HALF_TIME':
            return <TrophyIcon className="w-5 h-5 text-gray-300" />
        default:
            return null;
    }
};

const getEventTitle = (event: SocialPostEvent): string => {
    if ('type' in event && event.type === 'FINAL_SCORE') return "Final Score";
    if ('type' in event && event.type === 'HALF_TIME') return "Half Time Score";
    return getEventDescription(event as GameEvent);
};

const SocialMediaModal: React.FC<SocialMediaModalProps> = ({ isOpen, onClose, event: initialEvent }) => {
    const { state } = useMatchContext();
    const [selectedEvent, setSelectedEvent] = useState<SocialPostEvent | null>(null);
    const [generatedPost, setGeneratedPost] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [imageError, setImageError] = useState('');


    const shareableEvents = useMemo(() => {
        const keyEvents: GameEvent[] = state.events.filter(e => 
            ['GOAL', 'RED_CARD', 'YELLOW_CARD'].includes(e.type)
        ).reverse().slice(0, 5);

        const specialEvents: SocialPostEvent[] = [];
        if (state.matchPeriod === 'fullTime' || state.penaltyShootout?.winner) {
            specialEvents.push({ type: 'FINAL_SCORE' });
        }
        if (state.matchPeriod === 'halfTime') {
            specialEvents.push({ type: 'HALF_TIME' });
        }

        return [...specialEvents, ...keyEvents];
    }, [state.events, state.matchPeriod, state.penaltyShootout]);

    const handleEventSelect = async (event: SocialPostEvent) => {
        setSelectedEvent(event);
        setIsLoading(true);
        setIsImageLoading(true);
        setError('');
        setImageError('');
        setGeneratedPost('');
        setGeneratedImage('');
        setCopySuccess('');

        try {
            await Promise.all([
                (async () => {
                    try {
                        const post = await generateSocialMediaPost(event, state);
                        setGeneratedPost(post);
                    } catch (e: unknown) {
                        const errorMessage = e instanceof Error ? e.message : 'Failed to generate post text.';
                        setError(errorMessage);
                    } finally {
                        setIsLoading(false);
                    }
                })(),
                (async () => {
                    try {
                        const imageB64 = await generateSocialMediaImage(event, state);
                        setGeneratedImage(`data:image/jpeg;base64,${imageB64}`);
                    } catch (e: unknown) {
                        const errorMessage = e instanceof Error ? e.message : 'Failed to generate image.';
                        setImageError(errorMessage);
                    } finally {
                        setIsImageLoading(false);
                    }
                })(),
            ]);
        } catch (e) {
            console.error("Error during social post generation:", e);
        }
    };
    
    useEffect(() => {
        if (initialEvent) {
            handleEventSelect(initialEvent);
        } else {
            setSelectedEvent(null);
            setGeneratedPost('');
            setError('');
            setGeneratedImage('');
            setImageError('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialEvent]);

    const handleCopyToClipboard = () => {
        if (!generatedPost) return;
        navigator.clipboard.writeText(generatedPost).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            setCopySuccess('Failed!');
            console.error('Could not copy text: ', err);
        });
    };

    const handleDownloadImage = () => {
        if (!generatedImage || !selectedEvent) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        const eventType = selectedEvent.type;
        link.download = `BolaVision_${eventType}_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="glass-panel border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-5xl p-8 text-white flex flex-col max-h-[90vh] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50" />
                
                <div className="flex justify-between items-center mb-8 flex-shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-display font-black text-neon-cyan uppercase tracking-[0.2em]">Neural Content Generator</h2>
                        <p className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Automated Social Media Synthesis</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:border-neon-cyan hover:text-neon-cyan transition-all duration-300 text-2xl leading-none">&times;</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 flex-grow overflow-hidden">
                    <div className="md:col-span-2 flex flex-col overflow-hidden">
                        <h3 className="text-[10px] font-display font-bold text-white/60 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-4 h-px bg-white/20" /> 01. Event Selection
                        </h3>
                        <div className="glass-panel border-white/5 bg-white/5 rounded-2xl p-3 space-y-3 overflow-y-auto scrollbar-hide">
                            {shareableEvents.length === 0 && <p className="text-white/40 text-[10px] font-display font-bold uppercase tracking-widest text-center p-8">No tactical events detected.</p>}
                            {shareableEvents.map((event, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => handleEventSelect(event)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all duration-300 border ${selectedEvent === event ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/20 text-white/60 hover:text-white'}`}
                                >
                                    <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg ${selectedEvent === event ? 'bg-neon-cyan/20' : 'bg-white/5'}`}>{getEventIcon(event.type)}</div>
                                    <div className="flex-1 truncate">
                                        <p className="font-display font-bold text-xs uppercase tracking-wider">{getEventTitle(event)}</p>
                                        {'matchTime' in event && <p className="text-[10px] font-mono opacity-60 mt-0.5">T+ {Math.floor(event.matchTime / 60)}:00</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
                         <div className="flex flex-col">
                            <h3 className="text-[10px] font-display font-bold text-white/60 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-4 h-px bg-white/20" /> 02. Visual Synthesis
                            </h3>
                            <div className="aspect-video w-full glass-panel border-white/10 bg-slate-900/40 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                                {isImageLoading && (
                                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-neon-cyan gap-4 z-10">
                                        <div className="relative">
                                            <BrainIcon className="w-12 h-12 animate-pulse"/>
                                            <div className="absolute inset-0 animate-ping opacity-20"><BrainIcon className="w-12 h-12"/></div>
                                        </div>
                                        <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] animate-pulse">Processing Visual Data...</span>
                                    </div>
                                )}
                                {imageError && !isImageLoading && (
                                    <div className="p-8 text-center text-red-400 font-display font-bold text-xs uppercase tracking-widest">{imageError}</div>
                                )}
                                {generatedImage && !isImageLoading && !imageError && (
                                    <>
                                        <img src={generatedImage} alt="Generated social media graphic" className="w-full h-full object-cover animate-fade-in" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                            <button 
                                                onClick={handleDownloadImage}
                                                className="w-full py-2 glass-panel border-white/20 bg-white/10 hover:bg-white/20 text-white font-display font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                                            >
                                                Export Visual Asset
                                            </button>
                                        </div>
                                    </>
                                )}
                                {!selectedEvent && !isImageLoading && <p className="text-white/20 font-display font-bold text-[10px] uppercase tracking-widest">Awaiting Tactical Input</p>}
                            </div>
                         </div>
                         
                         <div className="flex flex-col flex-grow min-h-[180px]">
                            <h3 className="text-[10px] font-display font-bold text-white/60 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-4 h-px bg-white/20" /> 03. Linguistic Output
                            </h3>
                            <div className="glass-panel border-white/10 bg-slate-900/40 rounded-2xl p-4 flex-grow flex flex-col relative">
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                </div>
                                <textarea 
                                    readOnly 
                                    value={isLoading ? "GENERATING LINGUISTIC DATA..." : (error || generatedPost)}
                                    className="w-full h-full bg-transparent text-white/90 font-body text-sm leading-relaxed resize-none border-0 focus:ring-0 placeholder:text-white/20"
                                    placeholder="SELECT TACTICAL EVENT TO BEGIN SYNTHESIS."
                                />
                                <div className="mt-4 flex items-center gap-3">
                                    <button
                                        onClick={handleCopyToClipboard}
                                        disabled={!generatedPost || !!error}
                                        className="flex-1 h-12 glass-panel border-neon-cyan/30 bg-neon-cyan/10 hover:bg-neon-cyan text-neon-cyan hover:text-black font-display font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,243,255,0.1)] hover:shadow-[0_0_25px_rgba(0,243,255,0.3)]"
                                    >
                                        {copySuccess || 'Copy to Clipboard'}
                                    </button>
                                    <button
                                        onClick={() => selectedEvent && handleEventSelect(selectedEvent)}
                                        disabled={!selectedEvent || isLoading || isImageLoading}
                                        className="w-12 h-12 glass-panel border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center rounded-xl transition-all duration-300 disabled:opacity-20"
                                    >
                                        <BrainIcon className={`w-5 h-5 ${(isLoading || isImageLoading) ? 'animate-spin text-neon-cyan' : ''}`} />
                                    </button>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialMediaModal;
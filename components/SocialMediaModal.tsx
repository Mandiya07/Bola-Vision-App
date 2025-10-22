import React, { useState, useMemo, useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { generateSocialMediaPost, generateSocialMediaImage } from '../services/geminiService';
import { getEventDescription } from '../services/geminiService';
import type { GameEvent, SocialPostEvent, MatchState } from '../types';
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

const getEventTitle = (event: SocialPostEvent, state: MatchState): string => {
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
                    } catch (e: any) {
                        setError(e.message || 'Failed to generate post text.');
                    } finally {
                        setIsLoading(false);
                    }
                })(),
                (async () => {
                    try {
                        const imageB64 = await generateSocialMediaImage(event, state);
                        setGeneratedImage(`data:image/jpeg;base64,${imageB64}`);
                    } catch (e: any) {
                        setImageError(e.message || 'Failed to generate image.');
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
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        const eventType = 'type' in selectedEvent! ? selectedEvent.type : (selectedEvent as GameEvent).type;
        link.download = `BolaVision_${eventType}_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl p-6 text-white flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-cyan-400">Generate Social Media Post</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-4xl leading-none">&times;</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 flex-grow overflow-hidden">
                    <div className="md:col-span-2 flex flex-col">
                        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">1. Select an Event</h3>
                        <div className="bg-gray-900/50 rounded-lg p-2 space-y-2 overflow-y-auto">
                            {shareableEvents.length === 0 && <p className="text-gray-400 text-center p-4">No recent key events to post about.</p>}
                            {shareableEvents.map((event, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => handleEventSelect(event)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition ${selectedEvent === event ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    <div className="w-6 flex-shrink-0 flex items-center justify-center">{getEventIcon(event.type)}</div>
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold text-sm">{getEventTitle(event, state)}</p>
                                        {'matchTime' in event && <p className="text-xs text-gray-400">{Math.floor(event.matchTime / 60)}' min</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
                         <div>
                            <h3 className="text-lg font-semibold mb-2">2. AI Generated Image</h3>
                            <div className="aspect-square w-full bg-gray-900/50 rounded-lg flex items-center justify-center overflow-hidden">
                                {isImageLoading && (
                                    <div className="w-full h-full bg-gray-700 animate-pulse flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <BrainIcon className="w-10 h-10 animate-spin"/>
                                        <span>Generating Image...</span>
                                    </div>
                                )}
                                {imageError && !isImageLoading && (
                                    <div className="p-4 text-center text-red-400">{imageError}</div>
                                )}
                                {generatedImage && !isImageLoading && !imageError && (
                                    <img src={generatedImage} alt="Generated social media graphic" className="w-full h-full object-cover animate-fade-in" />
                                )}
                                {!selectedEvent && !isImageLoading && <p className="text-gray-500 text-sm">Select an event to generate content</p>}
                            </div>
                         </div>
                         <div className="flex flex-col flex-grow min-h-[150px]">
                            <h3 className="text-lg font-semibold mb-2">3. AI Generated Text</h3>
                            <div className="bg-gray-900/50 rounded-lg p-3 flex-grow flex flex-col justify-between">
                                <textarea 
                                    readOnly 
                                    value={isLoading ? "AI is generating post..." : (error || generatedPost)}
                                    className="w-full h-full bg-transparent text-white resize-none border-0 focus:ring-0 text-sm"
                                    placeholder="Select an event to generate a post."
                                />
                            </div>
                         </div>
                          <div className="flex items-center gap-2 mt-2 flex-shrink-0">
                                <button
                                    onClick={handleCopyToClipboard}
                                    disabled={!generatedPost || !!error}
                                    className="flex-1 bg-green-600 hover:bg-green-700 font-bold py-2 px-4 rounded-md transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    {copySuccess || 'Copy Text'}
                                </button>
                                 <button
                                    onClick={handleDownloadImage}
                                    disabled={!generatedImage || !!imageError}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded-md transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    Download Image
                                </button>
                                <button
                                    onClick={() => selectedEvent && handleEventSelect(selectedEvent)}
                                    disabled={!selectedEvent || isLoading || isImageLoading}
                                    className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-md transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <BrainIcon className={`w-5 h-5 ${(isLoading || isImageLoading) ? 'animate-spin' : ''}`} />
                                </button>
                             </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialMediaModal;
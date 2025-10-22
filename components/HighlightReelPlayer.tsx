import React, { useState, useEffect, useRef } from 'react';
import type { Highlight } from '../types';
import { getEventDescription } from '../services/geminiService';
import { useMatchContext } from '../context/MatchContext';

interface HighlightReelPlayerProps {
    reel: Highlight[];
}

const HighlightReelPlayer: React.FC<HighlightReelPlayerProps> = ({ reel }) => {
    const { state } = useMatchContext();
    const sponsorLogo = state.sponsorLogo;
    const [currentClipIndex, setCurrentClipIndex] = useState(-1); // Start at -1 to show initial title card
    const [showTitleCard, setShowTitleCard] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentHighlight = reel[currentClipIndex];

    useEffect(() => {
        // Start the reel
        const startTimeout = setTimeout(() => {
            setShowTitleCard(false);
            setCurrentClipIndex(0);
        }, 2000); // Show intro for 2 seconds

        return () => clearTimeout(startTimeout);
    }, [reel]);

    useEffect(() => {
        if (videoRef.current && currentHighlight) {
            videoRef.current.src = currentHighlight.videoUrl;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
    }, [currentClipIndex, currentHighlight]);

    const handleClipEnd = () => {
        if (currentClipIndex < reel.length - 1) {
            // Show title card for the next clip
            setShowTitleCard(true);
            const titleCardTimeout = setTimeout(() => {
                setShowTitleCard(false);
                setCurrentClipIndex(prev => prev + 1);
            }, 2000); // Show title card for 2 seconds
            return () => clearTimeout(titleCardTimeout);
        } else {
            // End of reel
            setShowTitleCard(true); // Show final "Reel Ended" card
            setCurrentClipIndex(reel.length);
        }
    };

    const renderTitleCardContent = () => {
        if (currentClipIndex === -1) {
            return <h1 className="text-4xl font-bold">Match Highlights</h1>;
        }
        if (currentClipIndex >= reel.length) {
            return <h1 className="text-4xl font-bold">Highlight Reel Complete</h1>;
        }
        if (currentHighlight) {
            return (
                <div>
                    <h2 className="text-3xl font-bold">{getEventDescription(currentHighlight.event)}</h2>
                    <p className="text-xl text-gray-300">{Math.floor(currentHighlight.event.matchTime / 60)}' minute</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                onEnded={handleClipEnd}
                className={`w-full h-full transition-opacity duration-500 ${showTitleCard ? 'opacity-0' : 'opacity-100'}`}
                playsInline
            />

            {showTitleCard && (
                <div key={currentClipIndex} className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white text-center p-4 animate-fade-in">
                    {renderTitleCardContent()}
                </div>
            )}
             {sponsorLogo && !showTitleCard && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm p-2 rounded-lg flex items-center gap-2 animate-fade-in-fast">
                    <span className="text-xs font-semibold text-gray-300 uppercase">Sponsored by</span>
                    <img src={sponsorLogo} alt="Sponsor" className="max-h-8 max-w-24 object-contain" />
                </div>
            )}
            <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 text-sm font-bold tracking-widest rounded-lg shadow-lg">
                AI HIGHLIGHT REEL
            </div>
        </div>
    );
};

export default HighlightReelPlayer;
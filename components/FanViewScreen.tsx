
import React from 'react';
import { useMatchContext } from '../context/MatchContext';
import { useCamera } from '../hooks/useCamera';
import Scoreboard from './Scoreboard';
import CommentaryDisplay from './CommentaryDisplay';
import GoalAnimation from './GoalAnimation';
import PlayerGraphic from './PlayerGraphic';
import PlayerStatPopup from './PlayerStatPopup';
import PollOverlay from './PollOverlay';
import WinProbabilityBar from './WinProbabilityBar';

const FanViewScreen: React.FC = () => {
    const { state } = useMatchContext();
    const { videoRef } = useCamera(); // We only need the video ref, no controls

    // In a real scenario, this would connect to a WebRTC stream.
    // For this simulation, we just show a static message or a placeholder.
    // The context provides all the necessary overlay data.

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            <video
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover bg-gray-800"
                autoPlay
                playsInline
                muted
                poster="https://i.imgur.com/gK98h8v.png" // Placeholder image
            />

            <div className="absolute inset-0 bg-black/30"></div>

            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
                <div>
                    <h1 className="text-xl font-bold text-white">{state.leagueName}</h1>
                    <p className="text-sm text-gray-300">{state.venue}</p>
                </div>
                <h1 className="text-2xl font-bold opacity-90 text-white">BolaVision</h1>
            </header>
            
            {/* All overlays will work automatically based on context state */}
            <Scoreboard />
            <CommentaryDisplay
                text={state.commentary}
                audioStatus={'idle'} // No audio playback for viewers in this simulation
                selectedLanguage={state.commentaryLanguage}
                onLanguageChange={() => {}}
                isTranslating={false}
            />
            <GoalAnimation />
            <PlayerGraphic />
            <PlayerStatPopup />
            <PollOverlay />
            <WinProbabilityBar />

            <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-20">
                <p className="text-xs text-white/50">Powered by BolaVision</p>
            </footer>
        </div>
    );
};

export default FanViewScreen;

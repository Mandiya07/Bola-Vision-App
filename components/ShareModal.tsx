
import React, { useState, useMemo } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { ShareIcon } from './icons/ControlIcons';
import type { Player } from '../types';
import { encode } from '../utils/mediaUtils';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
    const { state } = useMatchContext();
    const [copySuccess, setCopySuccess] = useState('');

    const publicMatchUrl = useMemo(() => {
        if (!state.homeTeam || !state.awayTeam) return 'Match data not available.';

        // Helper to remove large/unnecessary data from players for the URL
        const stripPlayerStats = (player: Player) => {
            const { stats, ...rest } = player;
            return rest;
        };

        const matchDetails = {
            homeTeam: { ...state.homeTeam, players: state.homeTeam.players.map(stripPlayerStats) },
            awayTeam: { ...state.awayTeam, players: state.awayTeam.players.map(stripPlayerStats) },
            scoreboardTemplate: state.scoreboardTemplate,
            monetization: state.monetization,
            commentaryStyle: state.commentaryStyle,
            commentaryLanguage: state.commentaryLanguage,
            broadcastStyles: state.broadcastStyles,
            matchType: state.matchType,
            officials: state.officials,
            leagueName: state.leagueName,
            matchDate: state.matchDate,
            matchTimeOfDay: state.matchTimeOfDay,
            venue: state.venue,
            weather: state.weather,
            sponsorLogo: state.sponsorLogo,
            adBanner: state.adBanner,
        };

        try {
            const jsonString = JSON.stringify(matchDetails);
            const uint8Array = new TextEncoder().encode(jsonString);
            const encodedData = encode(uint8Array);
            return `${window.location.origin}${window.location.pathname}?matchData=${encodedData}&view=true`;
        } catch (e) {
            console.error("Failed to create share link:", e);
            return 'Error: Could not create link.';
        }
    }, [state]);

    const handleCopy = () => {
        if (!publicMatchUrl || publicMatchUrl.startsWith('Error') || publicMatchUrl.startsWith('Match data')) return;
        navigator.clipboard.writeText(publicMatchUrl).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            setCopySuccess('Failed to copy');
        });
    };
    
    const handleShare = async () => {
        if (!publicMatchUrl || publicMatchUrl.startsWith('Error') || publicMatchUrl.startsWith('Match data')) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Live Match: ${state.homeTeam.name} vs ${state.awayTeam.name}`,
                    text: `Watch ${state.homeTeam.name} vs ${state.awayTeam.name} live on BolaVision!`,
                    url: publicMatchUrl,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            handleCopy();
            alert("Share API not supported. Viewer link copied to clipboard.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 text-white" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2"><ShareIcon className="w-6 h-6" /> Share Your Match</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-4xl leading-none">&times;</button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-300">Share this link with your fans! Anyone with the link can watch your live broadcast in Fan View mode.</p>
                    <div>
                        <label className="text-sm font-semibold text-gray-300">Public Match Link</label>
                        <div className="flex gap-2 mt-1">
                            <input type="text" readOnly value={publicMatchUrl} className="w-full bg-gray-900 text-white border border-gray-600 rounded p-2 text-sm truncate" />
                            <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-3 rounded-md text-sm">{copySuccess || 'Copy'}</button>
                        </div>
                    </div>
                    
                    {navigator.share && (
                         <button onClick={handleShare} className="w-full bg-green-600 hover:bg-green-700 font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2">
                            <ShareIcon className="w-5 h-5" />
                            Share via...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;

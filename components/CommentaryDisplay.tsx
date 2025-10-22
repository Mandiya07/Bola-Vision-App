import React from 'react';
import { LanguageIcon, SpeakerIcon } from './icons/ControlIcons';
import type { CommentaryLanguage } from '../types';
import { useProContext } from '../context/ProContext';

type AudioStatus = 'idle' | 'loading' | 'playing' | 'error';

interface CommentaryDisplayProps {
    text: string;
    audioStatus: AudioStatus;
    selectedLanguage: CommentaryLanguage;
    onLanguageChange: (lang: CommentaryLanguage) => void;
    isTranslating: boolean;
}

const LANGUAGES: { id: CommentaryLanguage; name: string }[] = [
    { id: 'english', name: 'English' },
    { id: 'spanish', name: 'Español' },
    { id: 'french', name: 'Français' },
    { id: 'swahili', name: 'Kiswahili' },
    { id: 'zulu', name: 'isiZulu' },
];

const CommentaryDisplay: React.FC<CommentaryDisplayProps> = ({ text, audioStatus, selectedLanguage, onLanguageChange, isTranslating }) => {
    const { isPro, showUpgradeModal } = useProContext();
    
    const getStatusIndicator = () => {
        if (isTranslating) {
            return <div className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" title="Translating..."></div>;
        }
        switch (audioStatus) {
            case 'loading':
                return <div className="w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" title="Loading audio..."></div>;
            case 'playing':
                return <SpeakerIcon className="w-5 h-5 text-green-400 animate-pulse" title="Playing commentary" />;
            case 'error':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <title>Audio error</title>
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'idle':
            default:
                return <SpeakerIcon className="w-5 h-5 text-gray-500" title="Audio idle" />;
        }
    };
    
    const handleLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isPro) {
            onLanguageChange(e.target.value as CommentaryLanguage);
        } else {
            showUpgradeModal();
        }
    }

    return (
        <div className="absolute top-4 right-4 w-1/4 max-w-sm bg-black bg-opacity-60 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-600 pb-1 mb-2">
                <h3 className="text-sm font-bold text-yellow-300 uppercase tracking-wider">Live Commentary</h3>
                <div className="w-6 h-6 flex items-center justify-center">{getStatusIndicator()}</div>
            </div>
            <p key={text} className="text-white text-sm animate-fade-in-fast min-h-[40px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                {text}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="relative">
                    <LanguageIcon className="w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    {!isPro && <span className="absolute right-8 top-1/2 -translate-y-1/2 text-yellow-400 pointer-events-none">🏆</span>}
                    <select
                        value={selectedLanguage}
                        onChange={handleLanguageSelect}
                        className={`w-full bg-gray-800/50 border border-gray-700 rounded-md py-1 pl-8 pr-8 text-white text-sm focus:ring-2 focus:ring-cyan-500 ${!isPro ? 'opacity-70 cursor-pointer' : ''}`}
                        title={!isPro ? 'Upgrade to Pro to change language' : 'Select commentary language'}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default CommentaryDisplay;
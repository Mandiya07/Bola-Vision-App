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
        <div className="absolute bottom-24 right-4 w-[60%] max-w-[320px] glass-panel border-white/5 p-4 rounded-2xl shadow-2xl animate-fade-in-fast z-20 md:top-6 md:right-6 md:bottom-auto md:w-72 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-display font-bold text-neon-cyan uppercase tracking-[0.3em]">Neural Commentary</h3>
                    <p className="text-[8px] font-display font-bold text-white/30 uppercase tracking-[0.2em] mt-0.5">Real-time Audio Synthesis</p>
                </div>
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)]">{getStatusIndicator()}</div>
            </div>
            
            <div className="relative">
              <p key={text} className="text-white/90 font-body text-xs leading-relaxed animate-fade-in-fast min-h-[50px] whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-hide italic tracking-wide">
                  "{text}"
              </p>
              <div className="absolute -left-1 top-0 w-0.5 h-full bg-neon-cyan/30 rounded-full" />
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
                <div className="relative group">
                    <LanguageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none group-hover:text-neon-cyan transition-colors" />
                    {!isPro && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-neon-yellow text-[10px] pointer-events-none animate-pulse">PRO</span>}
                    <select
                        value={selectedLanguage}
                        onChange={handleLanguageSelect}
                        className={`w-full glass-panel border-white/10 bg-slate-900/40 rounded-xl py-2 pl-10 pr-10 text-white font-display font-bold text-[10px] uppercase tracking-widest focus:border-neon-cyan outline-none transition-all cursor-pointer appearance-none ${!isPro ? 'opacity-50' : ''}`}
                        title={!isPro ? 'Upgrade to Pro to change language' : 'Select commentary language'}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id} className="bg-slate-900 text-white">{lang.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                      <svg className="w-2.5 h-2.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentaryDisplay;

import React, { useState, useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import type { Stats } from '../types';

interface StatsOverlayProps {
    isVisible: boolean;
    onClose: () => void;
}

const STAT_ORDER: { key: keyof Stats; label: string }[] = [
    { key: 'goals', label: 'Goals' },
    { key: 'possession', label: 'Possession' },
    { key: 'shotsOnTarget', label: 'Shots on Target' },
    { key: 'shotsOffTarget', label: 'Shots Off Target' },
    { key: 'saves', label: 'Saves' },
    { key: 'corners', label: 'Corners' },
    { key: 'offsides', label: 'Offsides' },
    { key: 'fouls', label: 'Fouls' },
    { key: 'yellowCards', label: 'Yellow Cards' },
    { key: 'redCards', label: 'Red Cards' },
];

const StatDisplay: React.FC<{stat: { key: keyof Stats; label: string }}> = ({ stat }) => {
    const { state } = useMatchContext();
    const { homeStats, awayStats, homeTeam, awayTeam } = state;
    
    const defaultHomeColor = '#3b82f6';
    const defaultAwayColor = '#ef4444';

    let homeValue: string | number = homeStats[stat.key];
    let awayValue: string | number = awayStats[stat.key];

    if (stat.key === 'possession') {
        return (
            <div className="flex flex-col items-center justify-center text-center p-4 h-32">
                <h3 className="text-2xl font-bold uppercase tracking-wider text-gray-300 mb-4">{stat.label}</h3>
                <div className="w-full flex items-center text-2xl font-bold">
                    <span style={{ color: homeTeam.color || defaultHomeColor }}>{homeValue}%</span>
                    <div className="flex-grow h-4 bg-gray-700 rounded-full mx-4">
                        <div 
                            className="h-4 rounded-full"
                            style={{ width: `${homeValue}%`, backgroundColor: homeTeam.color || defaultHomeColor, transition: 'width 0.5s ease-in-out' }}
                        ></div>
                    </div>
                    <span style={{ color: awayTeam.color || defaultAwayColor }}>{awayValue}%</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between text-center p-4 h-32">
            <span className="text-5xl font-black w-1/4" style={{ color: homeTeam.color || defaultHomeColor }}>{homeValue}</span>
            <h3 className="text-2xl font-bold uppercase tracking-wider text-gray-300 w-1/2">{stat.label}</h3>
            <span className="text-5xl font-black w-1/4" style={{ color: awayTeam.color || defaultAwayColor }}>{awayValue}</span>
        </div>
    );
};


const StatsOverlay: React.FC<StatsOverlayProps> = ({ isVisible, onClose }) => {
    const { state } = useMatchContext();
    const [currentStatIndex, setCurrentStatIndex] = useState(0);
    const [timerProgressKey, setTimerProgressKey] = useState(0); // to reset animation

    const handleNext = () => {
        setCurrentStatIndex(prev => (prev + 1) % STAT_ORDER.length);
    };

    useEffect(() => {
        if (!isVisible) return;

        const timer = setTimeout(() => {
            handleNext();
        }, 5000);

        setTimerProgressKey(prev => prev + 1); // Reset animation on stat change

        return () => clearTimeout(timer);
    }, [currentStatIndex, isVisible]);
    
    if (!isVisible) return null;
    
    const { homeTeam, awayTeam, homeStats, awayStats } = state;

    const handlePrev = () => {
        setCurrentStatIndex(prev => (prev - 1 + STAT_ORDER.length) % STAT_ORDER.length);
    };

    const handleDotClick = (index: number) => {
        setCurrentStatIndex(index);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl text-white border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-yellow-300">Match Statistics</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                </div>
                
                {/* Teams & Score */}
                <div className="flex justify-around items-center p-4">
                    <div className="flex flex-col items-center gap-2 text-center w-1/3">
                        {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 md:w-16 md:h-16 object-contain" />}
                        <span className="font-bold text-lg truncate" style={{ color: homeTeam.color || '#3b82f6' }}>{homeTeam.name}</span>
                    </div>
                    <div className="text-4xl font-black">
                        <span style={{ color: homeTeam.color || '#3b82f6' }}>{homeStats.goals}</span>
                        <span className="mx-2">-</span>
                        <span style={{ color: awayTeam.color || '#ef4444' }}>{awayStats.goals}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center w-1/3">
                        {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 md:w-16 md:h-16 object-contain" />}
                        <span className="font-bold text-lg truncate" style={{ color: awayTeam.color || '#ef4444' }}>{awayTeam.name}</span>
                    </div>
                </div>
                
                {/* Stats Carousel */}
                <div className="relative p-4 bg-gray-900/50">
                    <div key={currentStatIndex} className="animate-fade-in-fast">
                      <StatDisplay stat={STAT_ORDER[currentStatIndex]} />
                    </div>

                    <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-700/50 hover:bg-gray-600 rounded-full p-2 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-700/50 hover:bg-gray-600 rounded-full p-2 transition">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <div className="flex justify-center items-center gap-2 mt-4">
                        {STAT_ORDER.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => handleDotClick(index)}
                                className={`w-3 h-3 rounded-full transition ${currentStatIndex === index ? 'bg-yellow-400' : 'bg-gray-600 hover:bg-gray-500'}`}
                            />
                        ))}
                    </div>
                </div>
                {/* Timer progress bar */}
                 <div className="h-1 bg-yellow-400" key={timerProgressKey} style={{ animation: 'shrink 5s linear forwards' }}></div>
            </div>
        </div>
    );
};

export default StatsOverlay;

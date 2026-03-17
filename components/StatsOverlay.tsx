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

    const homeValue: string | number = homeStats[stat.key];
    const awayValue: string | number = awayStats[stat.key];

    if (stat.key === 'possession') {
        return (
            <div className="flex flex-col items-center justify-center text-center p-6 h-40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
                <h3 className="text-[10px] font-display font-bold uppercase tracking-[0.4em] text-white/40 mb-6">{stat.label} Analysis</h3>
                <div className="w-full flex items-center justify-between gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-display font-black italic" style={{ color: homeTeam.color || defaultHomeColor, textShadow: `0 0 15px ${homeTeam.color || defaultHomeColor}80` }}>{homeValue}%</span>
                      <span className="text-[8px] font-display font-bold text-white/30 uppercase tracking-widest mt-1">Home</span>
                    </div>
                    
                    <div className="flex-grow relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                        <div 
                            className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                            style={{ width: `${homeValue}%`, backgroundColor: homeTeam.color || defaultHomeColor }}
                        >
                          <div className="absolute top-0 right-0 w-1 h-full bg-white/40 animate-pulse" />
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-display font-black italic" style={{ color: awayTeam.color || defaultAwayColor, textShadow: `0 0 15px ${awayTeam.color || defaultAwayColor}80` }}>{awayValue}%</span>
                      <span className="text-[8px] font-display font-bold text-white/30 uppercase tracking-widest mt-1">Away</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between text-center p-6 h-40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
            <div className="flex flex-col items-center w-1/4">
              <span className="text-6xl font-display font-black italic" style={{ color: homeTeam.color || defaultHomeColor, textShadow: `0 0 20px ${homeTeam.color || defaultHomeColor}80` }}>{homeValue}</span>
              <div className="w-8 h-0.5 mt-2 bg-white/10" />
            </div>
            
            <div className="flex flex-col items-center w-1/2">
              <h3 className="text-[10px] font-display font-bold uppercase tracking-[0.5em] text-white/40 mb-2">Metric</h3>
              <div className="relative px-6 py-2 border-x border-white/10">
                <h3 className="text-xl font-display font-black uppercase tracking-widest text-white">{stat.label}</h3>
                <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-neon-cyan opacity-50" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-neon-cyan opacity-50" />
              </div>
            </div>

            <div className="flex flex-col items-center w-1/4">
              <span className="text-6xl font-display font-black italic" style={{ color: awayTeam.color || defaultAwayColor, textShadow: `0 0 20px ${awayTeam.color || defaultAwayColor}80` }}>{awayValue}</span>
              <div className="w-8 h-0.5 mt-2 bg-white/10" />
            </div>
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

        const progressTimer = setTimeout(() => {
            setTimerProgressKey(prev => prev + 1); // Reset animation on stat change
        }, 0);

        return () => {
            clearTimeout(timer);
            clearTimeout(progressTimer);
        };
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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
            <div className="glass-panel border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-2xl text-white overflow-hidden rounded-[2rem] relative" onClick={e => e.stopPropagation()}>
                {/* Decorative scanline */}
                <div className="scanline opacity-20" />
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
                    <div className="flex flex-col">
                      <h2 className="text-[10px] font-display font-bold text-neon-cyan uppercase tracking-[0.4em]">Data Stream</h2>
                      <p className="text-xl font-display font-black text-white uppercase tracking-tight">Match Intelligence</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-neon-cyan hover:border-neon-cyan transition-all group">
                      <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                {/* Teams & Score */}
                <div className="flex justify-around items-center p-8 bg-gradient-to-b from-white/5 to-transparent">
                    <div className="flex flex-col items-center gap-4 text-center w-1/3 group">
                        <div className="relative">
                          {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-16 h-16 md:w-20 md:h-20 object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />}
                          <div className="absolute -inset-2 border border-white/5 rounded-full animate-spin-slow opacity-20" />
                        </div>
                        <span className="font-display font-black text-xs uppercase tracking-[0.2em] truncate max-w-full" style={{ color: homeTeam.color || '#3b82f6' }}>{homeTeam.name}</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-6xl font-display font-black italic tracking-tighter flex items-center gap-4">
                          <span style={{ color: homeTeam.color || '#3b82f6', textShadow: `0 0 20px ${homeTeam.color || '#3b82f6'}80` }}>{homeStats.goals}</span>
                          <span className="text-white/20 text-4xl not-italic font-light">/</span>
                          <span style={{ color: awayTeam.color || '#ef4444', textShadow: `0 0 20px ${awayTeam.color || '#ef4444'}80` }}>{awayStats.goals}</span>
                      </div>
                      <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-display font-bold text-white/40 uppercase tracking-[0.3em]">Live Feed</div>
                    </div>

                    <div className="flex flex-col items-center gap-4 text-center w-1/3 group">
                        <div className="relative">
                          {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-16 h-16 md:w-20 md:h-20 object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />}
                          <div className="absolute -inset-2 border border-white/5 rounded-full animate-spin-slow opacity-20" />
                        </div>
                        <span className="font-display font-black text-xs uppercase tracking-[0.2em] truncate max-w-full" style={{ color: awayTeam.color || '#ef4444' }}>{awayTeam.name}</span>
                    </div>
                </div>
                
                {/* Stats Carousel */}
                <div className="relative p-8 bg-black/20">
                    <div key={currentStatIndex} className="animate-fade-in-fast">
                      <StatDisplay stat={STAT_ORDER[currentStatIndex]} />
                    </div>

                    <button onClick={handlePrev} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-neon-cyan hover:border-neon-cyan hover:bg-neon-cyan/10 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={handleNext} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-neon-cyan hover:border-neon-cyan hover:bg-neon-cyan/10 transition-all">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <div className="flex justify-center items-center gap-3 mt-8">
                        {STAT_ORDER.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => handleDotClick(index)}
                                className={`h-1 rounded-full transition-all duration-500 ${currentStatIndex === index ? 'w-8 bg-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.5)]' : 'w-2 bg-white/10 hover:bg-white/30'}`}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Timer progress bar */}
                <div className="relative h-1 bg-white/5 overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.5)]" key={timerProgressKey} style={{ animation: 'shrink 5s linear forwards' }}></div>
                </div>
            </div>
        </div>
    );
};

export default StatsOverlay;

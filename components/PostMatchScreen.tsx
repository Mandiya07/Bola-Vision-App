import React, { useState, useEffect, useRef } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { useProContext } from '../context/ProContext';
import { generateMatchSummary, selectPlayerOfTheMatch, generateHighlightReelSequence } from '../services/geminiService';
import { uploadHighlight } from '../services/publishService';
import type { GameEvent, Highlight, PenaltyAttempt, Team } from '../types';
import { GoalIcon, YellowCardIcon, RedCardIcon, SubstitutionIcon, TrophyIcon, CheckCircleIcon, XCircleIcon, MedicalIcon, FilmReelIcon, ShareIcon, CloudUploadIcon } from './icons/ControlIcons';
import PlayerOfTheMatchGraphic from './PlayerOfTheMatchGraphic';
import AdvancedAnalytics from './AdvancedAnalytics';
import HighlightReelPlayer from './HighlightReelPlayer';

const BOLA_VISION_TAGLINE = "“Your Game, Our Vision.”";

interface PostMatchScreenProps {
  onReturnToSetup: () => void;
}

const StatDisplay: React.FC<{ label: string; homeValue: string | number; awayValue: string | number }> = ({ label, homeValue, awayValue }) => (
    <div className="flex justify-between items-center glass-panel border-white/5 p-4 rounded-xl text-lg relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="font-display font-black italic text-white z-10">{homeValue}</span>
        <span className="text-white/40 text-[10px] font-display font-bold uppercase tracking-[0.3em] z-10">{label}</span>
        <span className="font-display font-black italic text-white z-10">{awayValue}</span>
    </div>
);

const getEventIcon = (type: GameEvent['type']) => {
    switch (type) {
        case 'GOAL':
            return <GoalIcon className="w-5 h-5 text-yellow-300" />;
        case 'YELLOW_CARD':
            return <YellowCardIcon className="w-5 h-5" />;
        case 'RED_CARD':
            return <RedCardIcon className="w-5 h-5" />;
        case 'SUBSTITUTION':
            return <SubstitutionIcon className="w-5 h-5 text-orange-400" />;
        case 'INJURY':
            return <MedicalIcon className="w-5 h-5 text-cyan-400" />;
        default:
            return null;
    }
};

const getEventText = (event: GameEvent): string => {
    const playerName = event.playerName ? ` ${event.playerName}` : '';
    switch (event.type) {
        case 'GOAL':
            return `Goal!${playerName}`;
        case 'YELLOW_CARD':
            return `Yellow Card${playerName}`;
        case 'RED_CARD':
            return `Red Card${playerName}`;
        case 'SUBSTITUTION':
            return `Sub: ${event.playerIn?.name} for ${event.playerOut?.name}`;
        case 'INJURY':
            return `Injury${playerName} - ${event.details || ''}`;
        case 'SAVE':
            return `Save!${playerName}`;
        case 'SHOT_ON_TARGET':
            return `Shot on Target${playerName}`;
        default:
            return '';
    }
};

const PenaltyShootoutSummary: React.FC<{ team: Team, attempts: PenaltyAttempt[] }> = ({ team, attempts }) => (
    <div>
        <h4 className="font-bold text-center mb-2" style={{color: team.color}}>{team.name}</h4>
        <div className="space-y-1">
            {attempts.map((attempt, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-900/50 p-1.5 rounded">
                    <span className="truncate w-2/3">({attempt.playerNumber}) {attempt.playerName}</span>
                    {attempt.outcome === 'goal' 
                        ? <CheckCircleIcon className="w-5 h-5 text-green-400" />
                        : <XCircleIcon className="w-5 h-5 text-red-400" />
                    }
                </div>
            ))}
        </div>
    </div>
);


const EventTimeline: React.FC = () => {
    const { state } = useMatchContext();
    const keyEvents = state.events.filter(e =>
        ['GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'INJURY'].includes(e.type)
    );
    
    return (
        <div className="w-full max-w-md mx-auto glass-panel border-white/5 p-6 rounded-2xl space-y-3 max-h-64 overflow-y-auto scrollbar-hide relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />
            {keyEvents.map(event => (
                <div key={event.id} className="flex items-center gap-4 text-white group">
                    <span className="font-display font-black text-xs w-10 text-center text-white/40 group-hover:text-neon-cyan transition-colors">{Math.floor(event.matchTime / 60)}'</span>
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center z-10 group-hover:border-neon-cyan transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                      {getEventIcon(event.type)}
                    </div>
                    <span className="flex-1 truncate font-body text-sm tracking-wide group-hover:translate-x-1 transition-transform">{getEventText(event)}</span>
                </div>
            ))}
            {keyEvents.length === 0 && <p className="text-white/30 text-center font-display font-bold text-[10px] uppercase tracking-widest py-8">No key events recorded</p>}
        </div>
    );
};

const HighlightUploadQueue: React.FC = () => {
    const { state } = useMatchContext();
    const { highlights, matchId } = state;
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: highlights.length });
    const [status, setStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
    const hasRunRef = useRef(false);

    useEffect(() => {
        const uploadAll = async () => {
            if (!matchId || highlights.length === 0 || hasRunRef.current) return;
            hasRunRef.current = true;
            setStatus('uploading');

            for (let i = 0; i < highlights.length; i++) {
                try {
                    setUploadProgress({ current: i + 1, total: highlights.length });
                    await uploadHighlight(matchId, highlights[i]);
                } catch (e) {
                    console.error(`Failed to upload highlight ${highlights[i].id}`, e);
                    setStatus('error');
                    return; // Stop on first error
                }
            }
            setStatus('complete');
        };
        uploadAll();
    }, [highlights, matchId]);

    if (highlights.length === 0) return null;

    let message = '';
    let icon = <CloudUploadIcon className="w-6 h-6 text-purple-400" />;
    switch (status) {
        case 'idle':
            message = 'Preparing to upload highlights...';
            icon = <CloudUploadIcon className="w-6 h-6 text-gray-400" />;
            break;
        case 'uploading':
            message = `Uploading highlight ${uploadProgress.current} of ${uploadProgress.total}...`;
            icon = <CloudUploadIcon className="w-6 h-6 text-purple-400 animate-pulse" />;
            break;
        case 'complete':
            message = `All ${uploadProgress.total} highlights published! They are now available on the team and highlights pages on BolaVision.com.`;
            icon = <CheckCircleIcon className="w-6 h-6 text-green-400" />;
            break;
        case 'error':
            message = 'An error occurred during upload. Check console for details.';
            icon = <XCircleIcon className="w-6 h-6 text-red-400" />;
            break;
    }

    return (
        <div className="mt-6 text-center border-t-2 border-gray-700 pt-4">
            <h3 className="text-xl font-bold text-white mb-3">Publishing Highlights to BolaVision.com</h3>
            <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto flex items-center justify-center gap-3">
                {icon}
                <p className="text-gray-300">{message}</p>
            </div>
        </div>
    );
};

type PostMatchTab = 'overview' | 'highlights' | 'analytics' | 'report';

const PostMatchScreen: React.FC<PostMatchScreenProps> = ({ onReturnToSetup }) => {
    const { state, dispatch } = useMatchContext();
    const { isPro, showUpgradeModal } = useProContext();
    const [report, setReport] = useState('');
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [error, setError] = useState('');
    const [potm, setPotm] = useState<typeof state.playerOfTheMatch>(state.playerOfTheMatch);
    const [isPotmLoading, setIsPotmLoading] = useState(false);
    const [potmError, setPotmError] = useState('');
    const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
    const [activeTab, setActiveTab] = useState<PostMatchTab>('overview');
    const [isReelLoading, setIsReelLoading] = useState(false);
    const [reelError, setReelError] = useState('');

    const { homeTeam, awayTeam, homeStats, awayStats, penaltyShootout, officials, leagueName, venue, highlightReel } = state;


    useEffect(() => {
        if (state.highlights.length > 0 && !activeHighlight) {
            setActiveHighlight(state.highlights[0]);
        }
    }, [state.highlights, activeHighlight]);

    const handleGenerateReport = async () => {
        if (!isPro) {
            showUpgradeModal();
            return;
        }
        setIsLoadingReport(true);
        setError('');
        setReport('');
        try {
            const summary = await generateMatchSummary(state);
            setReport(summary);
        } catch (e) {
            setError('Failed to generate AI report. Please try again later.');
            console.error(e);
        } finally {
            setIsLoadingReport(false);
        }
    };

    const handleSelectPotm = async () => {
        if (!isPro) {
            showUpgradeModal();
            return;
        }
        setIsPotmLoading(true);
        setPotmError('');
        setPotm(null);
        try {
            const result = await selectPlayerOfTheMatch(state);
            setPotm(result);
            dispatch({ type: 'SET_PLAYER_OF_THE_MATCH', payload: result });
        } catch (e) {
            setPotmError('Failed to select Player of the Match. Please try again.');
            console.error(e);
        } finally {
            setIsPotmLoading(false);
        }
    };
    
    const handleGenerateReel = async () => {
        if (!isPro) {
            showUpgradeModal();
            return;
        }
        setIsReelLoading(true);
        setReelError('');
        try {
            const sequenceIds = await generateHighlightReelSequence(state.highlights, state);
            // Create the ordered highlight array
            const orderedHighlights = sequenceIds
                .map(id => state.highlights.find(h => h.id === id))
                .filter((h): h is Highlight => h !== undefined);
            dispatch({ type: 'SET_HIGHLIGHT_REEL', payload: orderedHighlights });
        } catch (e) {
            setReelError('Failed to generate AI highlight reel.');
            console.error(e);
        } finally {
            setIsReelLoading(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-fast">
                        <section>
                            <h2 className="text-2xl font-bold text-center text-white mb-4">Match Statistics</h2>
                            <div className="space-y-2 text-white">
                                <StatDisplay label="Possession" homeValue={`${homeStats.possession}%`} awayValue={`${awayStats.possession}%`} />
                                <StatDisplay label="Shots on Target" homeValue={homeStats.shotsOnTarget} awayValue={awayStats.shotsOnTarget} />
                                <StatDisplay label="Fouls" homeValue={homeStats.fouls} awayValue={awayStats.fouls} />
                            </div>
                        </section>
                        <section>
                            <h2 className="text-2xl font-bold text-center text-white mb-4">Match Officials</h2>
                            <div className="space-y-2 text-white bg-gray-800/50 p-3 rounded-lg">
                                {officials.length > 0 ? officials.map(official => (
                                     <div key={official.role} className="flex justify-between items-center">
                                        <span className="text-gray-300 text-sm">{official.role}</span>
                                        <span className="font-semibold">{official.name}</span>
                                    </div>
                                )) : <p className="text-gray-400 text-center text-sm">No officials were logged.</p>}
                            </div>
                             <button
                                onClick={() => dispatch({ type: 'OPEN_SOCIAL_MODAL', payload: { type: 'FINAL_SCORE' } })}
                                className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 flex items-center gap-2 justify-center"
                            >
                                <ShareIcon className="w-5 h-5" />
                                Generate Final Score Post
                            </button>
                        </section>
                        <section className="lg:col-span-2">
                            <h2 className="text-2xl font-bold text-center text-white mb-4">Key Events</h2>
                            <EventTimeline />
                        </section>
                        {penaltyShootout && (
                            <section className="lg:col-span-2 bg-gray-800/50 p-4 rounded-lg">
                                <h2 className="text-2xl font-bold text-center text-white mb-4">Penalty Shootout</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <PenaltyShootoutSummary team={homeTeam} attempts={penaltyShootout.homeAttempts} />
                                    <PenaltyShootoutSummary team={awayTeam} attempts={penaltyShootout.awayAttempts} />
                                </div>
                            </section>
                        )}
                    </div>
                );
            case 'highlights':
                return (
                    <section className="bg-gray-800/50 p-4 rounded-lg animate-fade-in-fast">
                         <h2 className="text-2xl font-bold text-center text-white mb-4">Match Highlights</h2>
                         {state.highlights.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div className="md:col-span-2 bg-black rounded-lg overflow-hidden">
                                     {activeHighlight && (
                                         <video key={activeHighlight.videoUrl} src={activeHighlight.videoUrl} controls autoPlay className="w-full h-full aspect-video" />
                                     )}
                                 </div>
                                 <div className="md:col-span-1 bg-black/30 p-2 rounded-lg max-h-72 overflow-y-auto">
                                     <ul className="space-y-2 mt-2">
                                         {state.highlights.map(h => (
                                             <li
                                                 key={h.id}
                                                 onClick={() => setActiveHighlight(h)}
                                                 className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition ${activeHighlight?.id === h.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                             >
                                                 {getEventIcon(h.event.type)}
                                                 <div className="text-sm text-white">
                                                     <p className="font-bold truncate">{getEventText(h.event)}</p>
                                                     <p className="text-xs text-gray-400">{Math.floor(h.event.matchTime / 60)}' min</p>
                                                 </div>
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center text-gray-400 p-8">
                                 <p>No highlight clips were automatically generated for this match.</p>
                                 <p className="text-sm mt-2">Highlights for goals, saves, and red cards are captured automatically.</p>
                             </div>
                         )}

                        <div className="mt-6 text-center border-t-2 border-gray-700 pt-4">
                            <h3 className="text-xl font-bold text-white mb-3">AI Highlight Reel 🏆</h3>
                            {!isPro ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <p className="text-gray-300 text-sm mb-3">Upgrade to let our AI automatically edit your clips into a cinematic highlight reel.</p>
                                    <button onClick={showUpgradeModal} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg">
                                        Upgrade to Pro
                                    </button>
                                </div>
                            ) : highlightReel ? (
                                <HighlightReelPlayer reel={highlightReel} />
                            ) : (
                                <>
                                    <button
                                        onClick={handleGenerateReel}
                                        disabled={isReelLoading || state.highlights.length === 0}
                                        className="bg-indigo-600 hover:bg-indigo-700 font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                                    >
                                        {isReelLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Creating...</span>
                                            </>
                                        ) : (
                                             <>
                                                <FilmReelIcon className="w-5 h-5" />
                                                Generate AI Reel
                                            </>
                                        )}
                                    </button>
                                    {reelError && <p className="text-red-400 text-xs mt-1">{reelError}</p>}
                                </>
                            )}
                        </div>
                        <HighlightUploadQueue />
                    </section>
                );
            case 'analytics':
                 return (
                    <section className="bg-gray-800/50 p-4 rounded-lg animate-fade-in-fast">
                         <h2 className="text-xl font-bold text-center text-white mb-2">Advanced Match Analytics {!isPro && '🏆'}</h2>
                         {isPro ? (
                            <AdvancedAnalytics />
                         ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <p className="text-gray-300 mb-4">Review player heatmaps and shot charts by upgrading.</p>
                                <button onClick={showUpgradeModal} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg">
                                    Upgrade to Pro
                                </button>
                            </div>
                         )}
                    </section>
                 );
            case 'report':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-fast">
                        <section className="flex flex-col items-center justify-center bg-gray-800/50 p-4 rounded-lg min-h-[300px]">
                            <h2 className="text-2xl font-bold text-center text-white mb-4">Player of the Match {!isPro && '🏆'}</h2>
                            {potm ? (
                                 <PlayerOfTheMatchGraphic
                                    player={potm.player}
                                    team={potm.team === 'home' ? homeTeam : awayTeam}
                                    reasoning={potm.reasoning}
                                />
                            ) : isPotmLoading ? (
                                 <div className="flex items-center justify-center gap-3 text-gray-300">
                                   <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                   <span>AI is analyzing performances...</span>
                                </div>
                            ) : (
                                <div className="text-center">
                                    {potmError && <p className="text-red-400 mb-4">{potmError}</p>}
                                    <button
                                        onClick={handleSelectPotm}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 flex items-center gap-2 mx-auto"
                                    >
                                        <TrophyIcon className="w-6 h-6" />
                                        Let AI Decide
                                    </button>
                                </div>
                            )}
                        </section>

                         <section className="bg-gray-800/50 p-4 rounded-lg flex flex-col">
                            <h2 className="text-2xl font-bold text-center text-white mb-4">AI Match Summary { !isPro && '🏆' }</h2>
                            <div className="flex-grow flex items-center justify-center">
                                {report && <div className="text-gray-300 whitespace-pre-wrap animate-fade-in-fast max-h-64 overflow-y-auto p-2">{report}</div>}
                                {isLoadingReport && (
                                    <div className="flex items-center justify-center gap-3 text-gray-300">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>AI is writing the report...</span>
                                    </div>
                                )}
                                {error && <p className="text-red-400 text-center">{error}</p>}
                                {!report && !isLoadingReport && !error && (
                                    <div className="text-center">
                                        <button onClick={handleGenerateReport} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105">
                                            Generate Report
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                );
        }
    }
    
    const TabButton: React.FC<{tab: PostMatchTab, label: string}> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-xs md:text-sm font-display font-black uppercase tracking-[0.2em] transition-all relative group ${activeTab === tab ? 'text-neon-cyan' : 'text-white/40 hover:text-white'}`}
        >
            {label}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.5)] rounded-full" />
            )}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-white/20 group-hover:w-full transition-all duration-300 rounded-full" />
        </button>
    );

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pitch-background animate-fade-in relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 blur-[120px] rounded-full" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-emerald/5 blur-[120px] rounded-full" />
              <div className="scanline opacity-10" />
            </div>

            <div className="w-full max-w-6xl glass-panel border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-8 md:p-12 space-y-8 rounded-[3rem] relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-4">
                    <div className="flex flex-col items-center md:items-start">
                        <h1 className="text-4xl font-display font-black text-neon-cyan uppercase tracking-tighter italic">BolaVision</h1>
                        <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.5em] mt-1">{BOLA_VISION_TAGLINE}</p>
                    </div>
                    <div className="px-6 py-2 glass-panel border-white/5 bg-white/5 rounded-2xl text-center">
                        <p className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] mb-1">Match Session Log</p>
                        <p className="text-sm font-display font-black text-white uppercase tracking-widest">{leagueName || 'Standard Protocol'}{venue && ` // ${venue}`}</p>
                    </div>
                </div>

                <header className="text-center relative">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" />
                    <h1 className="text-6xl md:text-8xl font-display font-black text-white uppercase tracking-tighter italic relative z-10 mix-blend-overlay opacity-20 select-none">FULL TIME</h1>
                    <h1 className="text-4xl md:text-6xl font-display font-black text-white uppercase tracking-widest absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full">FINAL RESULT</h1>
                    
                     <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative">
                              {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-20 h-20 md:w-28 md:h-28 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />}
                              <div className="absolute -inset-4 border border-white/5 rounded-full animate-spin-slow opacity-20" />
                            </div>
                            <span className="text-xl font-display font-black uppercase tracking-widest" style={{ color: homeTeam.color || 'white' }}>{homeTeam.name}</span>
                        </div>

                        <div className="relative flex flex-col items-center">
                            <div className="glass-panel border-white/10 bg-black/40 px-10 py-6 rounded-[2rem] flex items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                {penaltyShootout && <span className="text-2xl font-display font-bold text-white/30 italic">({penaltyShootout.homeScore})</span>}
                                <span className="text-7xl font-display font-black italic" style={{ color: homeTeam.color || 'white', textShadow: `0 0 20px ${homeTeam.color || 'white'}80` }}>{homeStats.goals}</span>
                                <span className="text-4xl font-light text-white/20">:</span>
                                <span className="text-7xl font-display font-black italic" style={{ color: awayTeam.color || 'white', textShadow: `0 0 20px ${awayTeam.color || 'white'}80` }}>{awayStats.goals}</span>
                                {penaltyShootout && <span className="text-2xl font-display font-bold text-white/30 italic">({penaltyShootout.awayScore})</span>}
                            </div>
                            {penaltyShootout?.winner && (
                                <div className="absolute -bottom-4 bg-neon-cyan text-slate-950 px-4 py-1 rounded-full text-[10px] font-display font-black uppercase tracking-widest shadow-[0_0_15px_rgba(0,243,255,0.5)]">
                                    {penaltyShootout.winner === 'home' ? homeTeam.name : awayTeam.name} Victory via Penalties
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative">
                              {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-20 h-20 md:w-28 md:h-28 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />}
                              <div className="absolute -inset-4 border border-white/5 rounded-full animate-spin-slow opacity-20" />
                            </div>
                            <span className="text-xl font-display font-black uppercase tracking-widest" style={{ color: awayTeam.color || 'white' }}>{awayTeam.name}</span>
                        </div>
                    </div>
                </header>
                
                <nav className="flex justify-center gap-2 md:gap-8 border-b border-white/5 pb-2">
                    <TabButton tab="overview" label="Overview" />
                    <TabButton tab="highlights" label="Highlights" />
                    <TabButton tab="analytics" label="Analytics" />
                    <TabButton tab="report" label="Neural Report" />
                </nav>

                <main>
                    {renderContent()}
                </main>
                
                <footer className="text-center pt-8 border-t border-white/5">
                    <button 
                      onClick={onReturnToSetup} 
                      className="glass-panel border-white/10 bg-white/5 hover:bg-white/10 text-white font-display font-black uppercase tracking-[0.3em] py-4 px-12 text-sm rounded-2xl transition-all hover:scale-105 hover:border-neon-cyan hover:text-neon-cyan shadow-xl"
                    >
                        Return to Command Center
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PostMatchScreen;
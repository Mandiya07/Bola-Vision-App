
import React, { useState, useEffect, MouseEvent } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { useProContext } from '../context/ProContext';
import { PlayIcon, PauseIcon, ReplayIcon, StatsIcon, PlayerStatsIcon, ChevronUpIcon, ChevronDownIcon, SubstitutionIcon, SaveIcon, BrainIcon, RecordIcon, MicrophoneIcon, TacticsIcon, LiveTacticsIcon, FormationIcon, PollIcon, VarIcon, SpotlightIcon, CameraIcon } from './icons/ControlIcons';
import type { GameEvent, GameEventType, Player, Point, PenaltyAttempt, Poll } from '../types';
import { saveEncryptedState } from '../services/storageService';
import { generatePlayerSpotlightText } from '../services/geminiService';
import PlayerSelector from './PlayerSelector';
import EventButtons from './EventButtons';

interface ShotLoggerProps {
  onLogLocation: (location: Point) => void;
}

const ShotLogger: React.FC<ShotLoggerProps> = ({ onLogLocation }) => {
  const handlePitchClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onLogLocation({ x, y });
  };
  const tooltipClass = "absolute bottom-full mb-3 w-max max-w-xs px-4 py-2 text-[10px] font-display font-bold uppercase tracking-widest text-neon-cyan glass-panel border-neon-cyan/30 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.2)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none text-center z-50";

  return (
    <div className="glass-panel border-neon-cyan/20 p-3 rounded-xl flex items-center justify-center gap-4 animate-fade-in-fast mb-4">
      <p className="text-xs font-display font-bold text-white/60 uppercase tracking-widest">Target Acquisition:</p>
      <div className="relative group">
        <div 
          className="w-28 h-36 bg-slate-900/60 border border-neon-cyan/30 rounded-lg relative cursor-crosshair overflow-hidden group-hover:border-neon-cyan/60 transition-colors"
          style={{ background: 'radial-gradient(circle at center, rgba(0,243,255,0.1) 0%, transparent 70%)' }}
          onClick={handlePitchClick}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-[length:10px_10px]"></div>
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-8 border border-neon-cyan/30 rounded-b-lg border-t-0"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-8 border border-neon-cyan/30 rounded-t-lg border-b-0"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-neon-cyan/20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-neon-cyan/40 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-neon-cyan rounded-full animate-ping"></div>
          </div>
        </div>
        <span className={`${tooltipClass} left-1/2 -translate-x-1/2 w-56`}>Calibrate spatial coordinates for tactical ballistic analysis.</span>
      </div>
    </div>
  );
};

interface ControlPanelProps {
  toggleAd: () => void;
  toggleReplay: () => void;
  toggleStats: () => void;
  togglePlayerStats: () => void;
  toggleInstructions: () => void;
  toggleSubModal: () => void;
  toggleTacticsBoard: () => void;
  toggleFormationDisplay: () => void;
  isAdvancedAnalysisEnabled: boolean;
  toggleAdvancedAnalysis: () => void;
  isPoseLandmarkerLoading: boolean;
  autoSaveMessage: string;
  recordingSaveMessage: string;
  isRecording: boolean;
  toggleRecording: () => void;
  isOnline: boolean;
  isLiveTacticsOn: boolean;
  toggleLiveTactics: () => void;
  onManualTacticsFetch: () => void;
  isFetchingSuggestion: boolean;
  onTriggerVarCheck: (event: GameEvent) => void;
  showHeatmap: boolean;
  toggleHeatmap: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    toggleReplay, 
    toggleStats,
    togglePlayerStats,
    toggleSubModal, 
    toggleTacticsBoard,
    toggleFormationDisplay,
    isAdvancedAnalysisEnabled,
    toggleAdvancedAnalysis,
    isPoseLandmarkerLoading,
    autoSaveMessage,
    recordingSaveMessage,
    isRecording,
    toggleRecording,
    isOnline,
    isLiveTacticsOn,
    toggleLiveTactics,
    onTriggerVarCheck,
    showHeatmap,
    toggleHeatmap
}) => {
  const { state, dispatch, processGameEventWithCommentary } = useMatchContext();
  const { isPro, showUpgradeModal } = useProContext();
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>(
    state.homeTeam.players.length > 0 ? state.homeTeam.players[0] : undefined
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [injuryTimeInput, setInjuryTimeInput] = useState('2');
  const [shotToLogId, setShotToLogId] = useState<number | null>(null);
  const [isSpotlightLoading, setIsSpotlightLoading] = useState(false);
  
  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  const [lastContentiousEvent, setLastContentiousEvent] = useState<GameEvent | null>(null);

  const tooltipClass = "absolute bottom-full mb-3 w-max max-w-xs px-4 py-2 text-[10px] font-display font-bold uppercase tracking-widest text-neon-cyan glass-panel border-neon-cyan/30 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.2)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none text-center z-50";
  
  const handleProFeatureClick = (featureAction: () => void) => {
    if (isPro) {
        featureAction();
    } else {
        showUpgradeModal();
    }
  };

  const currentTeam = selectedTeam === 'home' ? state.homeTeam : state.awayTeam;

  useEffect(() => {
    // Sync selected team with penalty shootout current taker
    if (state.matchPeriod === 'penaltyShootout' && state.penaltyShootout) {
        if (selectedTeam !== state.penaltyShootout.currentTaker) {
            setSelectedTeam(state.penaltyShootout.currentTaker);
        }
    }
  }, [state.matchPeriod, state.penaltyShootout, selectedTeam]);

  useEffect(() => {
    // Update selectedPlayer if the team's player list changes (e.g., substitution)
    if (selectedPlayer) {
      const updatedPlayer = currentTeam.players.find(p => p.number === selectedPlayer.number);
      setSelectedPlayer(updatedPlayer);
    } else if (currentTeam.players.length > 0) {
      setSelectedPlayer(currentTeam.players[0]);
    }
  }, [currentTeam.players, selectedPlayer]);

   useEffect(() => {
    // When switching teams, select the first player of the new team
    setSelectedPlayer(currentTeam.players[0] || undefined);
  }, [selectedTeam, currentTeam.players]);
  
  useEffect(() => {
      // Find the last foul, goal, or penalty event for VAR check
      const contentiousEvents: GameEventType[] = ['GOAL', 'FOUL', 'RED_CARD', 'YELLOW_CARD'];
      const lastEvent = [...state.events].reverse().find(e => contentiousEvents.includes(e.type));
      if (lastEvent) {
          setLastContentiousEvent(lastEvent);
      }
  }, [state.events]);

  const handleLogEvent = (type: GameEventType) => {
    if (type !== 'PENALTY_SHOOTOUT_GOAL' && type !== 'PENALTY_SHOOTOUT_MISS' && type !== 'PENALTY_SHOOTOUT_SAVE' && isButtonDisabled(type)) return;

    if (type === 'PENALTY_SHOOTOUT_GOAL' || type === 'PENALTY_SHOOTOUT_MISS' || type === 'PENALTY_SHOOTOUT_SAVE') {
        if (state.penaltyShootout && selectedPlayer) {
            const teamSide = state.penaltyShootout.currentTaker;
            const outcomeMap: Record<'PENALTY_SHOOTOUT_GOAL' | 'PENALTY_SHOOTOUT_MISS' | 'PENALTY_SHOOTOUT_SAVE', PenaltyAttempt['outcome']> = {
                'PENALTY_SHOOTOUT_GOAL': 'goal',
                'PENALTY_SHOOTOUT_MISS': 'miss',
                'PENALTY_SHOOTOUT_SAVE': 'save'
            };
            dispatch({ type: 'LOG_PENALTY_ATTEMPT', payload: { team: teamSide, player: selectedPlayer, outcome: outcomeMap[type] } });
        }
        return;
    }
    
    if (type === 'INJURY' && selectedPlayer) {
        dispatch({ type: 'LOG_INJURY', payload: { team: selectedTeam, player: selectedPlayer } });
    }

    const event: GameEvent = {
      id: Date.now(),
      type,
      teamName: currentTeam.name,
      matchTime: state.matchTime,
      playerNumber: selectedPlayer?.number,
      playerName: selectedPlayer?.name,
      playerRole: selectedPlayer?.role,
    };
    processGameEventWithCommentary(event);
    if (type === 'GOAL' || type === 'SHOT_ON_TARGET') {
      setShotToLogId(event.id);
    }
  };

  const handleManualSave = async () => {
    try {
        await saveEncryptedState(state);
        setSaveMessage('Saved!');
    } catch {
        setSaveMessage('Error!');
    } finally {
        setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleAddInjuryTime = () => {
    const time = parseInt(injuryTimeInput, 10);
    if (!isNaN(time) && time > 0) {
        dispatch({ type: 'ADD_INJURY_TIME', payload: time });
    }
  };
  
  const handleShotLocationLogged = (location: Point) => {
    if(shotToLogId) {
        dispatch({ type: 'UPDATE_EVENT_LOCATION', payload: { eventId: shotToLogId, location } });
        setShotToLogId(null);
    }
  };

  const handleCreatePoll = () => {
    if (!isPro) {
        showUpgradeModal();
        return;
    }
    if (pollQuestion.trim() && pollOptions.every(opt => opt.trim())) {
        const newPoll: Poll = {
            id: `poll-${Date.now()}`,
            question: pollQuestion,
            options: pollOptions.map((opt, i) => ({ id: `${i}`, text: opt, votes: 0 })),
            isLive: true,
        };
        dispatch({ type: 'START_POLL', payload: newPoll });
        setPollQuestion('');
        setPollOptions(['', '']);
    }
  };

  const handleSpotlight = async () => {
      if (!isPro) {
          showUpgradeModal();
          return;
      }
      if (!selectedPlayer) return;

      setIsSpotlightLoading(true);
      try {
          const analysis = await generatePlayerSpotlightText(selectedPlayer, currentTeam);
          dispatch({ type: 'SHOW_KEY_PLAYER_SPOTLIGHT', payload: { player: selectedPlayer, team: selectedTeam, analysis } });
      } catch (e) {
          console.error(e);
      } finally {
          setIsSpotlightLoading(false);
      }
  };
  
  const isButtonDisabled = (type: GameEventType) => {
      const requiresPlayer: GameEventType[] = ['GOAL', 'ASSIST', 'SHOT_ON_TARGET', 'SHOT_OFF_TARGET', 'TACKLE', 'PASS', 'FOUL', 'YELLOW_CARD', 'RED_CARD', 'SAVE', 'INJURY'];
      const playerRequired = requiresPlayer.includes(type) && !selectedPlayer;
      const isInjuryDisabled = type === 'INJURY' && state.injuryStoppage !== null;
      return playerRequired || isInjuryDisabled;
  };
  
  const isStartPenaltyShootoutVisible =
    state.matchPeriod === 'fullTime' &&
    state.matchType === 'knockout' &&
    state.homeStats.goals === state.awayStats.goals &&
    !state.penaltyShootout;

  const renderPenaltyControls = () => (
    <div className="space-y-2">
      <p className="text-center font-bold text-yellow-400">
        {state.penaltyShootout?.winner
          ? `SHOOTOUT COMPLETE`
          : `Current Taker: ${state.penaltyShootout?.currentTaker === 'home' ? state.homeTeam.name : state.awayTeam.name}`
        }
      </p>
      <PlayerSelector
        homeTeam={state.homeTeam}
        awayTeam={state.awayTeam}
        selectedTeam={selectedTeam}
        onTeamChange={() => {}} // Team change is automatic in shootout
        selectedPlayer={selectedPlayer}
        onPlayerChange={setSelectedPlayer}
        disabled={!!state.penaltyShootout?.winner}
      />
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => handleLogEvent('PENALTY_SHOOTOUT_GOAL')} disabled={!selectedPlayer || !!state.penaltyShootout?.winner} className="font-bold p-3 rounded-lg transition bg-green-600 hover:bg-green-700 disabled:bg-gray-500">GOAL</button>
        <button onClick={() => handleLogEvent('PENALTY_SHOOTOUT_MISS')} disabled={!selectedPlayer || !!state.penaltyShootout?.winner} className="font-bold p-3 rounded-lg transition bg-red-600 hover:bg-red-700 disabled:bg-gray-500">MISS</button>
        <button onClick={() => handleLogEvent('PENALTY_SHOOTOUT_SAVE')} disabled={!selectedPlayer || !!state.penaltyShootout?.winner} className="font-bold p-3 rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500">SAVE</button>
      </div>
      {state.penaltyShootout?.winner && (
        <p className="text-center text-lg font-bold text-green-400 animate-pulse">
          {state.penaltyShootout.winner === 'home' ? state.homeTeam.name : state.awayTeam.name} wins the shootout!
        </p>
      )}
    </div>
  );

  const controlButtonClass = "relative group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-300 glass-panel border-white/5 hover:border-neon-cyan/40 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 text-white rounded-t-3xl z-20 flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="w-full max-w-5xl mx-auto p-3 flex-shrink-0">
        <div className="flex justify-center items-center">
          <div className="flex-1">
             {autoSaveMessage && <div className="text-[10px] font-mono text-white/40 animate-pulse text-left ml-4 uppercase tracking-tighter">{autoSaveMessage}</div>}
             {saveMessage && <div className="text-[10px] font-mono text-neon-emerald font-bold text-left ml-4 uppercase tracking-tighter">{saveMessage}</div>}
             {recordingSaveMessage && <div className="text-[10px] font-mono text-neon-cyan font-bold text-left ml-4 animate-fade-in uppercase tracking-tighter">{recordingSaveMessage}</div>}
          </div>

          <div className="flex justify-center items-center gap-6">
            <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })} className="p-4 glass-panel border-neon-cyan/40 hover:neon-border-cyan rounded-full transition-all duration-500 transform hover:scale-110 group active:scale-95">
              {state.isMatchPlaying ? <PauseIcon className="w-8 h-8 neon-text-cyan group-hover:scale-110 transition-transform" /> : <PlayIcon className="w-8 h-8 neon-text-cyan group-hover:scale-110 transition-transform" />}
            </button>
          </div>
          
          <div className="flex-1 flex justify-end">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-3 text-white/40 hover:text-neon-cyan transition-colors">
              {isExpanded ? <ChevronDownIcon className="w-7 h-7" /> : <ChevronUpIcon className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

        {isExpanded && (
          <div className="w-full max-w-5xl mx-auto px-4 pb-6 overflow-y-auto custom-scrollbar">
            <div className="pt-4 border-t border-white/5 space-y-6 animate-fade-in-fast">
                {shotToLogId && <ShotLogger onLogLocation={handleShotLocationLogged} />}
                
                {isStartPenaltyShootoutVisible && (
                  <div className="text-center my-6">
                    <button
                      onClick={() => dispatch({ type: 'START_PENALTY_SHOOTOUT' })}
                      className="glass-panel neon-border-cyan text-neon-cyan font-display font-bold py-4 px-10 rounded-xl text-lg transition-all duration-500 hover:bg-neon-cyan/10 hover:shadow-[0_0_30px_rgba(0,243,255,0.3)] animate-pulse"
                    >
                      INITIALIZE PENALTY PROTOCOL
                    </button>
                  </div>
                )}
                
                {state.matchPeriod === 'penaltyShootout' ? renderPenaltyControls() : (
                    <div className="space-y-4">
                        <PlayerSelector 
                            homeTeam={state.homeTeam}
                            awayTeam={state.awayTeam}
                            selectedTeam={selectedTeam}
                            onTeamChange={setSelectedTeam}
                            selectedPlayer={selectedPlayer}
                            onPlayerChange={setSelectedPlayer}
                            disabled={!state.isMatchPlaying}
                        />
                        <EventButtons onLogEvent={handleLogEvent} disabled={isButtonDisabled('GOAL')} canLogInjury={state.injuryStoppage === null} />
                    </div>
                )}
                
                {/* General Controls */}
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 text-center text-[10px] font-display font-bold uppercase tracking-wider">
                    <button onClick={toggleReplay} className={controlButtonClass}><ReplayIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Replay</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Temporal Rewind (R)</span></button>
                    <button onClick={toggleRecording} className={`${controlButtonClass} ${isRecording ? 'border-red-500/50 bg-red-500/10' : ''}`}><RecordIcon className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-white/60 group-hover:text-red-500'}`}/><span>{isRecording ? 'Active' : 'Record'}</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Data Stream Persistence</span></button>
                    <button onClick={toggleStats} className={controlButtonClass}><StatsIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Stats</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Analytical Overview</span></button>
                    <button onClick={togglePlayerStats} className={controlButtonClass}><PlayerStatsIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Players</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Individual Metrics</span></button>
                    <button onClick={toggleSubModal} className={controlButtonClass}><SubstitutionIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Sub</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Roster Reconfiguration</span></button>
                    <button onClick={toggleTacticsBoard} className={controlButtonClass}><TacticsIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Tactics</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Strategic Interface (T)</span></button>
                    <button onClick={toggleFormationDisplay} className={controlButtonClass}><FormationIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Lineups</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Structural Deployment</span></button>
                    <button onClick={toggleHeatmap} className={`${controlButtonClass} ${showHeatmap ? 'border-neon-cyan/50 bg-neon-cyan/10' : ''}`}><SpotlightIcon className={`w-5 h-5 ${showHeatmap ? 'text-neon-cyan' : 'text-white/60 group-hover:text-neon-cyan'}`}/><span>Heatmap</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Thermal Density Mapping</span></button>
                    <button onClick={handleManualSave} className={controlButtonClass}><SaveIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan transition-colors"/><span>Save</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>State Serialization</span></button>
                </div>
                
                {/* AI & Pro Tools */}
                <div className="glass-panel border-white/5 p-4 rounded-2xl space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan/30"></div>
                    <h4 className="font-display font-bold text-xs text-neon-cyan uppercase tracking-[0.3em] pl-2">Neural Processing Unit {!isPro && '🏆'}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-[10px] font-display font-bold uppercase tracking-wider">
                        <button onClick={() => handleProFeatureClick(toggleAdvancedAnalysis)} disabled={isPoseLandmarkerLoading} className={`${controlButtonClass} ${isAdvancedAnalysisEnabled ? 'border-neon-cyan/50 bg-neon-cyan/10' : ''}`}>
                            {isPoseLandmarkerLoading ? <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div> : <BrainIcon className={`w-5 h-5 ${isAdvancedAnalysisEnabled ? 'text-neon-cyan' : 'text-white/60'}`}/>}
                            <span>Vision AI</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Advanced Computer Vision Analysis</span>
                        </button>
                        <button onClick={() => handleProFeatureClick(() => dispatch({ type: 'TOGGLE_AUTO_CAMERA' }))} disabled={!isAdvancedAnalysisEnabled} className={`${controlButtonClass} ${state.isAutoCameraOn ? 'border-neon-cyan/50 bg-neon-cyan/10' : ''}`}>
                            <CameraIcon className={`w-5 h-5 ${state.isAutoCameraOn ? 'text-neon-cyan' : 'text-white/60'}`}/>
                            <span>Auto Cam</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Autonomous Director Protocol</span>
                        </button>
                        <button onClick={() => handleProFeatureClick(toggleLiveTactics)} disabled={!isOnline} className={`${controlButtonClass} ${isLiveTacticsOn ? 'border-neon-cyan/50 bg-neon-cyan/10' : ''}`}>
                            <LiveTacticsIcon className={`w-5 h-5 ${isLiveTacticsOn ? 'text-neon-cyan' : 'text-white/60'}`}/>
                            <span>Live Tac</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Real-time Strategic Inference</span>
                        </button>
                        <button onClick={() => { if(lastContentiousEvent) handleProFeatureClick(() => onTriggerVarCheck(lastContentiousEvent)) }} disabled={!lastContentiousEvent || !isOnline} className={controlButtonClass}>
                            <VarIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan"/>
                            <span>VAR</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Neural Referee Verification</span>
                        </button>
                        <button onClick={handleSpotlight} disabled={!selectedPlayer || !isOnline || isSpotlightLoading} className={controlButtonClass}>
                            {isSpotlightLoading ? <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div> : <SpotlightIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan"/>}
                            <span>Spotlight</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Targeted Performance Analysis</span>
                        </button>
                        <button onClick={() => handleProFeatureClick(() => dispatch({ type: 'TOGGLE_LIVE_COMMENTARY' }))} disabled={!isOnline} className={`${controlButtonClass} ${state.isLiveCommentaryActive ? 'border-neon-cyan/50 bg-neon-cyan/10' : ''}`}>
                          <MicrophoneIcon className={`w-5 h-5 ${state.isLiveCommentaryActive ? 'text-neon-cyan/60' : 'text-white/60'}`} />
                          <span>AI Voice</span>
                          <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Neural Audio Synthesis</span>
                        </button>
                        <button onClick={() => handleProFeatureClick(handleCreatePoll)} disabled={!isOnline} className={controlButtonClass}>
                          <PollIcon className="w-5 h-5 text-white/60 group-hover:text-neon-cyan" />
                          <span>Poll</span>
                          <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Real-time Audience Engagement</span>
                        </button>
                    </div>
                </div>

                {/* Match Admin */}
                <div className="flex items-center justify-center gap-6 text-[10px] font-display font-bold uppercase tracking-widest glass-panel border-white/5 p-4 rounded-xl">
                    <label className="text-white/60">Temporal Adjustment:</label>
                    <div className="flex items-center gap-3">
                      <input type="number" value={injuryTimeInput} onChange={e => setInjuryTimeInput(e.target.value)} min="0" className="w-16 glass-panel border-white/10 text-white rounded-lg p-2 text-center font-mono focus:border-neon-cyan outline-none transition-colors" />
                      <button onClick={handleAddInjuryTime} className="glass-panel border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 py-2 px-6 rounded-lg transition-all active:scale-95">ADD TIME</button>
                    </div>
                </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ControlPanel;

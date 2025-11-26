
import React, { useState, useEffect, MouseEvent } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { useProContext } from '../context/ProContext';
import { PlayIcon, PauseIcon, ReplayIcon, AdIcon, StatsIcon, PlayerStatsIcon, InfoIcon, ChevronUpIcon, ChevronDownIcon, SubstitutionIcon, BroadcastIcon, EndMatchIcon, SwitchCameraIcon, SaveIcon, BrainIcon, RecordIcon, ArrowRightIcon, ArrowLeftIcon, MicrophoneIcon, TacticsIcon, LiveTacticsIcon, MedicalIcon, FormationIcon, PollIcon, VarIcon, SpotlightIcon, ShareIcon } from './icons/ControlIcons';
import type { GameEvent, GameEventType, Player, MatchState, Point, PenaltyAttempt, Poll } from '../types';
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
  const tooltipClass = "absolute bottom-full mb-2 w-max max-w-xs px-3 py-1.5 text-xs font-semibold text-white bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-10";

  return (
    <div className="bg-gray-800/80 p-2 rounded-lg flex items-center justify-center gap-3 animate-fade-in-fast">
      <p className="text-sm font-semibold text-gray-300">Log Shot Location:</p>
      <div className="relative group">
        <div 
          className="w-24 h-32 bg-green-700/50 border-2 border-white/30 rounded-md relative cursor-crosshair"
          style={{ background: 'radial-gradient(ellipse at center, #2e7d32, #1b5e20)' }}
          onClick={handlePitchClick}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-6 border-2 border-white/30 rounded-b-md border-t-0"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-6 border-2 border-white/30 rounded-t-md border-b-0"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 border-2 border-white/30 rounded-full"></div>
        </div>
        <span className={`${tooltipClass} left-1/2 -translate-x-1/2 w-48`}>Click on the virtual pitch to log the precise location of a recent shot or goal for post-match analysis.</span>
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
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    toggleAd, 
    toggleReplay, 
    toggleStats,
    togglePlayerStats,
    toggleInstructions, 
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
    onManualTacticsFetch,
    isFetchingSuggestion,
    onTriggerVarCheck
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

  const tooltipClass = "absolute bottom-full mb-2 w-max max-w-xs px-3 py-1.5 text-xs font-semibold text-white bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-10";
  
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
    } catch(e) {
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

  const controlButtonClass = "relative group flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-80 backdrop-blur-md text-white rounded-t-lg z-20 flex flex-col max-h-[85vh]">
      <div className="w-full max-w-4xl mx-auto p-2 flex-shrink-0">
        <div className="flex justify-center items-center">
          <div className="flex-1">
             {autoSaveMessage && <div className="text-xs text-gray-400 animate-pulse text-left ml-2">{autoSaveMessage}</div>}
             {saveMessage && <div className="text-xs text-green-400 font-bold text-left ml-2">{saveMessage}</div>}
             {recordingSaveMessage && <div className="text-xs text-blue-400 font-bold text-left ml-2 animate-fade-in">{recordingSaveMessage}</div>}
          </div>

          <div className="flex justify-center items-center gap-4">
            <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-transform transform hover:scale-110">
              {state.isMatchPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
            </button>
          </div>
          
          <div className="flex-1 flex justify-end">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-400 hover:text-white">
              {isExpanded ? <ChevronDownIcon className="w-6 h-6" /> : <ChevronUpIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

        {isExpanded && (
          <div className="w-full max-w-4xl mx-auto px-2 pb-2 overflow-y-auto">
            <div className="pt-2 border-t border-gray-700 space-y-4 animate-fade-in-fast">
                {shotToLogId && <ShotLogger onLogLocation={handleShotLocationLogged} />}
                
                {isStartPenaltyShootoutVisible && (
                  <div className="text-center my-4 animate-pulse">
                    <button
                      onClick={() => dispatch({ type: 'START_PENALTY_SHOOTOUT' })}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105"
                    >
                      Start Penalty Shootout
                    </button>
                  </div>
                )}
                
                {state.matchPeriod === 'penaltyShootout' ? renderPenaltyControls() : (
                    <div className="space-y-2">
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
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
                    <button onClick={toggleReplay} className={controlButtonClass}><ReplayIcon className="w-5 h-5"/><span>Replay</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Trigger Instant Replay (R)</span></button>
                    <button onClick={toggleRecording} className={`${controlButtonClass} ${isRecording ? 'bg-red-600' : ''}`}><RecordIcon className="w-5 h-5"/><span>{isRecording ? 'Stop Rec' : 'Record'}</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>{isRecording ? 'Stop full match recording' : 'Start full match recording'}</span></button>
                    <button onClick={toggleStats} className={controlButtonClass}><StatsIcon className="w-5 h-5"/><span>Stats</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Show Match Statistics</span></button>
                    <button onClick={togglePlayerStats} className={controlButtonClass}><PlayerStatsIcon className="w-5 h-5"/><span>Players</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Show Player Statistics</span></button>
                    <button onClick={toggleSubModal} className={controlButtonClass}><SubstitutionIcon className="w-5 h-5"/><span>Sub</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Make a Substitution</span></button>
                    <button onClick={toggleTacticsBoard} className={controlButtonClass}><TacticsIcon className="w-5 h-5"/><span>Tactics</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Open Tactical Board (T)</span></button>
                    <button onClick={toggleFormationDisplay} className={controlButtonClass}><FormationIcon className="w-5 h-5"/><span>Lineups</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Show Starting Formations</span></button>
                    <button onClick={handleManualSave} className={controlButtonClass}><SaveIcon className="w-5 h-5"/><span>Save</span><span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Manually save match progress</span></button>
                </div>
                
                {/* AI & Pro Tools */}
                <div className="bg-gray-800/50 p-2 rounded-lg space-y-3">
                    <h4 className="text-center font-bold text-sm text-yellow-400">AI & Pro Tools {!isPro && '🏆'}</h4>
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-2 text-xs">
                        <button onClick={() => handleProFeatureClick(toggleAdvancedAnalysis)} disabled={isPoseLandmarkerLoading} className={`${controlButtonClass} ${isAdvancedAnalysisEnabled ? 'bg-blue-600' : ''}`}>
                            {isPoseLandmarkerLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <BrainIcon className="w-5 h-5"/>}
                            <span>Adv. AI</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Toggle Advanced AI Frame Analysis (for event detection, heatmaps, auto-cam)</span>
                        </button>
                        <button onClick={() => handleProFeatureClick(toggleLiveTactics)} disabled={!isOnline} className={`${controlButtonClass} ${isLiveTacticsOn ? 'bg-blue-600' : ''}`}>
                            <LiveTacticsIcon className={`w-5 h-5 ${isLiveTacticsOn ? 'text-yellow-300' : ''}`}/>
                            <span>Live Tac</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Toggle automatic live tactical suggestions</span>
                        </button>
                        <button onClick={() => { if(lastContentiousEvent) handleProFeatureClick(() => onTriggerVarCheck(lastContentiousEvent)) }} disabled={!lastContentiousEvent || !isOnline} className={controlButtonClass}>
                            <VarIcon className="w-5 h-5"/>
                            <span>VAR</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Trigger AI Referee review on last contentious event</span>
                        </button>
                        <button onClick={handleSpotlight} disabled={!selectedPlayer || !isOnline || isSpotlightLoading} className={controlButtonClass}>
                            {isSpotlightLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SpotlightIcon className="w-5 h-5"/>}
                            <span>Spotlight</span>
                            <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Generate an AI spotlight graphic for the selected player</span>
                        </button>
                        <button onClick={() => handleProFeatureClick(() => dispatch({ type: 'TOGGLE_LIVE_COMMENTARY' }))} disabled={!isOnline} className={`${controlButtonClass} ${state.isLiveCommentaryActive ? 'bg-blue-600' : ''}`}>
                          <MicrophoneIcon className="w-5 h-5" />
                          <span>Live AI</span>
                          <span className={`${tooltipClass} -translate-x-1/2 left-1/2`}>Toggle real-time conversational AI commentary</span>
                        </button>
                    </div>
                </div>

                {/* Match Admin */}
                <div className="flex items-center justify-center gap-4 text-sm">
                    <label className="font-semibold">Injury Time:</label>
                    <input type="number" value={injuryTimeInput} onChange={e => setInjuryTimeInput(e.target.value)} min="0" className="w-16 bg-gray-700 text-white rounded p-1 border border-gray-600 text-center" />
                    <button onClick={handleAddInjuryTime} className="bg-orange-600 hover:bg-orange-700 font-bold py-1 px-3 rounded-md">Add</button>
                </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ControlPanel;

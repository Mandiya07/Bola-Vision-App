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
  videoDevices: MediaDeviceInfo[];
  onSelectCamera: (deviceId: string) => void;
  toggleInstructions: () => void;
  toggleSubModal: () => void;
  toggleTacticsBoard: () => void;
  toggleFormationDisplay: () => void;
  isAdvancedAnalysisEnabled: boolean;
  toggleAdvancedAnalysis: () => void;
  isPoseLandmarkerLoading: boolean;
  autoSaveMessage: string;
  isRecording: boolean;
  toggleRecording: () => void;
  isOnline: boolean;
  isLiveTacticsOn: boolean;
  toggleLiveTactics: () => void;
  onManualTacticsFetch: () => void;
  isFetchingSuggestion: boolean;
  onTriggerVarCheck: (event: GameEvent) => void;
}

const getShortDeviceLabel = (label: string): string => {
    if (!label) return 'Camera';
    // Tries to find a shorter, more descriptive name. e.g., "FaceTime HD Camera (Built-in)" -> "FaceTime HD Camera"
    const parts = label.split('(');
    const mainLabel = parts[0].trim();
    // Fallback for long names without parentheses
    if (mainLabel.length > 15) return mainLabel.substring(0, 13) + '...';
    return mainLabel || 'Camera';
};

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    toggleAd, 
    toggleReplay, 
    toggleStats,
    togglePlayerStats,
    videoDevices,
    onSelectCamera,
    toggleInstructions, 
    toggleSubModal, 
    toggleTacticsBoard,
    toggleFormationDisplay,
    isAdvancedAnalysisEnabled,
    toggleAdvancedAnalysis,
    isPoseLandmarkerLoading,
    autoSaveMessage,
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
    if (isButtonDisabled(type)) return;

    if (type === 'PENALTY_SHOOTOUT_GOAL' || type === 'PENALTY_SHOOTOUT_MISS' || type === 'PENALTY_SHOOTOUT_SAVE') {
        if (state.penaltyShootout && selectedPlayer) {
            const teamSide = selectedTeam;
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
      return state.matchPeriod === 'penaltyShootout' || playerRequired || isInjuryDisabled;
  };
  
  const renderPenaltyControls = () => (
      <div className="flex justify-center gap-2">
          <button onClick={() => handleLogEvent('PENALTY_SHOOTOUT_GOAL')} disabled={!selectedPlayer} className="flex-1 font-bold p-2 rounded-lg transition bg-green-600 hover:bg-green-700 disabled:bg-gray-500">GOAL</button>
          <button onClick={() => handleLogEvent('PENALTY_SHOOTOUT_MISS')} disabled={!selectedPlayer} className="flex-1 font-bold p-2 rounded-lg transition bg-red-600 hover:bg-red-700 disabled:bg-gray-500">MISS</button>
          <button onClick={() => handleLogEvent('PENALTY_SHOOTOUT_SAVE')} disabled={!selectedPlayer} className="flex-1 font-bold p-2 rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500">SAVE</button>
      </div>
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-80 backdrop-blur-md text-white p-2 rounded-t-lg z-20">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center items-center">
          <div className="flex-1">
             {autoSaveMessage && <div className="text-xs text-gray-400 animate-pulse text-left ml-2">{autoSaveMessage}</div>}
             {saveMessage && <div className="text-xs text-green-400 font-bold text-left ml-2">{saveMessage}</div>}
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

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-gray-700 space-y-4 animate-fade-in-fast">
             {shotToLogId && <ShotLogger onLogLocation={handleShotLocationLogged} />}
             
             {state.matchPeriod === 'penaltyShootout' ? renderPenaltyControls() : (
                <div className="space-y-2">
                    <PlayerSelector 
                        homeTeam={state.homeTeam}
                        awayTeam={state.awayTeam}
                        selectedTeam={selectedTeam}
                        onTeamChange={setSelectedTeam}
                        selectedPlayer={selectedPlayer}
                        onPlayerChange={setSelectedPlayer}
                        disabled={false}
                    />
                    <EventButtons onLogEvent={handleLogEvent} disabled={!selectedPlayer} canLogInjury={state.injuryStoppage === null}/>
                </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="relative group">
                    <button onClick={toggleStats} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><StatsIcon className="w-5 h-5"/>Stats</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Show match statistics.</span>
                </div>
                <div className="relative group">
                    <button onClick={togglePlayerStats} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><PlayerStatsIcon className="w-5 h-5"/>Players</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>View all player stats.</span>
                </div>
                <div className="relative group">
                    <button onClick={toggleSubModal} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><SubstitutionIcon className="w-5 h-5"/>Sub</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Make a substitution.</span>
                </div>
                <div className="relative group">
                    <button onClick={() => dispatch({ type: 'OPEN_SHARE_MODAL' })} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><ShareIcon className="w-5 h-5"/>Share</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Get shareable match link.</span>
                </div>
                <div className="relative group">
                    <button onClick={() => handleProFeatureClick(toggleTacticsBoard)} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><TacticsIcon className="w-5 h-5"/>Board {!isPro && '🏆'}</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Open tactical drawing board. (Pro)</span>
                </div>
                <div className="relative group">
                    <button onClick={toggleFormationDisplay} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><FormationIcon className="w-5 h-5"/>Lineups</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Show starting formations.</span>
                </div>
                <div className="relative group">
                    <button onClick={toggleInstructions} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><InfoIcon className="w-5 h-5"/>Help</button>
                    <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>View camera setup guide.</span>
                </div>
            </div>
            
            <div className="p-2 bg-gray-800/50 rounded-lg space-y-3">
                 <h3 className="text-center font-bold text-sm text-gray-300">Broadcast Tools { !isPro && '🏆'}</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                     <div className="relative group">
                        <button onClick={() => handleProFeatureClick(handleSpotlight)} disabled={!selectedPlayer || isSpotlightLoading} className="w-full font-bold p-2 rounded-lg transition bg-indigo-600 hover:bg-indigo-700 text-sm flex items-center justify-center gap-2 disabled:bg-gray-500">
                           {isSpotlightLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SpotlightIcon className="w-5 h-5" />}
                           Spotlight
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Show AI Player Spotlight for selected player. (Pro)</span>
                     </div>
                      <div className="relative group">
                        <button onClick={() => handleProFeatureClick(toggleLiveTactics)} className={`w-full font-bold p-2 rounded-lg transition text-sm flex items-center justify-center gap-2 ${isLiveTacticsOn ? 'bg-cyan-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                           <LiveTacticsIcon className="w-5 h-5"/>
                           {isLiveTacticsOn ? 'Tactics ON' : 'Live AI'}
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Toggle automatic AI tactical suggestions. (Pro)</span>
                     </div>
                      <div className="relative group">
                        <button onClick={() => handleProFeatureClick(onManualTacticsFetch)} disabled={isFetchingSuggestion} className="w-full font-bold p-2 rounded-lg transition bg-indigo-600 hover:bg-indigo-700 text-sm flex items-center justify-center gap-2 disabled:bg-gray-500">
                           {isFetchingSuggestion ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <BrainIcon className="w-5 h-5" />}
                           Analyze
                        </button>
                         <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Get an instant AI tactical suggestion. (Pro)</span>
                     </div>
                     <div className="relative group">
                        <button onClick={() => { if (lastContentiousEvent) onTriggerVarCheck(lastContentiousEvent); }} disabled={!lastContentiousEvent || !isOnline} className="w-full font-bold p-2 rounded-lg transition bg-indigo-600 hover:bg-indigo-700 text-sm flex items-center justify-center gap-2 disabled:bg-gray-500">
                           <VarIcon className="w-5 h-5"/>
                           VAR Check
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Trigger AI VAR on the last contentious event. (Pro)</span>
                     </div>
                 </div>
                 <div className="flex gap-2 items-end">
                    <div className="flex-grow space-y-1">
                        <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll Question (e.g., MOTM?)" className="w-full bg-gray-900 text-white rounded p-1 border border-gray-600 text-xs" disabled={!isPro} />
                        <div className="flex gap-1">
                            {pollOptions.map((opt, i) => (
                                <input key={i} type="text" value={opt} onChange={e => setPollOptions(opts => opts.map((o, idx) => i === idx ? e.target.value : o))} placeholder={`Option ${i+1}`} className="w-full bg-gray-900 text-white rounded p-1 border border-gray-600 text-xs" disabled={!isPro} />
                            ))}
                        </div>
                    </div>
                    <button onClick={handleCreatePoll} className="font-bold p-2 rounded-lg transition bg-indigo-600 hover:bg-indigo-700 text-sm flex items-center justify-center gap-1 h-full" disabled={!isPro}><PollIcon className="w-5 h-5"/>Start Poll</button>
                 </div>
            </div>
            
            <div className="p-2 bg-gray-800/50 rounded-lg">
                <h3 className="text-center font-bold text-sm text-gray-300 mb-2">Match Controls</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="flex items-center gap-1">
                        <input type="number" value={injuryTimeInput} onChange={e => setInjuryTimeInput(e.target.value)} className="w-full bg-gray-900 text-white rounded p-1 border border-gray-600 text-center" />
                        <button onClick={handleAddInjuryTime} className="font-bold p-1 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-xs h-full">Add Injury Time</button>
                    </div>
                    <div className="relative group">
                        <button onClick={() => dispatch({ type: 'TOGGLE_ATTACK_DIRECTION'})} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2">
                            <ArrowLeftIcon className="w-5 h-5"/> Swap Sides <ArrowRightIcon className="w-5 h-5"/>
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Swap team attack directions (e.g., for 2nd half).</span>
                    </div>
                     <div className="relative group">
                        <button onClick={() => dispatch({ type: 'TOGGLE_LIVE_COMMENTARY' })} disabled={!isOnline} className={`w-full font-bold p-2 rounded-lg transition text-sm flex items-center justify-center gap-2 disabled:bg-gray-500 ${state.isLiveCommentaryActive ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
                           <MicrophoneIcon className="w-5 h-5"/>
                           {state.isLiveCommentaryActive ? 'Live OFF' : 'Live ON'}
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Toggle real-time live AI commentary. (Pro)</span>
                     </div>
                     <div className="relative group">
                        <button onClick={handleManualSave} className="w-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center gap-2"><SaveIcon className="w-5 h-5"/>Save</button>
                         <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Manually save match progress.</span>
                    </div>
                </div>
            </div>

            <div className="p-2 bg-gray-800/50 rounded-lg">
                 <h3 className="text-center font-bold text-sm text-gray-300 mb-2">Camera & Recording</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="relative group">
                        <select onChange={(e) => onSelectCamera(e.target.value)} className="w-full h-full font-bold p-2 rounded-lg transition bg-gray-700 hover:bg-gray-600 text-sm text-center appearance-none">
                            <option value="">{getShortDeviceLabel(state.activeCamera)}</option>
                            {videoDevices.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>{getShortDeviceLabel(device.label)}</option>
                            ))}
                        </select>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Switch physical camera.</span>
                    </div>
                     <div className="relative group">
                        <button onClick={() => dispatch({ type: 'TOGGLE_AUTO_CAMERA'})} className={`w-full font-bold p-2 rounded-lg transition text-sm flex items-center justify-center gap-2 ${state.isAutoCameraOn ? 'bg-cyan-500' : 'bg-gray-700 hover:bg-gray-600'}`} disabled={!isPro || !isAdvancedAnalysisEnabled}>
                           <BrainIcon className="w-5 h-5"/> Auto-Cam
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Let AI automatically switch camera views. Requires Advanced Analysis. (Pro)</span>
                     </div>
                     <div className="relative group">
                        <button onClick={() => handleProFeatureClick(toggleAdvancedAnalysis)} className={`w-full font-bold p-2 rounded-lg transition text-sm flex items-center justify-center gap-2 ${isAdvancedAnalysisEnabled ? 'bg-cyan-500' : 'bg-gray-700 hover:bg-gray-600'}`} disabled={isPoseLandmarkerLoading}>
                           {isPoseLandmarkerLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <BrainIcon className="w-5 h-5" />}
                           Advanced
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>Enable advanced pose-detection analysis for heatmap data and better event detection. (Pro)</span>
                     </div>
                     <div className="relative group">
                        <button onClick={toggleRecording} className={`w-full font-bold p-2 rounded-lg transition text-sm flex items-center justify-center gap-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            <RecordIcon className="w-5 h-5"/> {isRecording ? 'Stop Rec' : 'Record'}
                        </button>
                        <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>{isRecording ? 'Stop recording the full match.' : 'Start recording the full match to local storage.'}</span>
                     </div>
                </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
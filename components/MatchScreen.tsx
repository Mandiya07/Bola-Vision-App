

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { analyzeVideoFrame, advancedFrameAnalysis, generateSpeech, translateText, getTacticalSuggestion, getWinProbability, analyzeRefereeDecision } from '../services/geminiService';
import { saveEncryptedState, saveVideoBlob } from '../services/storageService';
import { recorderService } from '../services/recorderService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useCamera } from '../hooks/useCamera';
import { useLiveCommentary } from '../hooks/useLiveCommentary';
import { decode, decodeAudioData } from '../utils/mediaUtils';
import { publishNewMatch } from '../services/publishService';
import Scoreboard from './Scoreboard';
import ControlPanel from './ControlPanel';
import StatsOverlay from './StatsOverlay';
import CommentaryDisplay from './CommentaryDisplay';
import AdBanner from './AdBanner';
import InstructionsModal from './InstructionsModal';
import SubstitutionModal from './SubstitutionModal';
import GoalAnimation from './GoalAnimation';
import PlayerGraphic from './PlayerGraphic';
import PlayerStatPopup from './PlayerStatPopup';
import KeyPlayerSpotlight from './KeyPlayerSpotlight';
import SyncManager from './SyncManager';
import EventLog from './EventLog';
import TacticalBoard from './TacticalBoard';
import LiveTacticsOverlay from './LiveTacticsOverlay';
import PlayerStatsOverlay from './PlayerStatsOverlay';
import InjuryOverlay from './InjuryOverlay';
import FormationDisplay from './FormationDisplay';
import PenaltyShootoutOverlay from './PenaltyShootoutOverlay';
import WinProbabilityBar from './WinProbabilityBar';
import GoalImpactOverlay from './GoalImpactOverlay';
import PollOverlay from './PollOverlay';
import VarCheckOverlay from './VarCheckOverlay';
import HalfTimeAnalysis from './HalfTimeAnalysis';
import HeatmapDisplay from './HeatmapDisplay';
import { AiAnalysisIcon, BrainIcon, CameraIcon, CloudOfflineIcon, EndMatchIcon, BroadcastIcon, SwitchCameraIcon, PlayIcon, PauseIcon } from './icons/ControlIcons';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { CommentaryLanguage, TacticalSuggestion, GameEvent, Point } from '../types';

interface MatchScreenProps {
  onEndMatch: () => void;
}

const NetworkIndicator: React.FC = () => {
    const isOnline = useNetworkStatus();

    if (isOnline) return null;

    return (
        <div className="absolute top-5 right-5 bg-yellow-500 text-black px-3 py-1.5 rounded-full text-sm font-bold animate-pulse flex items-center gap-2 z-10 shadow-lg">
            <CloudOfflineIcon className="w-5 h-5" />
            <span>Offline Mode</span>
        </div>
    );
}

const BreakOverlay: React.FC<{
    onEndMatch: () => void;
    onStartSecondHalf: () => void;
    onStartExtraTimeSecondHalf: () => void;
    onStartExtraTime: () => void;
    onStartPenaltyShootout: () => void;
}> = ({
    onEndMatch,
    onStartSecondHalf,
    onStartExtraTimeSecondHalf,
    onStartExtraTime,
    onStartPenaltyShootout
}) => {
    const { state } = useMatchContext();
    const { matchPeriod, homeStats, awayStats, homeTeam, awayTeam, matchType, penaltyShootout } = state;

    if (matchPeriod !== 'halfTime' && matchPeriod !== 'fullTime' && matchPeriod !== 'extraTimeHalfTime') {
        return null;
    }

    const title = matchPeriod === 'halfTime' ? 'HALF TIME' : (matchPeriod === 'extraTimeHalfTime' ? 'ET HALF TIME' : 'FULL TIME');
    const analysisPeriod = matchPeriod === 'halfTime' ? 'First Half' : 'Full Match';

    const isDraw = homeStats.goals === awayStats.goals;
    const isKnockout = matchType === 'knockout';
    const canStartPenaltyShootout = isKnockout && isDraw && !penaltyShootout;
    const canStartExtraTime = isKnockout && isDraw && matchPeriod === 'fullTime' && (!state.events.some(e => e.type === 'GOAL' && e.matchTime > 90 * 60)); // Simple check if already played ET

    return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] animate-fade-in p-4 overflow-y-auto custom-scrollbar">
            <div className="text-center mb-6 mt-8">
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-widest text-white" style={{textShadow: '0 0 20px rgba(255,255,255,0.5)'}}>{title}</h1>
                <div className="text-4xl md:text-5xl font-bold text-yellow-400 bg-black/50 px-6 py-3 rounded-lg inline-flex items-center gap-4">
                    <span>{homeTeam.name.substring(0,3).toUpperCase()} </span>
                    <span>{homeStats.goals} - {awayStats.goals}</span>
                    <span> {awayTeam.name.substring(0,3).toUpperCase()}</span>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                {matchPeriod === 'halfTime' && (
                    <button onClick={onStartSecondHalf} className="bg-neon-cyan hover:bg-neon-cyan/80 text-black font-black uppercase tracking-widest py-3 px-8 rounded-full shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all transform hover:scale-105">
                        Start 2nd Half
                    </button>
                )}
                {matchPeriod === 'extraTimeHalfTime' && (
                    <button onClick={onStartExtraTimeSecondHalf} className="bg-neon-cyan hover:bg-neon-cyan/80 text-black font-black uppercase tracking-widest py-3 px-8 rounded-full shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all transform hover:scale-105">
                        Start ET 2nd Half
                    </button>
                )}
                {matchPeriod === 'fullTime' && (
                    <>
                        <button onClick={onEndMatch} className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105">
                            End Match
                        </button>
                        {canStartExtraTime && (
                           <button onClick={onStartExtraTime} className="bg-neon-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-widest py-3 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,0,0.3)] transition-all transform hover:scale-105">
                               Start Extra Time
                           </button>
                        )}
                        {canStartPenaltyShootout && (
                           <button onClick={onStartPenaltyShootout} className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest py-3 px-8 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all transform hover:scale-105">
                               Start Penalties
                           </button>
                        )}
                    </>
                )}
            </div>

            <HalfTimeAnalysis period={analysisPeriod} />
        </div>
    );
};


const MatchScreen: React.FC<MatchScreenProps> = ({ onEndMatch }) => {
  const { state, dispatch, processGameEventWithCommentary } = useMatchContext();
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [replayState, setReplayState] = useState<{ isReplaying: boolean; url: string | null }>({ isReplaying: false, url: null });
  const [replayIsPlaying, setReplayIsPlaying] = useState(true);
  const [replayCurrentTime, setReplayCurrentTime] = useState(0);
  const [replayDuration, setReplayDuration] = useState(0);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(1);
  const touchStartRef = useRef<{ x: number, y: number, time: number, vol: number } | null>(null);
  const [showBottomScore, setShowBottomScore] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSaveMessage, setRecordingSaveMessage] = useState('');
  
  const [isAdvancedAnalysisEnabled, setIsAdvancedAnalysisEnabled] = useState(true);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isPoseLandmarkerLoading, setIsPoseLandmarkerLoading] = useState(false);
  
  const [ttsAudioStatus, setTtsAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [isTacticsBoardVisible, setIsTacticsBoardVisible] = useState(false);
  
  const [selectedLanguage, setSelectedLanguage] = useState<CommentaryLanguage>(state.commentaryLanguage);
  const [translatedCommentary, setTranslatedCommentary] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const [isLiveTacticsOn, setIsLiveTacticsOn] = useState(false);
  const [liveTacticalSuggestion, setLiveTacticalSuggestion] = useState<TacticalSuggestion | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false);
  const [showFormationDisplay, setShowFormationDisplay] = useState(false);
  
  const [publishError, setPublishError] = useState('');
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  // State for intelligent camera director
  const [currentPlayZone, setCurrentPlayZone] = useState<'midfield' | 'goal_a' | 'goal_b'>('midfield');
  const [consecutiveChecks, setConsecutiveChecks] = useState(0);
  const lastCameraSwitchTimeRef = useRef(0);
  const previousCenterRef = useRef<{ x: number, y: number, time: number } | null>(null);

  const isOnline = useNetworkStatus();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tacticsIntervalRef = useRef<number | null>(null);
  
  const {
    videoRef,
    streamRef,
    cameraState,
    permissionStatus,
    cameraError,
    videoDevices,
    handleStartCamera,
    setupCamera,
  } = useCamera();

  // Audio Playback Refs
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  // Custom hook for Live Commentary
  const handleLiveCommentaryError = useCallback(() => {
    if (state.isLiveCommentaryActive) {
      dispatch({ type: 'TOGGLE_LIVE_COMMENTARY' });
    }
  }, [dispatch, state.isLiveCommentaryActive]);

  const { liveTranscription, audioStatus: liveAudioStatus } = useLiveCommentary({
    isActive: state.isLiveCommentaryActive && isOnline,
    matchState: state,
    videoRef,
    canvasRef,
    onError: handleLiveCommentaryError
  });

  const handleGoLive = async () => {
    if (state.isFanView) return;
    setPublishError('');
    dispatch({ type: 'SET_BROADCAST_STATUS', payload: 'publishing' });
    try {
        const newMatchId = await publishNewMatch(state);
        dispatch({ type: 'PUBLISH_MATCH_SUCCESS', payload: { matchId: newMatchId } });
        dispatch({ type: 'SET_BROADCAST_STATUS', payload: 'live' });
        // Automatically open share modal after going live
        dispatch({ type: 'OPEN_SHARE_MODAL' });
    } catch (e) {
        console.error("Failed to publish match:", e);
        setPublishError('Failed to publish. Please try again.');
        dispatch({ type: 'SET_BROADCAST_STATUS', payload: 'error' });
    }
  };


  useEffect(() => {
    let isMounted = true;

    const createPoseLandmarker = async () => {
      if (!isMounted) return;
      setIsPoseLandmarkerLoading(true);

      // Temporarily override console.log and console.warn to filter out noisy MediaPipe logs
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      
      const filterMediaPipeLogs = (originalFunc: (...args: unknown[]) => void, ...args: unknown[]) => {
          const firstArg = args[0];
          if (typeof firstArg === 'string' && firstArg.includes('gl_context.cc')) {
              return;
          }
          originalFunc(...args);
      };

      console.log = (...args: unknown[]) => filterMediaPipeLogs(originalConsoleLog, ...args);
      console.warn = (...args: unknown[]) => filterMediaPipeLogs(originalConsoleWarn, ...args);

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        if (!isMounted) return;

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 5, // Track up to 5 players for performance
        });

        if (isMounted) {
          setPoseLandmarker(landmarker);
        } else {
          landmarker.close();
        }
      } catch (e) {
        if (isMounted) {
          console.error("Failed to initialize Pose Landmarker:", e);
        }
      } finally {
        // Restore original console functions
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;

        if (isMounted) {
          setIsPoseLandmarkerLoading(false);
        }
      }
    };
    
    createPoseLandmarker();

    return () => {
      isMounted = false;
      setPoseLandmarker(currentLandmarker => {
          currentLandmarker?.close();
          return null;
      });
    };
  }, []);
  
  // Start replay buffering when camera is active
  useEffect(() => {
    try {
      if (streamRef.current && cameraState === 'active' && !recorderService.isRecording()) {
        recorderService.startReplayBuffering(streamRef.current);
      }
    } catch (e) {
      console.error("Failed to start replay buffering:", e);
    }
    
    return () => {
        // Stop any active recorder on cleanup.
        try {
          recorderService.stop();
        } catch (e) {
          console.error("Error stopping recorder:", e);
        }
    }
  }, [cameraState, streamRef]);


  const handleToggleRecording = async () => {
    try {
      if (recorderService.isRecording()) {
          const videoBlob = await recorderService.stop();
          if (videoBlob.size > 0) {
              const matchName = `${state.homeTeam.name} vs ${state.awayTeam.name}`;
              await saveVideoBlob(videoBlob, matchName);
              const message = `Recording saved! (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)`;
              setRecordingSaveMessage(message);
              setTimeout(() => setRecordingSaveMessage(''), 4000);
          }
          setIsRecording(false);
          // Restart replay buffering after full recording stops
          if (streamRef.current) {
              recorderService.startReplayBuffering(streamRef.current);
          }
      } else {
          if (streamRef.current) {
              const success = recorderService.startFullRecording(streamRef.current);
              setIsRecording(success);
          } else {
              alert("Camera stream is not available to record.");
          }
      }
    } catch (e) {
      console.error("Recording error:", e);
      alert("An error occurred while managing the recording.");
      setIsRecording(false);
    }
  };

  // Main match clock
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (state.isMatchPlaying) {
      timer = setInterval(() => {
        const newTime = state.matchTime + 1;
        dispatch({ type: 'SET_TIME', payload: newTime });

        // Calculate end times for each period, including injury time
        const injuryTimeInSeconds = state.injuryTime * 60;
        const firstHalfEnd = (45 * 60) + injuryTimeInSeconds;
        const secondHalfEnd = (90 * 60) + injuryTimeInSeconds;
        const extraTimeFirstHalfEnd = (105 * 60) + injuryTimeInSeconds;
        const extraTimeSecondHalfEnd = (120 * 60) + injuryTimeInSeconds;

        switch (state.matchPeriod) {
            case 'firstHalf':
                if (newTime >= firstHalfEnd) {
                    dispatch({ type: 'SET_MATCH_PERIOD', payload: 'halfTime' });
                }
                break;
            case 'secondHalf':
                if (newTime >= secondHalfEnd) {
                    dispatch({ type: 'SET_MATCH_PERIOD', payload: 'fullTime' });
                }
                break;
            case 'extraTimeFirstHalf':
                if (newTime >= extraTimeFirstHalfEnd) {
                    dispatch({ type: 'SET_MATCH_PERIOD', payload: 'extraTimeHalfTime' });
                }
                break;
            case 'extraTimeSecondHalf':
                if (newTime >= extraTimeSecondHalfEnd) {
                    dispatch({ type: 'SET_MATCH_PERIOD', payload: 'fullTime' });
                }
                break;
            default:
                // No timer logic for other periods like halfTime, penaltyShootout, etc.
                break;
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [state.isMatchPlaying, state.matchTime, state.matchPeriod, state.injuryTime, dispatch]);
  
  // Auto-save feature
  useEffect(() => {
    let saveInterval: ReturnType<typeof setInterval> | null = null;
    if (state.isMatchPlaying) {
        saveInterval = setInterval(async () => {
            await saveEncryptedState(state);
            setAutoSaveMessage('Auto-saved...');
            setTimeout(() => setAutoSaveMessage(''), 3000);
        }, 180000); 
    }
    return () => {
        if (saveInterval) clearInterval(saveInterval);
    };
  }, [state.isMatchPlaying, state]);

  // Automatic Event Detection
  useEffect(() => {
    const analyzeFrame = async () => {
      if (!isOnline || !videoRef.current || !canvasRef.current || isAnalyzing || !videoRef.current.srcObject || videoRef.current.paused || videoRef.current.ended) return;

      setIsAnalyzing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            let detectedEvent = null;
            if (isAdvancedAnalysisEnabled && poseLandmarker) {
                const videoTime = performance.now();
                detectedEvent = await advancedFrameAnalysis(canvas, poseLandmarker, state, videoTime);
            } else {
                const base64Frame = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                detectedEvent = await analyzeVideoFrame(base64Frame, state);
            }
            
            if (detectedEvent) {
                processGameEventWithCommentary({
                    ...detectedEvent,
                    id: Date.now(),
                    matchTime: state.matchTime,
                });
            }
        } catch(e) {
            console.error("Frame analysis failed", e);
        }
      }
      setIsAnalyzing(false);
    };

    let analysisInterval: ReturnType<typeof setInterval> | null = null;
    if (state.isMatchPlaying) {
        const interval = isAdvancedAnalysisEnabled ? 2000 : 15000;
        analysisInterval = setInterval(analyzeFrame, interval);
    }

    return () => {
        if(analysisInterval) clearInterval(analysisInterval);
    }
  }, [state.isMatchPlaying, isAnalyzing, state, processGameEventWithCommentary, isAdvancedAnalysisEnabled, poseLandmarker, isOnline, videoRef, canvasRef]);
  
   // Win Probability Updates
  useEffect(() => {
    const updateProbability = async () => {
        if (!isOnline || !state.isMatchPlaying || !state.broadcastStyles.includes('winProbability')) {
            return;
        }
        try {
            const probability = await getWinProbability(state);
            dispatch({ type: 'SET_WIN_PROBABILITY', payload: probability });
        } catch (error) {
            console.error("Failed to update win probability:", error);
        }
    };

    updateProbability(); // Initial fetch
    const interval = setInterval(updateProbability, 120000); // Update every 2 minutes
    return () => clearInterval(interval);
  }, [state.isMatchPlaying, state.broadcastStyles, isOnline, state, dispatch]);

  // Heatmap Data Collection
  useEffect(() => {
    let heatmapInterval: number | null = null;

    if (state.isMatchPlaying && isAdvancedAnalysisEnabled && poseLandmarker) {
        heatmapInterval = window.setInterval(() => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            const video = videoRef.current;
            const videoTime = performance.now();
            const poseResult = poseLandmarker.detectForVideo(video, videoTime);

            const homePoints: Point[] = [];
            const awayPoints: Point[] = [];

            const screenMidpointX = video.videoWidth / 2;

            for (const landmarks of poseResult.landmarks) {
                const leftHip = landmarks[23];
                const rightHip = landmarks[24];
                if (!leftHip || !rightHip) continue;

                const playerScreenPosX = (leftHip.x + rightHip.x) / 2 * video.videoWidth;
                
                const isPlayerOnLeftSide = playerScreenPosX < screenMidpointX;
                
                // If home attacks right, their goal is left, so players on the left are home players (defending).
                const isHomePlayer = state.homeTeamAttackDirection === 'right' ? isPlayerOnLeftSide : !isPlayerOnLeftSide;

                const point: Point = {
                    x: ((leftHip.x + rightHip.x) / 2) * 100,
                    y: ((leftHip.y + rightHip.y) / 2) * 100,
                };

                if (isHomePlayer) {
                    homePoints.push(point);
                } else {
                    awayPoints.push(point);
                }
            }

            if (homePoints.length > 0 || awayPoints.length > 0) {
                dispatch({ type: 'ADD_HEATMAP_POINTS', payload: { home: homePoints, away: awayPoints } });
            }

        }, 500); // Collect data every 0.5 seconds
    }

    return () => {
        if (heatmapInterval) window.clearInterval(heatmapInterval);
    };
}, [state.isMatchPlaying, isAdvancedAnalysisEnabled, poseLandmarker, state.homeTeamAttackDirection, dispatch, videoRef]);

  // Live Tactical Analysis - MANUAL
  const handleTacticsFetch = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || isFetchingSuggestion || !isOnline) return;

    setIsFetchingSuggestion(true);
    setLiveTacticalSuggestion(null); // Clear old one while fetching
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const base64Frame = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            const suggestion = await getTacticalSuggestion(base64Frame, state);
            setLiveTacticalSuggestion(suggestion);
        } catch (e) {
            console.error("Failed to get tactical suggestion:", e);
        }
    }
    setIsFetchingSuggestion(false);
  }, [isFetchingSuggestion, isOnline, state, videoRef, canvasRef]);

  // Live Tactical Analysis - AUTOMATIC MODE
  useEffect(() => {
    // Stop and clear any existing interval if the mode is off or user is offline
    if (!isLiveTacticsOn || !isOnline) {
      if (tacticsIntervalRef.current) {
        clearInterval(tacticsIntervalRef.current);
        tacticsIntervalRef.current = null;
      }
      return; // Exit early
    }

    // Set up a recurring fetch
    tacticsIntervalRef.current = window.setInterval(() => {
      // Don't fetch if another fetch is already in progress
      if (!isFetchingSuggestion) {
        handleTacticsFetch();
      }
    }, 45000); // Fetch a new suggestion every 45 seconds

    // Cleanup function to clear interval
    return () => {
      if (tacticsIntervalRef.current) {
        clearInterval(tacticsIntervalRef.current);
        tacticsIntervalRef.current = null;
      }
    };
  }, [isLiveTacticsOn, isOnline, handleTacticsFetch, isFetchingSuggestion]);
  
  const toggleLiveTactics = () => {
      const willBeOn = !isLiveTacticsOn;
      setIsLiveTacticsOn(willBeOn);
      if (willBeOn) {
          // If turning on, fetch immediately.
          handleTacticsFetch();
      } else {
          // If turning off, clear any existing suggestion.
          setLiveTacticalSuggestion(null);
      }
  };
  
  // Translation Effect
  useEffect(() => {
    const handleTranslation = async () => {
      const isTranslatable = state.commentary && !state.commentary.includes('thinking') && !state.commentary.includes('Welcome') && !state.commentary.includes('(Offline)');
      if (selectedLanguage !== 'english' && isTranslatable) {
        setIsTranslating(true);
        try {
          const translated = await translateText(state.commentary, selectedLanguage);
          setTranslatedCommentary(translated);
        } catch (error) {
          console.error("Translation failed:", error);
          setTranslatedCommentary("Translation failed.");
        } finally {
          setIsTranslating(false);
        }
      } else {
        setTranslatedCommentary(null);
      }
    };
    handleTranslation();
  }, [state.commentary, selectedLanguage]);


  // Event-based TTS commentary (when live commentary is off)
  useEffect(() => {
    if (state.isLiveCommentaryActive) return;

    const playCommentary = async () => {
        const isPlayable = state.commentary && !state.commentary.includes('thinking') && !state.commentary.includes('Welcome');
        if (!isPlayable) return;

        setTtsAudioStatus('loading');
        try {
            const base64Audio = await generateSpeech(state.commentary, state.commentaryStyle, state.lastEventExcitement);
             if (!outputAudioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            }
            const audioContext = outputAudioContextRef.current;
            if (audioContext.state === 'suspended') await audioContext.resume();

            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => setTtsAudioStatus('idle');
            source.start();
            setTtsAudioStatus('playing');
        } catch (error) {
            console.error("Failed to play event commentary:", error);
            setTtsAudioStatus('error');
        }
    };
    playCommentary();
  }, [state.commentary, state.commentaryStyle, state.lastEventExcitement, state.isLiveCommentaryActive]);

  // AI Auto Camera Switching (Intelligent Director)
  useEffect(() => {
    let cameraInterval: number | null = null;

    if (state.isAutoCameraOn && isAdvancedAnalysisEnabled && poseLandmarker) {
        cameraInterval = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            const video = videoRef.current;
            const videoTime = performance.now();
            const poseResult = poseLandmarker.detectForVideo(video, videoTime);

            // Need at least 2 players for clustering analysis
            if (poseResult.landmarks.length < 2) return; 

            // 1. Get player positions
            const playerPositions: { x: number, y: number }[] = [];
            for (const landmarks of poseResult.landmarks) {
                const leftHip = landmarks[23];
                const rightHip = landmarks[24];
                if (leftHip && rightHip) {
                    playerPositions.push({
                        x: ((leftHip.x + rightHip.x) / 2) * 100,
                        y: ((leftHip.y + rightHip.y) / 2) * 100,
                    });
                }
            }
            if (playerPositions.length < 2) return;

            // 2. Analyze player distribution (clustering)
            const n = playerPositions.length;
            const avgX = playerPositions.reduce((sum, p) => sum + p.x, 0) / n;
            const avgY = playerPositions.reduce((sum, p) => sum + p.y, 0) / n;
            
            const stdDevX = Math.sqrt(playerPositions.reduce((sum, p) => sum + Math.pow(p.x - avgX, 2), 0) / n);
            const stdDevY = Math.sqrt(playerPositions.reduce((sum, p) => sum + Math.pow(p.y - avgY, 2), 0) / n);
            
            // Define thresholds for clustering. Smaller std dev means more clustered.
            const CLUSTER_THRESHOLD_X = 20; // 20% of screen width
            const CLUSTER_THRESHOLD_Y = 25; // 25% of screen height
            const isClustered = stdDevX < CLUSTER_THRESHOLD_X && stdDevY < CLUSTER_THRESHOLD_Y;

            // 2.5 Calculate Momentum (Velocity of centroid)
            const nowTime = Date.now();
            let velocityY = 0;
            let velocityX = 0;
            const prevCenter = previousCenterRef.current;
            
            if (prevCenter) {
                const dt = (nowTime - prevCenter.time) / 1000; // in seconds
                if (dt > 0) {
                    velocityX = (avgX - prevCenter.x) / dt;
                    velocityY = (avgY - prevCenter.y) / dt;
                }
            }
            previousCenterRef.current = { x: avgX, y: avgY, time: nowTime };

            // Detect rapid movement across the pitch (Fast Break)
            const isFastBreak = Math.abs(velocityY) > 20 || Math.abs(velocityX) > 20;

            // 3. Determine zone of play based on the cluster's center
            let zone: 'midfield' | 'goal_a' | 'goal_b';
            const GOAL_AREA_Y_TOP = 30; // Top 30% of screen
            const GOAL_AREA_Y_BOTTOM = 70; // Bottom 30% of screen
            const PENALTY_BOX_X_MIN = 20; // 20% from left
            const PENALTY_BOX_X_MAX = 80; // 80% from left

            if (avgY < GOAL_AREA_Y_TOP && avgX > PENALTY_BOX_X_MIN && avgX < PENALTY_BOX_X_MAX) {
                zone = 'goal_a';
            } else if (avgY > GOAL_AREA_Y_BOTTOM && avgX > PENALTY_BOX_X_MIN && avgX < PENALTY_BOX_X_MAX) {
                zone = 'goal_b';
            } else {
                zone = 'midfield';
            }

            // 4. Decide on camera switch (with hysteresis to prevent rapid switching)
            const MIN_CHECKS_TO_SWITCH = 2; // Must be in a new zone for 2 consecutive checks
            const MIN_TIME_BETWEEN_SWITCHES = 5000; // 5 seconds

            let newConsecutiveChecks = consecutiveChecks;
            if (zone === currentPlayZone) {
                newConsecutiveChecks++;
                setConsecutiveChecks(newConsecutiveChecks);
            } else {
                setCurrentPlayZone(zone);
                setConsecutiveChecks(1);
                newConsecutiveChecks = 1;
            }

            if (newConsecutiveChecks >= MIN_CHECKS_TO_SWITCH) {
                const MathAbsV = Math.abs(velocityY) + Math.abs(velocityX);
                const now = Date.now();
                if (now - lastCameraSwitchTimeRef.current > MIN_TIME_BETWEEN_SWITCHES || isFastBreak) {
                    let newCamera: string;
                    
                    // Priority 1: Fast break / Counter-attack
                    if (isFastBreak) {
                        newCamera = 'Action Cam'; // Follow fast break closely
                    }
                    // Priority 2: Highly clustered (e.g., around the ball or a key player set piece)
                    else if (isClustered && n <= 4) {
                        newCamera = 'Player Cam'; // Zoom on key players
                    } 
                    // Priority 3: Goalmouth action
                    else if (zone === 'goal_a') {
                        newCamera = 'Goal Cam A';
                    } else if (zone === 'goal_b') {
                        newCamera = 'Goal Cam B';
                    } 
                    // Priority 4: Midfield tactical
                    else if (zone === 'midfield') {
                        // If players are spread out, use tactical overview. If clustered, focus on the action (ball).
                        newCamera = isClustered ? 'Action Cam' : 'Tactical Cam';
                    } else {
                        newCamera = 'Main Cam';
                    }

                    if (newCamera !== state.activeCamera) {
                        console.log(`AI Director: Switching to ${newCamera} (Zone: ${zone}, FastBreak: ${isFastBreak}, Clustered: ${isClustered}, Velocity: ${MathAbsV.toFixed(1)})`);
                        dispatch({ type: 'SET_AUTO_CAMERA', payload: newCamera });
                        lastCameraSwitchTimeRef.current = now;
                    }
                }
            }
        }, 500); // Analyze every 0.5 seconds
    }

    return () => {
        if (cameraInterval) window.clearInterval(cameraInterval);
    };
}, [state.isAutoCameraOn, isAdvancedAnalysisEnabled, poseLandmarker, dispatch, videoRef, state.activeCamera, currentPlayZone, consecutiveChecks]);

  // Periodic bottom score graphic
  useEffect(() => {
    if (state.matchTime > 0 && state.matchTime % 30 === 0) {
      setShowBottomScore(true);
      const timer = setTimeout(() => setShowBottomScore(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.matchTime]);

  const toggleAd = () => setIsAdShowing(!isAdShowing);
  const toggleFormationDisplay = () => setShowFormationDisplay(prev => !prev);


  const replayVideoRef = useRef<HTMLVideoElement>(null);
  const varCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup object URL on unmount or URL change
  useEffect(() => {
    const currentVideo = replayVideoRef.current;
    return () => {
      if (replayState.url) {
        URL.revokeObjectURL(replayState.url);
      }
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.src = "";
        currentVideo.load();
      }
    };
  }, [replayState.url]);

  // Cleanup VAR check object URL on unmount or URL change
  useEffect(() => {
    const currentVarUrl = state.varCheck?.videoUrl;
    return () => {
      if (currentVarUrl) {
        URL.revokeObjectURL(currentVarUrl);
      }
      if (varCheckTimeoutRef.current) {
        clearTimeout(varCheckTimeoutRef.current);
      }
    };
  }, [state.varCheck?.videoUrl]);

  const handleTriggerReplay = useCallback(async () => {
    if (replayState.isReplaying) return; // Don't trigger a replay if one is already playing

    try {
      const replayBlob = await recorderService.getReplayBlob();
      if (replayBlob.size === 0) {
          console.warn("Replay buffer is empty.");
          return;
      }

      const url = URL.createObjectURL(replayBlob);
      setReplayState({ isReplaying: true, url: url });
      if (state.adBanner) {
          setIsAdShowing(true);
      }
    } catch (e) {
      console.error("Failed to trigger replay:", e);
      alert("Could not initialize replay. Please try again.");
    }
  }, [replayState.isReplaying, state.adBanner]);

  const handleReplayEnd = () => {
    setReplayState({ isReplaying: false, url: null });
    if (state.adBanner) {
        setIsAdShowing(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleReplayTimeUpdate = () => {
    if (replayVideoRef.current) {
      setReplayCurrentTime(replayVideoRef.current.currentTime);
    }
  };

  const handleReplayLoadedMetadata = () => {
    if (replayVideoRef.current) {
      setReplayDuration(replayVideoRef.current.duration);
    }
  };

  const toggleReplayPlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (replayVideoRef.current) {
      try {
        if (replayIsPlaying) {
          replayVideoRef.current.pause();
        } else {
          await replayVideoRef.current.play();
        }
        setReplayIsPlaying(!replayIsPlaying);
      } catch (err) {
        console.error("Replay playback error:", err);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!replayVideoRef.current) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: replayVideoRef.current.currentTime,
      vol: replayVideoRef.current.volume
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !replayVideoRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal scrub (swipe full width to scrub 100% of duration)
        const scrubRatio = dx / width; 
        const newTime = Math.max(0, Math.min(replayVideoRef.current.duration, touchStartRef.current.time + scrubRatio * replayVideoRef.current.duration));
        replayVideoRef.current.currentTime = newTime;
    } else {
        // Vertical volume (swipe up half screen to go from 0 to 1)
        const volRatio = -dy / (height / 2); 
        const newVol = Math.max(0, Math.min(1, touchStartRef.current.vol + volRatio));
        replayVideoRef.current.volume = newVol;
        setCurrentVolume(newVol);
        setShowVolumeIndicator(true);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setTimeout(() => setShowVolumeIndicator(false), 2000);
  };
  
  const handleTriggerVarCheck = useCallback(async (event: GameEvent) => {
    if (!isOnline) {
        alert("VAR Check requires an internet connection.");
        return;
    }

    if (state.isMatchPlaying) {
        dispatch({ type: 'TOGGLE_PLAY' });
    }

    try {
        const replayBlob = await recorderService.getReplayBlob();
        if (replayBlob.size === 0) {
            alert("Replay buffer is empty, cannot run VAR check.");
            return;
        }

        const videoUrl = URL.createObjectURL(replayBlob);
        dispatch({ type: 'START_VAR_CHECK', payload: { event, videoUrl } });
        
        const reviewDetails = event.playerName 
            ? `${event.type} involving ${event.playerName} (#${event.playerNumber})`
            : event.type;

        processGameEventWithCommentary({
            id: Date.now(),
            type: 'VAR_CHECK',
            teamName: event.teamName,
            matchTime: state.matchTime,
            details: reviewDetails
        });

        if (varCheckTimeoutRef.current) {
            clearTimeout(varCheckTimeoutRef.current);
            varCheckTimeoutRef.current = null;
        }

        try {
            let base64Frame = '';
            if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    base64Frame = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                }
            }

            if (!base64Frame) {
                throw new Error("Could not capture frame for analysis.");
            }

            const result = await analyzeRefereeDecision(base64Frame, event, state);
            dispatch({ type: 'SET_VAR_ANALYSIS', payload: { analysis: result.reasoning, recommendation: result.recommendation } });
            
            // Automatically close the overlay after 10 seconds
            varCheckTimeoutRef.current = setTimeout(() => {
                dispatch({ type: 'CLEAR_VAR_CHECK' });
            }, 10000);
        } catch (e: unknown) {
            console.error("VAR analysis failed:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            dispatch({ type: 'SET_VAR_ANALYSIS', payload: { analysis: errorMessage, recommendation: 'Undetermined' } });
            
            // Automatically close the overlay after 5 seconds on error
            varCheckTimeoutRef.current = setTimeout(() => {
                dispatch({ type: 'CLEAR_VAR_CHECK' });
            }, 5000);
        }
    } catch (err) {
        console.error("VAR request preparation failed:", err);
        alert("Failed to prepare VAR analysis.");
    }
  }, [isOnline, state, dispatch, processGameEventWithCommentary, videoRef]);
  
  const toggleStats = () => setShowStats(!showStats);
  const togglePlayerStats = () => setShowPlayerStats(!showPlayerStats);

  const toggleTacticsBoard = useCallback(() => {
    setIsTacticsBoardVisible(prev => {
        const willBeVisible = !prev;
        if (willBeVisible) {
            // If the match is playing, pause it.
            if (state.isMatchPlaying) {
                dispatch({ type: 'TOGGLE_PLAY' });
            }
            videoRef.current?.pause();
        } else {
            // Let the user manually resume play, but ensure video can play if not paused by clock
             videoRef.current?.play().catch(e => console.error("Video play failed", e));
        }
        return willBeVisible;
    });
  }, [state.isMatchPlaying, dispatch, videoRef]);

  const handleToggleCamera = useCallback(() => {
    if (videoDevices.length > 1) {
        const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
        setCurrentDeviceIndex(nextIndex);
        const nextDevice = videoDevices[nextIndex];
        setupCamera(nextDevice.deviceId);
        dispatch({ type: 'SET_CAMERA', payload: nextDevice.label });
    }
  }, [currentDeviceIndex, videoDevices, setupCamera, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Only activate shortcuts when camera is active and modals are not open
      if (cameraState !== 'active' || isTacticsBoardVisible || showEndMatchConfirm || showSubModal || showInstructions) {
          return;
      }
      
      // Prevent shortcuts from firing when certain overlays are visible
      if(state.varCheck?.isActive || state.injuryStoppage || state.matchPeriod === 'halfTime' || state.matchPeriod === 'fullTime') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault(); // Prevent page scroll
          dispatch({ type: 'TOGGLE_PLAY' });
          break;
        case 'e':
          setShowEndMatchConfirm(true);
          break;
        case 'r':
          handleTriggerReplay();
          break;
        case 't':
          toggleTacticsBoard();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cameraState, dispatch, handleTriggerReplay, toggleTacticsBoard, isTacticsBoardVisible, showEndMatchConfirm, showSubModal, showInstructions, state.varCheck, state.injuryStoppage, state.matchPeriod]);
  
  const renderCameraOverlay = () => {
    if (permissionStatus === 'checking') {
        return (
             <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Checking Permissions...</h2>
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        );
    }
    
    if (permissionStatus === 'denied') {
        return (
            <div className="text-center text-white bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg animate-fade-in-up">
              <h2 className="text-2xl font-bold mb-4 text-red-500">Camera Access Denied</h2>
              <p className="mb-6 text-gray-300">
                  This app needs camera access to function. Please go to your browser's site settings, allow camera access, and then reload the page.
              </p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">
                  Reload Page
              </button>
            </div>
        );
    }

    // If permission is granted or prompt is needed, we show the normal flow.
    switch (cameraState) {
        case 'inactive':
            return (
                <div className="text-center text-white animate-fade-in">
                    <h2 className="text-3xl font-bold mb-4">Ready to Film</h2>
                    <p className="mb-8 text-gray-300">Position your camera and click below to start the video feed.</p>
                    <button onClick={handleStartCamera} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                        Start Camera
                    </button>
                </div>
            );
        case 'error':
             return (
                <div className="text-center text-white bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg animate-fade-in-up">
                  <h2 className="text-2xl font-bold mb-4 text-yellow-400">Camera Error</h2>
                  <p className="mb-6 text-gray-300">{cameraError}</p>
                  <button onClick={handleStartCamera} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">
                      Try Again
                  </button>
                </div>
            );
        default:
            return null;
    }
  }
  
  const commentaryText = isTranslating
      ? "Translating..."
      : translatedCommentary || (state.isLiveCommentaryActive ? liveTranscription : state.commentary);
  
  const handleConfirmEndMatch = () => {
      onEndMatch();
      setShowEndMatchConfirm(false);
  };

  const GoLiveButton: React.FC = () => {
    if (state.isFanView) return null;

    if (state.broadcastStatus === 'live') {
        return (
             <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white font-bold py-2 px-4 rounded-lg shadow-lg z-50 flex items-center gap-2">
                <BroadcastIcon className="w-5 h-5" />
                BROADCASTING LIVE
            </div>
        );
    }

    if (state.broadcastStatus === 'publishing') {
         return (
             <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-gray-700/90 text-white font-bold py-2 px-4 rounded-lg shadow-lg z-50 flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Publishing...
            </div>
        );
    }

    // idle or error state
    return (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1">
            <button
                onClick={handleGoLive}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center gap-2"
            >
                <BroadcastIcon className="w-5 h-5" />
                Go Live
            </button>
            {state.broadcastStatus === 'error' && <p className="text-xs text-red-300 bg-black/50 px-2 py-1 rounded">{publishError}</p>}
        </div>
    );
  };


  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-500 ${replayState.isReplaying ? 'filter grayscale opacity-50 scale-100' : 'scale-100'} ${cameraState !== 'active' ? 'bg-slate-950' : ''}`}
        autoPlay
        playsInline
        muted
        crossOrigin="anonymous"
      />
      
      {/* Futuristic Scanline Effect */}
      <div className="scanline"></div>
      
      {cameraState !== 'active' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            {renderCameraOverlay()}
        </div>
      )}

      {cameraState === 'active' && (
        <>
          <GoLiveButton />

          <div className="absolute top-5 right-5 flex items-center gap-4 z-50">
            <h1 className="hidden md:block text-2xl font-bold opacity-80" style={{ color: '#00e676' }}>BolaVision</h1>
             {videoDevices.length > 1 && (
                <button
                    onClick={handleToggleCamera}
                    className="bg-gray-800/80 hover:bg-blue-700 p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 group"
                    aria-label="Switch Camera"
                    title="Switch Camera"
                >
                    <SwitchCameraIcon className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
                </button>
            )}
            <button
              onClick={() => setShowEndMatchConfirm(true)}
              className="bg-gray-800/80 hover:bg-red-700 p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 group"
              aria-label="End Match"
              title="End Match (E)"
            >
              <EndMatchIcon className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          
          <NetworkIndicator />
          <SyncManager />
          <BreakOverlay 
            onEndMatch={() => setShowEndMatchConfirm(true)}
            onStartSecondHalf={() => {
                dispatch({ type: 'SET_MATCH_PERIOD', payload: 'secondHalf' });
                dispatch({ type: 'TOGGLE_PLAY' });
            }}
            onStartExtraTimeSecondHalf={() => {
                dispatch({ type: 'SET_MATCH_PERIOD', payload: 'extraTimeSecondHalf' });
                dispatch({ type: 'TOGGLE_PLAY' });
            }}
            onStartExtraTime={() => dispatch({ type: 'START_EXTRA_TIME' })}
            onStartPenaltyShootout={() => dispatch({ type: 'START_PENALTY_SHOOTOUT' })}
          />
          <PenaltyShootoutOverlay />
          {state.varCheck?.isActive && <VarCheckOverlay />}
          {state.injuryStoppage && <InjuryOverlay injuryStoppage={state.injuryStoppage} onShowSubModal={() => setShowSubModal(true)} />}
          <GoalAnimation />
          <GoalImpactOverlay />
          <PlayerGraphic />
          <PlayerStatPopup />
          <KeyPlayerSpotlight />
          <Scoreboard />
          <EventLog />
          <LiveTacticsOverlay 
            suggestion={liveTacticalSuggestion} 
            onFadeOut={() => setLiveTacticalSuggestion(null)} 
          />
           {showFormationDisplay && (
            <FormationDisplay
              homeTeam={state.homeTeam}
              awayTeam={state.awayTeam}
              onClose={() => setShowFormationDisplay(false)}
            />
          )}

          <div key={state.activeCamera} className="absolute top-4 right-1/2 translate-x-1/2 md:right-auto md:left-1/2 md:-translate-x-1/2 glass-panel neon-border-cyan text-white px-4 py-1.5 rounded-full text-xs font-display tracking-widest animate-fade-in-fast flex items-center gap-2 z-10">
              <CameraIcon className="w-4 h-4 neon-text-cyan" />
              <span className="uppercase">{state.activeCamera}</span>
              {state.isAutoCameraOn && <BrainIcon className="w-4 h-4 text-neon-cyan animate-pulse" />}
          </div>
          
          {showBottomScore && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-panel neon-border-cyan px-10 py-3 rounded-xl text-2xl font-display animate-fade-in-up">
                  <span className="text-white/80">{state.homeTeam.name} </span>
                  <span className="text-neon-cyan font-black mx-2">{state.homeStats.goals} - {state.awayStats.goals}</span>
                  <span className="text-white/80"> {state.awayTeam.name}</span>
              </div>
          )}
          
          {state.broadcastStyles.includes('winProbability') && <WinProbabilityBar />}

          <PollOverlay />

          {replayState.isReplaying && replayState.url && (
              <div className="absolute inset-0 flex items-center justify-center z-40 animate-fade-in bg-black/80">
                  <div className="relative w-11/12 h-11/12 max-w-4xl max-h-[80vh] group">
                      <video
                          ref={replayVideoRef}
                          key={replayState.url}
                          src={replayState.url}
                          autoPlay
                          onEnded={handleReplayEnd}
                          onTimeUpdate={handleReplayTimeUpdate}
                          onLoadedMetadata={handleReplayLoadedMetadata}
                          onPlay={() => setReplayIsPlaying(true)}
                          onPause={() => setReplayIsPlaying(false)}
                          onClick={toggleReplayPlayPause}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          className="w-full h-full object-contain rounded-lg shadow-2xl cursor-pointer touch-none"
                      />
                      <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 text-2xl font-extrabold tracking-widest rounded-lg shadow-2xl animate-fade-in-fast">
                          INSTANT REPLAY
                      </div>
                      
                      {showVolumeIndicator && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white px-6 py-4 rounded-2xl flex flex-col items-center gap-2 animate-fade-in-fast pointer-events-none">
                              <span className="font-display uppercase tracking-widest text-xs">Volume</span>
                              <div className="w-32 h-2 bg-gray-600 rounded-full overflow-hidden">
                                  <div className="h-full bg-neon-cyan transition-all duration-100" style={{ width: `${currentVolume * 100}%` }} />
                              </div>
                          </div>
                      )}

                      {/* Controls Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg flex items-center gap-4">
                          <button onClick={toggleReplayPlayPause} className="text-white hover:text-blue-400 transition">
                              {replayIsPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                          </button>
                          <div className="text-white font-mono text-sm">
                              {formatTime(replayCurrentTime)} / {formatTime(replayDuration)}
                          </div>
                          <button onClick={handleReplayEnd} className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded font-bold text-sm transition">
                              Close
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {isAnalyzing && (
            <div className={`absolute bottom-24 left-4 flex items-center gap-2 ${isAdvancedAnalysisEnabled ? 'bg-blue-800/80' : 'bg-gray-800/80'} text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse`}>
              {isAdvancedAnalysisEnabled ? <BrainIcon className="w-5 h-5"/> : <AiAnalysisIcon className="w-5 h-5" />}
              AI Analyzing...
            </div>
          )}

          <StatsOverlay isVisible={showStats} onClose={toggleStats} />
          <PlayerStatsOverlay isVisible={showPlayerStats} onClose={togglePlayerStats} />
          <CommentaryDisplay 
            text={commentaryText}
            audioStatus={state.isLiveCommentaryActive ? liveAudioStatus : ttsAudioStatus}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            isTranslating={isTranslating}
          />
          {isTacticsBoardVisible && <TacticalBoard videoRef={videoRef} onClose={toggleTacticsBoard} />}

          {showHeatmap && (
              <div className="absolute top-20 right-4 w-64 h-96 z-30 bg-black/80 p-2 rounded-lg shadow-2xl border border-gray-700 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-white text-sm font-bold">Player Heatmap</h3>
                      <button onClick={() => setShowHeatmap(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <div className="w-full h-[calc(100%-2rem)] relative">
                      <HeatmapDisplay 
                          points={[...state.heatmapData.home, ...state.heatmapData.away]} 
                          color="#ffeb3b" 
                      />
                  </div>
              </div>
          )}

          <ControlPanel 
            toggleAd={toggleAd} 
            toggleReplay={handleTriggerReplay} 
            toggleStats={toggleStats}
            togglePlayerStats={togglePlayerStats}
            toggleInstructions={() => setShowInstructions(true)}
            toggleSubModal={() => setShowSubModal(true)}
            toggleTacticsBoard={toggleTacticsBoard}
            toggleFormationDisplay={toggleFormationDisplay}
            isAdvancedAnalysisEnabled={isAdvancedAnalysisEnabled}
            toggleAdvancedAnalysis={() => setIsAdvancedAnalysisEnabled(prev => !prev)}
            isPoseLandmarkerLoading={isPoseLandmarkerLoading}
            autoSaveMessage={autoSaveMessage}
            recordingSaveMessage={recordingSaveMessage}
            isRecording={isRecording}
            toggleRecording={handleToggleRecording}
            isOnline={isOnline}
            isLiveTacticsOn={isLiveTacticsOn}
            toggleLiveTactics={toggleLiveTactics}
            onManualTacticsFetch={handleTacticsFetch}
            isFetchingSuggestion={isFetchingSuggestion}
            onTriggerVarCheck={handleTriggerVarCheck}
            showHeatmap={showHeatmap}
            toggleHeatmap={() => setShowHeatmap(prev => !prev)}
          />

          {isAdShowing && state.adBanner && <AdBanner imageUrl={state.adBanner} />}
          
          {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
          {showSubModal && <SubstitutionModal onClose={() => setShowSubModal(false)} />}
        </>
      )}

      {showEndMatchConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] animate-fade-in-fast">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 text-white w-full max-w-md text-center border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-red-500">End Match?</h2>
                <p className="text-gray-300 mb-8">
                    Are you sure you want to end the current match? You will be taken to the post-match summary.
                </p>
                <div className="flex justify-center gap-4">
                    <button
                    onClick={() => setShowEndMatchConfirm(false)}
                    className="bg-gray-600 hover:bg-gray-700 font-bold py-3 px-8 rounded-lg transition"
                    >
                    Cancel
                    </button>
                    <button
                    onClick={handleConfirmEndMatch}
                    className="bg-red-600 hover:bg-red-700 font-bold py-3 px-8 rounded-lg transition"
                    >
                    Yes, End Match
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MatchScreen;

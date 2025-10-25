

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { analyzeVideoFrame, advancedFrameAnalysis, generateSpeech, translateText, getTacticalSuggestion, getWinProbability, analyzeRefereeDecision } from '../services/geminiService';
import { saveEncryptedState, saveVideoBlob } from '../services/storageService';
import { recorderService } from '../services/recorderService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useCamera } from '../hooks/useCamera';
import { useLiveCommentary } from '../hooks/useLiveCommentary';
import { blobToBase64, decode, encode, decodeAudioData } from '../utils/mediaUtils';
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
import { AiAnalysisIcon, BrainIcon, CameraIcon, CloudOfflineIcon, EndMatchIcon, BroadcastIcon, SwitchCameraIcon } from './icons/ControlIcons';
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

const BreakOverlay: React.FC = () => {
    const { state } = useMatchContext();
    const { matchPeriod, homeStats, awayStats, homeTeam, awayTeam } = state;

    if (matchPeriod !== 'halfTime' && matchPeriod !== 'fullTime') {
        return null;
    }

    const title = matchPeriod === 'halfTime' ? 'HALF TIME' : 'FULL TIME';
    const analysisPeriod = matchPeriod === 'halfTime' ? 'First Half' : 'Full Match';

    return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 animate-fade-in p-4">
            <div className="text-center mb-6">
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-widest text-white" style={{textShadow: '0 0 20px rgba(255,255,255,0.5)'}}>{title}</h1>
                <div className="text-4xl md:text-5xl font-bold text-yellow-400 bg-black/50 px-6 py-3 rounded-lg">
                    <span>{homeTeam.name.substring(0,3).toUpperCase()} </span>
                    <span>{homeStats.goals} - {awayStats.goals}</span>
                    <span> {awayTeam.name.substring(0,3).toUpperCase()}</span>
                </div>
            </div>
            <HalfTimeAnalysis period={analysisPeriod} />
        </div>
    );
};


const MatchScreen: React.FC<MatchScreenProps> = ({ onEndMatch }) => {
  const { state, dispatch, processGameEventWithCommentary } = useMatchContext();
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [replayState, setReplayState] = useState<{ isReplaying: boolean; url: string | null }>({ isReplaying: false, url: null });
  const [showBottomScore, setShowBottomScore] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSaveMessage, setRecordingSaveMessage] = useState('');
  
  const [isAdvancedAnalysisEnabled, setIsAdvancedAnalysisEnabled] = useState(false);
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
      
      const filterMediaPipeLogs = (originalFunc: (...args: any[]) => void, ...args: any[]) => {
          const firstArg = args[0];
          if (typeof firstArg === 'string' && firstArg.includes('gl_context.cc')) {
              return;
          }
          originalFunc(...args);
      };

      console.log = (...args) => filterMediaPipeLogs(originalConsoleLog, ...args);
      console.warn = (...args) => filterMediaPipeLogs(originalConsoleWarn, ...args);

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
    if (streamRef.current && cameraState === 'active' && !recorderService.isRecording()) {
      recorderService.startReplayBuffering(streamRef.current);
    }
    
    return () => {
        // Stop any active recorder on cleanup.
        recorderService.stop();
    }
  }, [cameraState, streamRef]);


  const handleToggleRecording = async () => {
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
  };

  // Main match clock
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (state.isMatchPlaying) {
      timer = setInterval(() => {
        const newTime = state.matchTime + 1;
        dispatch({ type: 'SET_TIME', payload: newTime });

        const firstHalfEnd = (45 * 60) + (state.injuryTime * 60);
        const secondHalfEnd = (90 * 60) + (state.injuryTime * 60);

        if (state.matchPeriod === 'firstHalf' && newTime >= firstHalfEnd) {
            dispatch({ type: 'SET_MATCH_PERIOD', payload: 'halfTime' });
        } else if (state.matchPeriod === 'secondHalf' && newTime >= secondHalfEnd) {
            dispatch({ type: 'SET_MATCH_PERIOD', payload: 'fullTime' });
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
                const videoTime = video.currentTime * 1000;
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
        const interval = isAdvancedAnalysisEnabled ? 20000 : 15000;
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
            const videoTime = video.currentTime * 1000;
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

        }, 2000); // Collect data every 2 seconds
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
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
        const videoTime = video.currentTime * 1000;
        const poseResult = poseLandmarker.detectForVideo(video, videoTime);

        if (poseResult.landmarks.length === 0) return; // No players detected

        // 1. Calculate the average vertical position of all players
        let totalY = 0;
        let detectedPlayers = 0;
        for (const landmarks of poseResult.landmarks) {
          // Use hips as a center point for a player
          const leftHip = landmarks[23];
          const rightHip = landmarks[24];
          if (leftHip && rightHip) {
            totalY += (leftHip.y + rightHip.y) / 2;
            detectedPlayers++;
          }
        }

        if (detectedPlayers === 0) return;

        const avgY = (totalY / detectedPlayers) * 100; // as percentage

        // 2. Determine zone of play
        let zone: 'midfield' | 'goal_a' | 'goal_b';
        if (avgY < 35) { // Action near top goal
          zone = 'goal_a';
        } else if (avgY > 65) { // Action near bottom goal
          zone = 'goal_b';
        } else { // Midfield action
          zone = 'midfield';
        }
        
        // 3. Decide on camera switch (with hysteresis to prevent rapid switching)
        const MIN_CHECKS_TO_SWITCH = 2; // Must be in a new zone for 2 consecutive checks
        const MIN_TIME_BETWEEN_SWITCHES = 5000; // 5 seconds

        let newConsecutiveChecks = consecutiveChecks;
        if (zone === currentPlayZone) {
          newConsecutiveChecks++;
          setConsecutiveChecks(newConsecutiveChecks);
        } else {
          // Reset if zone changes
          setCurrentPlayZone(zone);
          setConsecutiveChecks(1);
          newConsecutiveChecks = 1;
        }

        if (newConsecutiveChecks >= MIN_CHECKS_TO_SWITCH) {
          const now = Date.now();
          if (now - lastCameraSwitchTimeRef.current > MIN_TIME_BETWEEN_SWITCHES) {
            let newCamera: string;
            switch (zone) {
              case 'goal_a':
                newCamera = 'Goal Cam A';
                break;
              case 'goal_b':
                newCamera = 'Goal Cam B';
                break;
              case 'midfield':
                // Alternate between Main and Tactical in midfield
                newCamera = state.activeCamera === 'Main Cam' ? 'Tactical Cam' : 'Main Cam';
                break;
              default:
                newCamera = 'Main Cam';
            }
            
            if (newCamera !== state.activeCamera) {
                console.log(`AI Director: Switching to ${newCamera} (Zone: ${zone}, AvgY: ${avgY.toFixed(1)}%)`);
                dispatch({ type: 'SET_AUTO_CAMERA', payload: newCamera });
                lastCameraSwitchTimeRef.current = now;
            }
          }
        }
      }, 2000); // Analyze every 2 seconds
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


  const handleTriggerReplay = async () => {
    if (replayState.isReplaying) return; // Don't trigger a replay if one is already playing

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
  };

  const handleReplayEnd = () => {
    if (replayState.url) {
        URL.revokeObjectURL(replayState.url);
    }
    setReplayState({ isReplaying: false, url: null });
    if (state.adBanner) {
        setIsAdShowing(false);
    }
  };
  
  const handleTriggerVarCheck = useCallback(async (event: GameEvent) => {
    if (!isOnline) {
        alert("VAR Check requires an internet connection.");
        return;
    }

    if (state.isMatchPlaying) {
        dispatch({ type: 'TOGGLE_PLAY' });
    }

    const replayBlob = await recorderService.getReplayBlob();
    if (replayBlob.size === 0) {
        alert("Replay buffer is empty, cannot run VAR check.");
        return;
    }

    const videoUrl = URL.createObjectURL(replayBlob);
    dispatch({ type: 'START_VAR_CHECK', payload: { event, videoUrl } });
    
    processGameEventWithCommentary({
        id: Date.now(),
        type: 'VAR_CHECK',
        teamName: event.teamName,
        matchTime: state.matchTime,
        details: event.type
    });

    try {
        const frameBlob = await recorderService.getReplayBlob(); // using replay blob as a source for a frame
        const base64Frame = await blobToBase64(frameBlob);
        const result = await analyzeRefereeDecision(base64Frame, event, state);
        dispatch({ type: 'SET_VAR_ANALYSIS', payload: { analysis: result.reasoning, recommendation: result.recommendation } });
    } catch (e: any) {
        console.error("VAR analysis failed:", e);
        dispatch({ type: 'SET_VAR_ANALYSIS', payload: { analysis: e.message, recommendation: 'Undetermined' } });
    }
  }, [isOnline, state, dispatch, processGameEventWithCommentary]);
  
  const toggleStats = () => setShowStats(!showStats);
  const togglePlayerStats = () => setShowPlayerStats(!showPlayerStats);

  const toggleTacticsBoard = () => {
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
  };

  const handleToggleCamera = useCallback(() => {
    if (videoDevices.length > 1) {
        const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
        setCurrentDeviceIndex(nextIndex);
        const nextDevice = videoDevices[nextIndex];
        setupCamera(nextDevice.deviceId);
        dispatch({ type: 'SET_CAMERA', payload: nextDevice.label });
    }
  }, [currentDeviceIndex, videoDevices, setupCamera, dispatch]);
  
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
        className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-500 ${replayState.isReplaying ? 'filter grayscale opacity-50 scale-100' : 'scale-100'} ${cameraState !== 'active' ? 'bg-gray-800' : ''}`}
        autoPlay
        playsInline
        muted
        crossOrigin="anonymous"
      />
      
      {cameraState !== 'active' && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-20">
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
              title="End Match"
            >
              <EndMatchIcon className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          
          <NetworkIndicator />
          <SyncManager />
          <BreakOverlay />
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

          <div key={state.activeCamera} className="absolute top-4 right-1/2 translate-x-1/2 md:right-auto md:left-1/2 md:-translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-bold animate-fade-in-fast flex items-center gap-2 z-10">
              <CameraIcon className="w-5 h-5" />
              <span className="uppercase tracking-wider">{state.activeCamera}</span>
              {state.isAutoCameraOn && <BrainIcon className="w-5 h-5 text-cyan-400 animate-pulse" />}
          </div>
          
          {showBottomScore && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 px-8 py-2 rounded-full text-2xl font-bold animate-fade-in-up">
                  <span>{state.homeTeam.name} </span>
                  <span className="text-yellow-400">{state.homeStats.goals} - {state.awayStats.goals}</span>
                  <span> {state.awayTeam.name}</span>
              </div>
          )}
          
          {state.broadcastStyles.includes('winProbability') && <WinProbabilityBar />}

          <PollOverlay />

          {replayState.isReplaying && replayState.url && (
              <div className="absolute inset-0 flex items-center justify-center z-40 animate-fade-in">
                  <div className="relative w-11/12 h-11/12 max-w-4xl max-h-[80vh]">
                      <video
                          key={replayState.url}
                          src={replayState.url}
                          autoPlay
                          onEnded={handleReplayEnd}
                          className="w-full h-full object-contain rounded-lg shadow-2xl"
                      />
                      <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 text-2xl font-extrabold tracking-widest rounded-lg shadow-2xl animate-fade-in-fast">
                          INSTANT REPLAY
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
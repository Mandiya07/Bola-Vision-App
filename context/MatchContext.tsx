import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { MatchState, Stats, Team, GameEvent, Player, FieldMapping, Monetization, CommentaryStyle, CommentaryLanguage, CommentaryExcitement, Point, GameEventType, Highlight, BroadcastStyle, PenaltyAttempt, Official, WeatherCondition, WinProbability, Poll, SocialPostEvent } from '../types';
import { generateCommentary, getEventDescription, getWinProbability } from '../services/geminiService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { recorderService } from '../services/recorderService';
import { saveHighlightBlob } from '../services/storageService';

type MatchAction =
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'UPDATE_STAT'; payload: { team: 'home' | 'away'; stat: keyof Stats; value: number } }
  | { type: 'SET_COMMENTARY'; payload: { text: string; excitement: CommentaryExcitement } }
  | { type: 'PROCESS_GAME_EVENT'; payload: { event: GameEvent, proCallback?: (newState: MatchState) => Promise<void> } }
  | { type: 'UPDATE_EVENT_LOCATION'; payload: { eventId: number; location: Point } }
  | { type: 'SUBSTITUTE_PLAYER'; payload: { team: 'home' | 'away'; playerIn: Player; playerOut: Player } }
  | { type: 'CLEAR_GOAL_ANIMATION' }
  | { type: 'SET_CAMERA'; payload: string }
  | { type: 'TOGGLE_AUTO_CAMERA' }
  | { type: 'SET_AUTO_CAMERA'; payload: string }
  | { type: 'SET_FIELD_MAPPING'; payload: FieldMapping }
  | { type: 'TOGGLE_ATTACK_DIRECTION' }
  | { type: 'SET_SCOREBOARD_TEMPLATE'; payload: string }
  | { type: 'SET_MATCH_PERIOD'; payload: MatchState['matchPeriod'] }
  | { type: 'ADD_INJURY_TIME'; payload: number }
  | { type: 'TOGGLE_LIVE_COMMENTARY' }
  | { type: 'SHOW_PLAYER_GRAPHIC'; payload: { player: Player; team: 'home' | 'away'; eventType: GameEventType } }
  | { type: 'CLEAR_PLAYER_GRAPHIC' }
  | { type: 'SHOW_PLAYER_STAT_GRAPHIC'; payload: { player: Player; team: 'home' | 'away'; eventType: GameEventType } }
  | { type: 'CLEAR_PLAYER_STAT_GRAPHIC' }
  | { type: 'SET_PLAYER_OF_THE_MATCH'; payload: { player: Player; team: 'home' | 'away'; reasoning: string } }
  | { type: 'ADD_HEATMAP_POINTS'; payload: { home: Point[]; away: Point[] } }
  | { type: 'ADD_HIGHLIGHT'; payload: Highlight }
  | { type: 'SET_HIGHLIGHT_REEL'; payload: Highlight[] }
  | { type: 'START_EXTRA_TIME' }
  | { type: 'START_PENALTY_SHOOTOUT' }
  | { type: 'LOG_PENALTY_ATTEMPT'; payload: { team: 'home' | 'away'; player: Player; outcome: PenaltyAttempt['outcome'] } }
  | { type: 'LOG_INJURY'; payload: { team: 'home' | 'away'; player: Player } }
  | { type: 'RESUME_FROM_INJURY' }
  | { type: 'SET_WIN_PROBABILITY', payload: WinProbability }
  | { type: 'SHOW_GOAL_IMPACT', payload: { team: 'home' | 'away', player: Player, impact: number, newProbability: WinProbability } }
  | { type: 'CLEAR_GOAL_IMPACT' }
  | { type: 'START_POLL'; payload: Poll }
  | { type: 'VOTE_POLL'; payload: { optionId: string } }
  | { type: 'END_POLL' }
  | { type: 'CLEAR_POLL' }
  | { type: 'START_VAR_CHECK', payload: { event: GameEvent, videoUrl: string } }
  | { type: 'SET_VAR_ANALYSIS', payload: { analysis: string, recommendation: NonNullable<MatchState['varCheck']>['recommendation'] } }
  | { type: 'CLEAR_VAR_CHECK' }
  | { type: 'SHOW_KEY_PLAYER_SPOTLIGHT'; payload: { player: Player; team: 'home' | 'away'; analysis: string } }
  | { type: 'CLEAR_KEY_PLAYER_SPOTLIGHT' }
  | { type: 'OPEN_SOCIAL_MODAL'; payload: SocialPostEvent }
  | { type: 'CLOSE_SOCIAL_MODAL' }
  | { type: 'OPEN_SHARE_MODAL' }
  | { type: 'CLOSE_SHARE_MODAL' }
  | { type: 'PUBLISH_MATCH_SUCCESS'; payload: { matchId: string } }
  | { type: 'SET_BROADCAST_STATUS'; payload: MatchState['broadcastStatus'] };


interface MatchContextType {
  state: MatchState;
  dispatch: React.Dispatch<MatchAction>;
  processGameEventWithCommentary: (event: GameEvent) => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

const initialStats: Stats = {
  goals: 0,
  fouls: 0,
  possession: 50,
  shotsOnTarget: 0,
  shotsOffTarget: 0,
  yellowCards: 0,
  redCards: 0,
  corners: 0,
  offsides: 0,
  saves: 0,
};

const matchReducer = (state: MatchState, action: MatchAction): MatchState => {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      return { ...state, isMatchPlaying: !state.isMatchPlaying };
    case 'SET_TIME':
      return { ...state, matchTime: action.payload };
    case 'UPDATE_STAT': {
      const { team, stat, value } = action.payload;
      const teamStatsKey = team === 'home' ? 'homeStats' : 'awayStats';
      const updatedStats = {
        ...state[teamStatsKey],
        [stat]: state[teamStatsKey][stat] + value,
      };
      // Adjust possession
      if (stat === 'possession') {
          const otherTeam = team === 'home' ? 'awayStats' : 'homeStats';
          return {
              ...state,
              [teamStatsKey]: {...state[teamStatsKey], possession: value},
              [otherTeam]: {...state[otherTeam], possession: 100 - value},
          }
      }
      return { ...state, [teamStatsKey]: updatedStats };
    }
    case 'SET_COMMENTARY':
        return { ...state, commentary: action.payload.text, lastEventExcitement: action.payload.excitement };
    case 'PROCESS_GAME_EVENT': {
        const { event } = action.payload;
        const { type, teamName, playerNumber } = event;
        const team: 'home' | 'away' = teamName === state.homeTeam.name ? 'home' : 'away';
        const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
        const teamStatsKey = team === 'home' ? 'homeStats' : 'awayStats';
        const updatedTeamStats = { ...state[teamStatsKey] };
        let goalEvent: { team: 'home' | 'away' } | null = null;
        let playerGraphicEvent: MatchState['playerGraphicEvent'] = null;
        let playerStatGraphic: MatchState['playerStatGraphic'] = null;

        // Update individual player stats
        let updatedPlayers = [...state[teamKey].players];
        if (playerNumber) {
            const playerIndex = updatedPlayers.findIndex(p => p.number === playerNumber);
            if (playerIndex > -1) {
                const playerToUpdate = { ...updatedPlayers[playerIndex] };
                const newStats = { ...playerToUpdate.stats };

                switch(type) {
                    case 'GOAL': 
                        newStats.goals++; 
                        newStats.shots++; 
                        break;
                    case 'ASSIST': newStats.assists++; break;
                    case 'SHOT_ON_TARGET': newStats.shots++; break;
                    case 'SHOT_OFF_TARGET': newStats.shots++; break;
                    case 'SAVE': newStats.saves++; break;
                    case 'TACKLE': newStats.tackles++; break;
                    case 'PASS': newStats.passes++; break;
                }
                playerToUpdate.stats = newStats;
                updatedPlayers[playerIndex] = playerToUpdate;
            }
        }

        const teamPlayers = team === 'home' ? state.homeTeam.players : state.awayTeam.players;
        const eventPlayer = teamPlayers.find(p => p.number === event.playerNumber);

        // Find the player associated with the event to trigger a graphic
        if (eventPlayer && ['GOAL', 'YELLOW_CARD', 'RED_CARD'].includes(event.type)) {
            playerGraphicEvent = { player: eventPlayer, team, eventType: event.type };
        }
        
        // Trigger player stat pop-up for specific events if style is enabled
        const statTriggerEvents: GameEventType[] = ['SHOT_ON_TARGET', 'SHOT_OFF_TARGET', 'SAVE', 'TACKLE', 'ASSIST'];
        if (state.broadcastStyles.includes('playerStats') && statTriggerEvents.includes(event.type) && eventPlayer) {
            playerStatGraphic = { player: eventPlayer, team, eventType: event.type };
        }

        // Update team stats
        switch(type) {
            case 'GOAL': 
                updatedTeamStats.goals++;
                goalEvent = { team };
                break;
            case 'FOUL': updatedTeamStats.fouls++; break;
            case 'YELLOW_CARD': updatedTeamStats.yellowCards++; break;
            case 'RED_CARD': updatedTeamStats.redCards++; break;
            case 'CORNER': updatedTeamStats.corners++; break;
            case 'OFFSIDE': updatedTeamStats.offsides++; break;
            case 'SHOT_ON_TARGET': updatedTeamStats.shotsOnTarget++; break;
            case 'SHOT_OFF_TARGET': updatedTeamStats.shotsOffTarget++; break;
            case 'SAVE': updatedTeamStats.saves++; break;
            case 'ASSIST': // No team stat change, for player stats and commentary
            case 'TACKLE': // No team stat change, for player stats and commentary
            case 'PASS': // No team stat change, for player stats and commentary
            case 'INJURY':
            case 'PENALTY_SHOOTOUT_GOAL':
            case 'PENALTY_SHOOTOUT_MISS':
            case 'PENALTY_SHOOTOUT_SAVE':
            case 'VAR_CHECK':
                break;
        }
        
        const newState = { 
            ...state, 
            [teamStatsKey]: updatedTeamStats, 
            [teamKey]: { ...state[teamKey], players: updatedPlayers },
            goalEvent,
            playerGraphicEvent,
            playerStatGraphic,
            events: [...state.events, event] 
        };

        // Asynchronously call the pro callback if it exists
        if (action.payload.proCallback) {
            action.payload.proCallback(newState);
        }

        return newState;
    }
    case 'UPDATE_EVENT_LOCATION': {
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.eventId
            ? { ...event, location: action.payload.location }
            : event
        )
      };
    }
    case 'CLEAR_GOAL_ANIMATION':
        return { ...state, goalEvent: null };
    case 'SHOW_PLAYER_GRAPHIC':
        return { ...state, playerGraphicEvent: action.payload };
    case 'CLEAR_PLAYER_GRAPHIC':
        return { ...state, playerGraphicEvent: null };
    case 'SHOW_PLAYER_STAT_GRAPHIC':
        return { ...state, playerStatGraphic: action.payload };
    case 'CLEAR_PLAYER_STAT_GRAPHIC':
        return { ...state, playerStatGraphic: null };
    case 'SHOW_KEY_PLAYER_SPOTLIGHT':
        return { ...state, keyPlayerSpotlight: action.payload };
    case 'CLEAR_KEY_PLAYER_SPOTLIGHT':
        return { ...state, keyPlayerSpotlight: null };
    case 'SUBSTITUTE_PLAYER': {
        const { team, playerIn, playerOut } = action.payload;
        const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
        const updatedPlayers = state[teamKey].players
          .filter(p => p.number !== playerOut.number)
          .concat(playerIn)
          .sort((a,b) => a.number - b.number);
        
        return {
            ...state,
            [teamKey]: {
                ...state[teamKey],
                players: updatedPlayers
            }
        };
    }
    case 'SET_CAMERA':
      return { ...state, activeCamera: action.payload, isAutoCameraOn: false };
    case 'TOGGLE_AUTO_CAMERA':
      return { ...state, isAutoCameraOn: !state.isAutoCameraOn };
    case 'SET_AUTO_CAMERA': // For internal use by auto-switcher
      return { ...state, activeCamera: action.payload };
    case 'SET_FIELD_MAPPING':
        return { ...state, fieldMapping: action.payload };
    case 'TOGGLE_ATTACK_DIRECTION':
        return { ...state, homeTeamAttackDirection: state.homeTeamAttackDirection === 'right' ? 'left' : 'right' };
    case 'SET_SCOREBOARD_TEMPLATE':
        return { ...state, scoreboardTemplate: action.payload };
    case 'SET_MATCH_PERIOD':
      return {
        ...state,
        matchPeriod: action.payload,
        isMatchPlaying: false, // Always pause when period changes
        injuryTime: 0, // Reset injury time for the new period
      };
    case 'ADD_INJURY_TIME':
      return { ...state, injuryTime: action.payload };
    case 'TOGGLE_LIVE_COMMENTARY':
        return { ...state, isLiveCommentaryActive: !state.isLiveCommentaryActive };
    case 'SET_PLAYER_OF_THE_MATCH':
        return { ...state, playerOfTheMatch: action.payload };
    case 'ADD_HEATMAP_POINTS':
        return {
            ...state,
            heatmapData: {
                home: [...state.heatmapData.home, ...action.payload.home],
                away: [...state.heatmapData.away, ...action.payload.away],
            }
        };
    case 'ADD_HIGHLIGHT':
      return {
        ...state,
        // Add new highlight, preventing duplicates from rapid events
        highlights: [
            ...state.highlights.filter(h => h.id !== action.payload.id),
            action.payload
        ]
      };
    case 'SET_HIGHLIGHT_REEL':
        return { ...state, highlightReel: action.payload };
    case 'START_EXTRA_TIME':
        return {
            ...state,
            matchPeriod: 'extraTimeFirstHalf',
            isMatchPlaying: true,
            injuryTime: 0,
        };
    case 'START_PENALTY_SHOOTOUT':
        return {
            ...state,
            matchPeriod: 'penaltyShootout',
            isMatchPlaying: false,
            penaltyShootout: {
                homeScore: 0,
                awayScore: 0,
                homeAttempts: [],
                awayAttempts: [],
                currentTaker: 'home',
            }
        };
    case 'LOG_PENALTY_ATTEMPT': {
        if (!state.penaltyShootout) return state;

        const { team, player, outcome } = action.payload;
        const newAttempt: PenaltyAttempt = {
            playerNumber: player.number,
            playerName: player.name,
            outcome
        };

        const updatedShootout = { ...state.penaltyShootout };
        
        if (team === 'home') {
            updatedShootout.homeAttempts.push(newAttempt);
            if (outcome === 'goal') updatedShootout.homeScore++;
        } else {
            updatedShootout.awayAttempts.push(newAttempt);
            if (outcome === 'goal') updatedShootout.awayScore++;
        }
        
        // Switch taker
        updatedShootout.currentTaker = team === 'home' ? 'away' : 'home';

        // Check for winner
        const { homeAttempts, awayAttempts, homeScore, awayScore } = updatedShootout;
        const homeTaken = homeAttempts.length;
        const awayTaken = awayAttempts.length;

        if (homeTaken >= 5 && awayTaken >= 5 && homeScore !== awayScore) {
            updatedShootout.winner = homeScore > awayScore ? 'home' : 'away';
        } else if (homeTaken > 5 && awayTaken > 5 && homeTaken === awayTaken && homeScore !== awayScore) {
             updatedShootout.winner = homeScore > awayScore ? 'home' : 'away';
        } else if (homeTaken <= 5 && awayTaken <= 5) {
            const homeRemaining = 5 - homeTaken;
            const awayRemaining = 5 - awayTaken;
            if (homeScore > awayScore + awayRemaining) {
                updatedShootout.winner = 'home';
            } else if (awayScore > homeScore + homeRemaining) {
                updatedShootout.winner = 'away';
            }
        }
        
        let finalState: MatchState = { ...state, penaltyShootout: updatedShootout };
        if (updatedShootout.winner) {
            finalState.matchPeriod = 'fullTime';
        }

        return finalState;
    }
    case 'LOG_INJURY': {
        return {
            ...state,
            isMatchPlaying: false,
            injuryStoppage: {
                player: action.payload.player,
                team: action.payload.team,
                startTime: state.matchTime,
            },
        };
    }
    case 'RESUME_FROM_INJURY': {
        if (!state.injuryStoppage) return state;
        const stoppageDuration = state.matchTime - state.injuryStoppage.startTime;
        const injuryEventId = state.events.find(e => e.type === 'INJURY' && e.matchTime === state.injuryStoppage?.startTime)?.id;

        const updatedEvents = injuryEventId 
            ? state.events.map(e => e.id === injuryEventId ? { ...e, details: `Stoppage: ${stoppageDuration}s` } : e)
            : state.events;

        return {
            ...state,
            isMatchPlaying: true,
            injuryStoppage: null,
            events: updatedEvents,
        };
    }
    case 'SET_WIN_PROBABILITY':
        return { ...state, winProbability: action.payload };
    case 'SHOW_GOAL_IMPACT':
        return { ...state, goalImpactEvent: action.payload };
    case 'CLEAR_GOAL_IMPACT':
        return { ...state, goalImpactEvent: null };
    case 'START_POLL':
        return { ...state, activePoll: action.payload };
    case 'VOTE_POLL':
        if (!state.activePoll || !state.activePoll.isLive) return state;
        return {
            ...state,
            activePoll: {
                ...state.activePoll,
                options: state.activePoll.options.map(opt =>
                    opt.id === action.payload.optionId ? { ...opt, votes: opt.votes + 1 } : opt
                )
            }
        };
    case 'END_POLL':
        if (!state.activePoll) return state;
        return { ...state, activePoll: { ...state.activePoll, isLive: false } };
    case 'CLEAR_POLL':
        return { ...state, activePoll: null };
    case 'START_VAR_CHECK':
        return {
            ...state,
            isMatchPlaying: false,
            varCheck: {
                isActive: true,
                event: action.payload.event,
                videoUrl: action.payload.videoUrl,
                status: 'analyzing',
                analysis: null,
                recommendation: null,
            }
        };
    case 'SET_VAR_ANALYSIS':
        if (!state.varCheck) return state;
        return {
            ...state,
            varCheck: {
                ...state.varCheck,
                status: 'complete',
                analysis: action.payload.analysis,
                recommendation: action.payload.recommendation,
            }
        };
    case 'CLEAR_VAR_CHECK':
        return { ...state, varCheck: null };
    case 'OPEN_SOCIAL_MODAL':
        return {
            ...state,
            socialPostModal: {
                isOpen: true,
                event: action.payload,
            },
        };
    case 'CLOSE_SOCIAL_MODAL':
        return {
            ...state,
            socialPostModal: {
                isOpen: false,
                event: null,
            },
        };
    case 'OPEN_SHARE_MODAL':
        return { ...state, shareModalOpen: true };
    case 'CLOSE_SHARE_MODAL':
        return { ...state, shareModalOpen: false };
    case 'PUBLISH_MATCH_SUCCESS':
        return { 
            ...state, 
            matchId: action.payload.matchId 
        };
    case 'SET_BROADCAST_STATUS':
        return { ...state, broadcastStatus: action.payload };
    default:
      return state;
  }
};

interface MatchContextProviderProps {
    children: ReactNode;
    homeTeam?: Team;
    awayTeam?: Team;
    initialState?: MatchState;
    sponsorLogo?: string;
    adBanner?: string;
    scoreboardTemplate?: string;
    monetization?: Monetization;
    commentaryStyle?: CommentaryStyle;
    commentaryLanguage?: CommentaryLanguage;
    broadcastStyles?: BroadcastStyle[];
    matchType?: 'league' | 'knockout';
    officials?: Official[];
    leagueName?: string;
    matchDate?: string;
    matchTimeOfDay?: string;
    venue?: string;
    weather?: WeatherCondition;
    isFanView?: boolean;
}

// FIX: Cast the default monetization object to the Monetization type. This prevents TypeScript
// from inferring the 'model' property as a generic 'string', ensuring it matches the
// specific literal type ('free' | 'ppv' | 'subscription') required by the Monetization interface.
// FIX: Cast default values for `commentaryStyle`, `commentaryLanguage`, and `matchType` to their specific types
// to prevent them from being inferred as generic strings, which would cause a type mismatch.
export const MatchContextProvider: React.FC<MatchContextProviderProps> = ({ children, homeTeam, awayTeam, initialState: loadedState, sponsorLogo, adBanner, scoreboardTemplate = 'default', monetization = { model: 'free' } as Monetization, commentaryStyle = 'professional' as CommentaryStyle, commentaryLanguage = 'english' as CommentaryLanguage, broadcastStyles = [], matchType = 'league' as const, officials = [], leagueName = '', matchDate = '', matchTimeOfDay = '', venue = '', weather = 'Clear' as WeatherCondition, isFanView = false }) => {
  const createInitialState = (home: Team, away: Team): MatchState => ({
    homeTeam: home,
    awayTeam: away,
    homeStats: { ...initialStats },
    awayStats: { ...initialStats, possession: 50 },
    matchTime: 0,
    isMatchPlaying: false,
    commentary: 'Welcome to the match!',
    goalEvent: null,
    activeCamera: 'Main Cam',
    isAutoCameraOn: false,
    fieldMapping: null,
    homeTeamAttackDirection: 'right',
    sponsorLogo,
    adBanner,
    scoreboardTemplate,
    monetization,
    commentaryStyle,
    commentaryLanguage,
    broadcastStyles,
    lastEventExcitement: 'Normal',
    matchPeriod: 'firstHalf',
    injuryTime: 0,
    events: [],
    isLiveCommentaryActive: false,
    playerGraphicEvent: null,
    playerStatGraphic: null,
    playerOfTheMatch: null,
    heatmapData: { home: [], away: [] },
    highlights: [],
    highlightReel: null,
    matchType,
    penaltyShootout: null,
    injuryStoppage: null,
    officials,
    leagueName,
    matchDate,
    matchTimeOfDay,
    venue,
    weather,
    winProbability: null,
    goalImpactEvent: null,
    activePoll: null,
    varCheck: null,
    keyPlayerSpotlight: null,
    socialPostModal: { isOpen: false, event: null },
    shareModalOpen: false,
    isFanView,
    broadcastStatus: 'idle',
    matchId: null,
  });

  const initialState = loadedState || (homeTeam && awayTeam ? createInitialState(homeTeam, awayTeam) : null);
  const isOnline = useNetworkStatus();

  if (!initialState) {
      throw new Error("MatchContextProvider requires either an initial state or home/away teams.");
  }
  
  const [state, dispatch] = useReducer(matchReducer, initialState);

  const processGameEventWithCommentary = async (event: GameEvent) => {
    // Pro feature callback for goal impact
    const proCallback = async (newState: MatchState) => {
        if (event.type === 'GOAL' && newState.broadcastStyles.includes('winProbability')) {
            const teamSide = event.teamName === newState.homeTeam.name ? 'home' : 'away';
            const oldProb = newState.winProbability;
            if (oldProb) {
                try {
                    const newProb = await getWinProbability(newState);
                    dispatch({ type: 'SET_WIN_PROBABILITY', payload: newProb });
                    const impact = (newProb[teamSide] * 100) - (oldProb[teamSide] * 100);
                    const eventPlayer = newState[teamSide === 'home' ? 'homeTeam' : 'awayTeam'].players.find(p => p.number === event.playerNumber);
                    if (eventPlayer) {
                        dispatch({
                            type: 'SHOW_GOAL_IMPACT',
                            payload: {
                                team: teamSide,
                                player: eventPlayer,
                                impact: impact,
                                newProbability: newProb,
                            }
                        });
                    }
                } catch (e) {
                    console.error("Failed to calculate goal impact:", e);
                }
            }
        }
    };

    dispatch({ type: 'PROCESS_GAME_EVENT', payload: { event, proCallback } });

    // Highlight Capture Logic
    const highlightWorthyEvents: GameEventType[] = ['GOAL', 'RED_CARD', 'SAVE', 'SHOT_ON_TARGET'];
    if (highlightWorthyEvents.includes(event.type)) {
        try {
            const highlightBlob = await recorderService.getReplayBlob();
            if (highlightBlob.size > 0) {
                const storageId = await saveHighlightBlob(highlightBlob);
                const videoUrl = URL.createObjectURL(highlightBlob);
                dispatch({
                    type: 'ADD_HIGHLIGHT',
                    payload: { id: event.id, event, videoUrl, storageId }
                });
            }
        } catch (e) {
            console.error("Failed to capture and save highlight:", e);
        }
    }

    if (state.isLiveCommentaryActive) return; // Don't generate event commentary if live is active

    if (isOnline) {
        dispatch({ type: 'SET_COMMENTARY', payload: { text: 'AI is thinking...', excitement: 'Normal'} });
        try {
            const { text: commentaryText, excitement } = await generateCommentary(event, state);
            dispatch({ type: 'SET_COMMENTARY', payload: { text: commentaryText, excitement } });
        } catch(error) {
            console.error("Failed to generate commentary:", error);
            dispatch({ type: 'SET_COMMENTARY', payload: { text: 'Could not generate commentary at this time.', excitement: 'Normal' } });
        }
    } else {
        const basicCommentary = getEventDescription(event);
        dispatch({ type: 'SET_COMMENTARY', payload: { text: `${basicCommentary} (Offline)`, excitement: 'Normal' } });
    }
  };

  return (
    <MatchContext.Provider value={{ state, dispatch, processGameEventWithCommentary }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatchContext = (): MatchContextType => {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatchContext must be used within a MatchContextProvider');
  }
  return context;
};
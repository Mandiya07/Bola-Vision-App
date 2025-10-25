import type { Player as PlayerType } from "./types";
export interface PlayerStats {
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  tackles: number;
  saves: number;
}

export interface Player {
  number: number;
  name: string;
  role: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  photo?: string;
  stats: PlayerStats;
  x?: number; // Position on pitch (percentage)
  y?: number; // Position on pitch (percentage)
}

export interface Team {
  name: string;
  players: Player[];
  formation: string;
  logo?: string;
  color?: string;
  coachName?: string;
}

export interface Stats {
  goals: number;
  fouls: number;
  possession: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  offsides: number;
  saves: number;
}

export interface Point {
  x: number; // as percentage of width
  y: number; // as percentage of height
}

export type FieldMarker = 
  | 'topLeftCorner' 
  | 'topRightCorner' 
  | 'bottomLeftCorner' 
  | 'bottomRightCorner'
  | 'centerSpot';

export type FieldMapping = {
  [key in FieldMarker]?: Point;
};

export interface Monetization {
  model: 'free' | 'ppv' | 'subscription';
  price?: number;
}

export type CommentaryStyle = 'professional' | 'fan' | 'youth' | 'comic';
export type CommentaryLanguage = 'english' | 'french' | 'spanish' | 'swahili' | 'zulu';
export type CommentaryExcitement = 'Normal' | 'Excited' | 'Peak';

export interface Highlight {
  id: number; // Corresponds to the GameEvent ID
  event: GameEvent;
  videoUrl: string; // The local blob: url for immediate playback
  storageId: string; // The ID used to store the blob in IndexedDB
}

export type BroadcastStyle = 'playerStats' | 'winProbability' | 'interactivePolls';

export type MatchPeriod = 
  | 'firstHalf' 
  | 'halfTime' 
  | 'secondHalf' 
  | 'extraTimeHalfTime' 
  | 'extraTimeFirstHalf' 
  | 'extraTimeSecondHalf' 
  | 'penaltyShootout' 
  | 'fullTime';

export interface PenaltyAttempt {
  playerNumber: number;
  playerName: string;
  outcome: 'goal' | 'miss' | 'save';
}

export interface PenaltyShootout {
  homeScore: number;
  awayScore: number;
  homeAttempts: PenaltyAttempt[];
  awayAttempts: PenaltyAttempt[];
  currentTaker: 'home' | 'away';
  winner?: 'home' | 'away';
}

export interface Official {
  name: string;
  role: 'Referee' | 'Assistant Referee 1' | 'Assistant Referee 2' | 'Fourth Official';
}

export type WeatherCondition = 'Clear' | 'Cloudy' | 'Rain' | 'Snow' | 'Windy';

export interface WinProbability {
  home: number;
  away: number;
  draw: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isLive: boolean; // false means show results
}

export type SocialPostEvent = GameEvent | { type: 'FINAL_SCORE' | 'HALF_TIME' };

export interface MatchState {
  homeTeam: Team;
  awayTeam: Team;
  homeStats: Stats;
  awayStats: Stats;
  matchTime: number; // in seconds
  isMatchPlaying: boolean;
  commentary: string;
  goalEvent: { team: 'home' | 'away' } | null;
  activeCamera: string;
  isAutoCameraOn: boolean;
  fieldMapping: FieldMapping | null;
  sponsorLogo?: string;
  adBanner?: string;
  scoreboardTemplate?: string;
  homeTeamAttackDirection: 'left' | 'right';
  monetization: Monetization;
  commentaryStyle: CommentaryStyle;
  commentaryLanguage: CommentaryLanguage;
  lastEventExcitement: CommentaryExcitement;
  matchPeriod: MatchPeriod;
  injuryTime: number; // in minutes
  events: GameEvent[];
  isLiveCommentaryActive: boolean;
  playerGraphicEvent: { player: Player; team: 'home' | 'away'; eventType: GameEventType } | null;
  playerStatGraphic: { player: Player; team: 'home' | 'away'; eventType: GameEventType } | null;
  playerOfTheMatch: { player: Player; team: 'home' | 'away'; reasoning: string } | null;
  heatmapData: { home: Point[]; away: Point[] };
  highlights: Highlight[];
  highlightReel: Highlight[] | null;
  broadcastStyles: BroadcastStyle[];
  matchType: 'league' | 'knockout';
  penaltyShootout: PenaltyShootout | null;
  injuryStoppage: { player: Player; team: 'home' | 'away'; startTime: number; } | null;
  officials: Official[];
  leagueName?: string;
  matchDate?: string;
  matchTimeOfDay?: string;
  venue?: string;
  weather?: WeatherCondition;
  winProbability: WinProbability | null;
  goalImpactEvent: {
    team: 'home' | 'away';
    player: Player;
    impact: number;
    newProbability: WinProbability;
  } | null;
  activePoll: Poll | null;
  varCheck: {
    isActive: boolean;
    event: GameEvent;
    analysis: string | null;
    videoUrl: string | null;
    status: 'analyzing' | 'complete' | 'error';
    recommendation: 'Foul' | 'No Foul' | 'Goal' | 'No Goal' | 'Offside' | 'Onside' | 'Yellow Card' | 'Red Card' | 'Play On' | 'Undetermined' | null;
  } | null;
  keyPlayerSpotlight: {
    player: Player;
    team: 'home' | 'away';
    analysis: string;
  } | null;
  socialPostModal: {
    isOpen: boolean;
    event: SocialPostEvent | null;
  };
  shareModalOpen: boolean;
  isFanView: boolean;
  matchId: string | null;
  broadcastStatus: 'idle' | 'publishing' | 'live' | 'error';
}

export type GameEventType = 
  | 'GOAL'
  | 'FOUL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'CORNER'
  | 'OFFSIDE'
  | 'SHOT_ON_TARGET'
  | 'SHOT_OFF_TARGET'
  | 'SAVE'
  | 'SUBSTITUTION'
  | 'TACKLE'
  | 'PASS'
  | 'ASSIST'
  | 'INJURY'
  | 'PENALTY_SHOOTOUT_GOAL'
  | 'PENALTY_SHOOTOUT_MISS'
  | 'PENALTY_SHOOTOUT_SAVE'
  | 'VAR_CHECK';

export interface GameEvent {
  id: number; // Unique identifier (e.g., timestamp)
  type: GameEventType;
  teamName: string;
  matchTime: number; // The time in seconds when the event occurred
  playerName?: string;
  playerNumber?: number;
  playerRole?: Player['role'];
  details?: string;
  location?: Point; // Optional location for shots/goals
  // For substitutions
  playerIn?: Player;
  playerOut?: Player;
}

export interface AiDrawing {
  type: 'arrow' | 'circle' | 'zone';
  color: 'yellow' | 'red' | 'blue' | 'white';
  start?: Point;
  end?: Point;
  center?: Point;
  radius?: number; // percentage of canvas width
  area?: Point[]; // for zones, array of points
}

export interface TacticalSuggestion {
    suggestion: string;
    drawings: AiDrawing[];
}
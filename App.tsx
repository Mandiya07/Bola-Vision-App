

import React, { useState, useEffect, useMemo } from 'react';
import SetupScreen from './components/SetupScreen';
import MatchScreen from './components/MatchScreen';
import LineupScreen from './components/LineupScreen';
import CalibrationScreen from './components/CalibrationScreen';
import PostMatchScreen from './components/PostMatchScreen';
import FanViewScreen from './components/FanViewScreen';
import UpgradeModal from './components/UpgradeModal';
import SocialMediaModal from './components/SocialMediaModal';
import ShareModal from './components/ShareModal';
import { MatchContextProvider, useMatchContext } from './context/MatchContext';
import { ProContextProvider, useProContext } from './context/ProContext';
import type { Player, Team, MatchState, Monetization, CommentaryStyle, CommentaryLanguage, BroadcastStyle, Official, WeatherCondition } from './types';
import { MailIcon, LockIcon, LogoutIcon } from './components/icons/ControlIcons';
import { decode } from './utils/mediaUtils';

type MatchPhase = 'setup' | 'lineup' | 'calibration' | 'live' | 'postMatch';


const AuthScreen: React.FC<{ onLogin: () => void; onGuest: () => void }> = ({ onLogin, onGuest }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    console.log(`${isSignUp ? 'Signing up' : 'Logging in'} with`, { email });
    onLogin();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold" style={{ color: '#00e676' }}>BolaVision</h1>
          <p className="text-gray-400 italic mt-2">“Your Game, Our Vision.”</p>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-white mb-6">
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <MailIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 pl-10 text-white focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div className="relative">
              <LockIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 pl-10 text-white focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
          <div className="text-center mt-4">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-sm text-cyan-400 hover:underline">
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
        <div className="text-center mt-6">
          <button onClick={onGuest} className="text-gray-400 hover:text-white transition-colors">
            or Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};


const SocialMediaModalWrapper: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    return (
        <SocialMediaModal
            isOpen={state.socialPostModal.isOpen}
            event={state.socialPostModal.event}
            onClose={() => dispatch({ type: 'CLOSE_SOCIAL_MODAL' })}
        />
    )
}

const ShareModalWrapper: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    return (
        <ShareModal
            isOpen={state.shareModalOpen}
            onClose={() => dispatch({ type: 'CLOSE_SHARE_MODAL' })}
        />
    )
}

interface MainApplicationProps {
  onLogout: () => void;
}

const MainApplication: React.FC<MainApplicationProps> = ({ onLogout }) => {
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('setup');
  const [teams, setTeams] = useState<{ home: Team; away: Team } | null>(null);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [sponsorLogo, setSponsorLogo] = useState<string | undefined>();
  const [adBanner, setAdBanner] = useState<string | undefined>();
  const [scoreboardTemplate, setScoreboardTemplate] = useState<string>('default');
  const [monetization, setMonetization] = useState<Monetization>({ model: 'free' });
  const [commentaryStyle, setCommentaryStyle] = useState<CommentaryStyle>('professional');
  const [commentaryLanguage, setCommentaryLanguage] = useState<CommentaryLanguage>('english');
  const [broadcastStyles, setBroadcastStyles] = useState<BroadcastStyle[]>([]);
  const [matchType, setMatchType] = useState<'league' | 'knockout'>('league');
  const [leagueName, setLeagueName] = useState<string>('');
  const [matchDate, setMatchDate] = useState<string>('');
  const [matchTimeOfDay, setMatchTimeOfDay] = useState<string>('');
  const [venue, setVenue] = useState<string>('');
  const [weather, setWeather] = useState<WeatherCondition>('Clear');

  const [loadedState, setLoadedState] = useState<MatchState | null>(null);

  const handleSetupComplete = (
    homeTeam: Team, awayTeam: Team, template: string, monetization: Monetization, commentaryStyle: CommentaryStyle,
    commentaryLanguage: CommentaryLanguage, broadcastStyles: BroadcastStyle[], matchType: 'league' | 'knockout',
    officials: Official[], leagueName: string, matchDate: string, matchTimeOfDay: string, venue: string,
    weather: WeatherCondition, sponsorLogo?: string, adBanner?: string
  ) => {
    setTeams({ home: homeTeam, away: awayTeam });
    setScoreboardTemplate(template);
    setMonetization(monetization);
    setCommentaryStyle(commentaryStyle);
    setCommentaryLanguage(commentaryLanguage);
    setBroadcastStyles(broadcastStyles);
    setMatchType(matchType);
    setOfficials(officials);
    setLeagueName(leagueName);
    setMatchDate(matchDate);
    setMatchTimeOfDay(matchTimeOfDay);
    setVenue(venue);
    setWeather(weather);
    setSponsorLogo(sponsorLogo);
    setAdBanner(adBanner);
    setLoadedState(null); 
    setMatchPhase('lineup');
  };

  const handleLoadMatch = (savedState: MatchState) => {
    setLoadedState(savedState);
    setMatchPhase('live');
  };

  const handleLineupsConfirmed = (homeTeam: Team, awayTeam: Team) => {
    setTeams({ home: homeTeam, away: awayTeam });
    setMatchPhase('calibration');
  };

  const handleEndMatch = () => {
    setMatchPhase('postMatch');
  };

  const handleReturnToSetup = () => {
    setTeams(null);
    setLoadedState(null);
    setMatchPhase('setup');
  }

  const matchContextProps = {
    homeTeam: teams?.home,
    awayTeam: teams?.away,
    initialState: loadedState,
    sponsorLogo: sponsorLogo,
    adBanner: adBanner,
    scoreboardTemplate: scoreboardTemplate,
    monetization: monetization,
    commentaryStyle: commentaryStyle,
    commentaryLanguage: commentaryLanguage,
    broadcastStyles: broadcastStyles,
    matchType: matchType,
    officials: officials,
    leagueName: leagueName,
    matchDate: matchDate,
    matchTimeOfDay: matchTimeOfDay,
    venue: venue,
    weather: weather,
  };

  switch (matchPhase) {
    case 'setup':
      return <SetupScreen onSetupComplete={handleSetupComplete} onLoadMatch={handleLoadMatch} onLogout={onLogout} />;
    case 'lineup':
      if (!teams) return null;
      return (
        <LineupScreen
          homeTeam={teams.home}
          awayTeam={teams.away}
          onLineupsConfirmed={handleLineupsConfirmed}
          leagueName={leagueName}
          matchDate={matchDate}
          matchTimeOfDay={matchTimeOfDay}
          venue={venue}
        />
      );
    case 'calibration':
      return (
        <MatchContextProvider {...matchContextProps}>
          <CalibrationScreen onCalibrationComplete={() => setMatchPhase('live')} />
        </MatchContextProvider>
      );
    case 'live':
      return (
        <MatchContextProvider {...matchContextProps}>
          <MatchScreen onEndMatch={handleEndMatch} />
          <SocialMediaModalWrapper />
          <ShareModalWrapper />
        </MatchContextProvider>
      );
    case 'postMatch':
      return (
        <MatchContextProvider {...matchContextProps}>
          <PostMatchScreen onReturnToSetup={handleReturnToSetup} />
          <SocialMediaModalWrapper />
        </MatchContextProvider>
      );
    default:
      return <p>Invalid match phase</p>;
  }
};


const App: React.FC = () => {
  const { setIsPro } = useProContext();

  const deepLinkData = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const matchDataParam = urlParams.get('matchData');
    const isFanViewParam = urlParams.get('view');

    if (matchDataParam && isFanViewParam === 'true') {
      try {
        const decodedData = decode(matchDataParam);
        const jsonString = new TextDecoder().decode(decodedData);
        const matchDetails = JSON.parse(jsonString);
        return { matchDetails, isFanView: true };
      } catch (e) {
        console.error("Failed to parse deep link data:", e);
        return null;
      }
    }
    return null;
  }, []);

  if (deepLinkData) {
    return (
      <MatchContextProvider initialState={deepLinkData.matchDetails} isFanView={true}>
        <FanViewScreen />
      </MatchContextProvider>
    );
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setIsGuest(false);
    setIsPro(true);
  };
  
  const handleGuest = () => {
    setIsAuthenticated(true);
    setIsGuest(true);
    setIsPro(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsGuest(false);
    setIsPro(false);
  };
  
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} onGuest={handleGuest} />;
  }

  return <MainApplication onLogout={handleLogout} />;
};

const AppWrapper: React.FC = () => (
  <ProContextProvider>
    <UpgradeModal />
    <App />
  </ProContextProvider>
);

export default AppWrapper;

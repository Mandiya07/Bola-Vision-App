
import React, { useState, useEffect } from 'react';
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
import { MailIcon, LockIcon, LogoutIcon, UserIcon } from './components/icons/ControlIcons';
import { decode } from './utils/mediaUtils';

type MatchPhase = 'setup' | 'lineup' | 'calibration' | 'live' | 'postMatch' | 'fanView';


const AuthScreen: React.FC<{ onLogin: () => void; onGuest: () => void }> = ({ onLogin, onGuest }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This is a mock authentication. In a real app, you'd call an API.
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

const MainApplication: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
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
  const [loadedMatchState, setLoadedMatchState] = useState<MatchState | null>(null);
  const [matchType, setMatchType] = useState<'league' | 'knockout'>('league');
  const [leagueName, setLeagueName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTimeOfDay, setMatchTimeOfDay] = useState('');
  const [venue, setVenue] = useState('');
  const [weather, setWeather] = useState<WeatherCondition>('Clear');
  const { isPro, setIsPro } = useProContext();

  useEffect(() => {
    const handleDeepLink = () => {
      const params = new URLSearchParams(window.location.search);
      const matchDataParam = params.get('matchData');
      const isFanView = params.get('view') === 'true';

      if (matchDataParam) {
        try {
          // UTF-8 safe base64 decoding
          const decodedBytes = decode(matchDataParam);
          const decodedJson = new TextDecoder().decode(decodedBytes);
          const matchDetails = JSON.parse(decodedJson);

          // Handle broadcast tier: 'main' gets temporary Pro access.
          if (matchDetails.broadcastTier === 'main' && !isFanView) {
            console.log("Main Broadcast detected. Granting temporary Pro access.");
            setIsPro(true);
          } else {
            // 'fan' or undefined tier uses the free version, unless user is logged in
            if (!localStorage.getItem('bolavision_user')) {
                setIsPro(false);
            }
          }

          const emptyStats = { goals: 0, assists: 0, shots: 0, passes: 0, tackles: 0, saves: 0 };
          
          const homeTeam: Team = {
            ...matchDetails.homeTeam,
            players: matchDetails.homeTeam.players.map((p: Omit<Player, 'stats'>) => ({ ...p, stats: { ...emptyStats } }))
          };

          const awayTeam: Team = {
            ...matchDetails.awayTeam,
            players: matchDetails.awayTeam.players.map((p: Omit<Player, 'stats'>) => ({ ...p, stats: { ...emptyStats } }))
          };
          
          const commonSetup = {
              homeTeam,
              awayTeam,
              template: matchDetails.scoreboardTemplate || 'default',
              monetization: matchDetails.monetization || { model: 'free' },
              style: matchDetails.commentaryStyle || 'professional',
              lang: matchDetails.commentaryLanguage || 'english',
              styles: matchDetails.broadcastStyles || [],
              matchType: matchDetails.matchType || 'league',
              officials: matchDetails.officials || [],
              leagueName: matchDetails.leagueName || '',
              matchDate: matchDetails.matchDate || '',
              matchTimeOfDay: matchDetails.matchTimeOfDay || '',
              venue: matchDetails.venue || '',
              weather: matchDetails.weather || 'Clear',
              sponsorLogo: matchDetails.sponsorLogo,
              adBanner: matchDetails.adBanner
          };

          if (isFanView) {
            handleMatchSetup(
                commonSetup.homeTeam, commonSetup.awayTeam, commonSetup.template,
                commonSetup.monetization, commonSetup.style, commonSetup.lang,
                commonSetup.styles, commonSetup.matchType, commonSetup.officials,
                commonSetup.leagueName, commonSetup.matchDate, commonSetup.matchTimeOfDay,
                commonSetup.venue, commonSetup.weather, commonSetup.sponsorLogo,
                commonSetup.adBanner, true
            );
          } else {
            handleMatchSetup(
                commonSetup.homeTeam, commonSetup.awayTeam, commonSetup.template,
                commonSetup.monetization, commonSetup.style, commonSetup.lang,
                commonSetup.styles, commonSetup.matchType, commonSetup.officials,
                commonSetup.leagueName, commonSetup.matchDate, commonSetup.matchTimeOfDay,
                commonSetup.venue, commonSetup.weather, commonSetup.sponsorLogo,
                commonSetup.adBanner, false
            );
          }

        } catch (error) {
          console.error("Failed to parse deep link match data:", error);
           if (!localStorage.getItem('bolavision_user')) {
                setIsPro(false);
           }
        }
      }
    };

    handleDeepLink();
  }, [setIsPro]); 


  const handleMatchSetup = (homeTeam: Team, awayTeam: Team, template: string, monetization: Monetization, style: CommentaryStyle, lang: CommentaryLanguage, styles: BroadcastStyle[], matchType: 'league' | 'knockout', officials: Official[], leagueName: string, matchDate: string, matchTimeOfDay: string, venue: string, weather: WeatherCondition, sponsorLogo?: string, adBanner?: string, isFanView: boolean = false) => {
    setTeams({ home: homeTeam, away: awayTeam });
    setSponsorLogo(sponsorLogo);
    setAdBanner(adBanner);
    setScoreboardTemplate(template);
    setMonetization(monetization);
    setCommentaryStyle(style);
    setCommentaryLanguage(lang);
    setBroadcastStyles(styles);
    setMatchType(matchType);
    setOfficials(officials);
    setLeagueName(leagueName);
    setMatchDate(matchDate);
    setMatchTimeOfDay(matchTimeOfDay);
    setVenue(venue);
    setWeather(weather);
    setLoadedMatchState(null); // Clear any previously loaded state
    setMatchPhase(isFanView ? 'fanView' : 'lineup');
  };
  
  const handleLoadMatch = (savedState: MatchState) => {
    setLoadedMatchState(savedState);
    setTeams(null); // Clear any new team setup
    setOfficials(savedState.officials || []);
    setLeagueName(savedState.leagueName || '');
    setMatchDate(savedState.matchDate || '');
    setMatchTimeOfDay(savedState.matchTimeOfDay || '');
    setVenue(savedState.venue || '');
    setWeather(savedState.weather || 'Clear');
    setMatchPhase(savedState.fieldMapping ? 'live' : 'calibration');
  };

  const handleLineupsConfirmed = (homeTeam: Team, awayTeam: Team) => {
    setTeams({ home: homeTeam, away: awayTeam });
    setMatchPhase('calibration');
  };
  
  const handleCalibrationComplete = () => {
    setMatchPhase('live');
  };

  const handleEndMatch = () => {
    setMatchPhase('postMatch');
  };

  const handleReturnToSetup = () => {
    setMatchPhase('setup');
    setTeams(null);
    setOfficials([]);
    setSponsorLogo(undefined);
    setAdBanner(undefined);
    setLoadedMatchState(null);
    setLeagueName('');
    setMatchDate('');
    setMatchTimeOfDay('');
    setVenue('');
    setWeather('Clear');
    // Revoke temporary Pro status, but NOT if the user is permanently logged in.
    const user = localStorage.getItem('bolavision_user');
    if (!user) {
      setIsPro(false);
    }
  };
  
  const renderContent = () => {
    const inMatchPhases: MatchPhase[] = ['calibration', 'live', 'postMatch', 'fanView'];

    if (inMatchPhases.includes(matchPhase)) {
       if (!teams && !loadedMatchState) {
         return <SetupScreen onSetupComplete={handleMatchSetup} onLoadMatch={handleLoadMatch} onLogout={onLogout} />;
       }

       const initialTeams = loadedMatchState ? { home: loadedMatchState.homeTeam, away: loadedMatchState.awayTeam } : teams!;
       const isFanView = matchPhase === 'fanView';
      
       return (
          <MatchContextProvider 
              initialState={loadedMatchState ?? undefined} 
              homeTeam={initialTeams.home} 
              awayTeam={initialTeams.away}
              sponsorLogo={loadedMatchState?.sponsorLogo ?? sponsorLogo}
              adBanner={loadedMatchState?.adBanner ?? adBanner}
              scoreboardTemplate={loadedMatchState?.scoreboardTemplate ?? scoreboardTemplate}
              monetization={loadedMatchState?.monetization ?? monetization}
              commentaryStyle={loadedMatchState?.commentaryStyle ?? commentaryStyle}
              commentaryLanguage={loadedMatchState?.commentaryLanguage ?? commentaryLanguage}
              broadcastStyles={loadedMatchState?.broadcastStyles ?? broadcastStyles}
              matchType={loadedMatchState?.matchType ?? matchType}
              officials={loadedMatchState?.officials ?? officials}
              leagueName={loadedMatchState?.leagueName ?? leagueName}
              matchDate={loadedMatchState?.matchDate ?? matchDate}
              matchTimeOfDay={loadedMatchState?.matchTimeOfDay ?? matchTimeOfDay}
              venue={loadedMatchState?.venue ?? venue}
              weather={loadedMatchState?.weather ?? weather}
              isFanView={isFanView}
            >
              {matchPhase === 'fanView' && <FanViewScreen />}
              {matchPhase === 'calibration' && <CalibrationScreen onCalibrationComplete={handleCalibrationComplete} />}
              {matchPhase === 'live' && <MatchScreen onEndMatch={handleEndMatch} />}
              {matchPhase === 'postMatch' && <PostMatchScreen onReturnToSetup={handleReturnToSetup} />}
              <SocialMediaModalWrapper />
              <ShareModalWrapper />
            </MatchContextProvider>
        );
    }
    
    switch (matchPhase) {
      case 'lineup':
        if (teams) {
          return <LineupScreen homeTeam={teams.home} awayTeam={teams.away} leagueName={leagueName} matchDate={matchDate} matchTimeOfDay={matchTimeOfDay} venue={venue} onLineupsConfirmed={handleLineupsConfirmed} />;
        }
        return <SetupScreen onSetupComplete={handleMatchSetup} onLoadMatch={handleLoadMatch} onLogout={onLogout} />;
      
      case 'setup':
      default:
        return <SetupScreen onSetupComplete={handleMatchSetup} onLoadMatch={handleLoadMatch} onLogout={onLogout} />;
    }
  };

  return <>{renderContent()}</>;
};

const AppContent: React.FC = () => {
    const [appState, setAppState] = useState<'checking' | 'auth' | 'main'>('checking');
    const { setIsPro } = useProContext();

    useEffect(() => {
        const user = localStorage.getItem('bolavision_user');
        if (user) {
            setIsPro(true);
            setAppState('main');
        } else {
            setAppState('auth');
        }
    }, [setIsPro]);

    const handleLogin = () => {
        localStorage.setItem('bolavision_user', JSON.stringify({ email: 'pro@bolavision.com', status: 'pro' }));
        setIsPro(true);
        setAppState('main');
    };

    const handleGuest = () => {
        setIsPro(false);
        setAppState('main');
    };
    
    const handleLogout = () => {
        localStorage.removeItem('bolavision_user');
        setIsPro(false);
        setAppState('auth');
    };

    const renderCurrentState = () => {
        switch(appState) {
            case 'checking':
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen">
                        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                );
            case 'auth':
                return <AuthScreen onLogin={handleLogin} onGuest={handleGuest} />;
            case 'main':
                return <MainApplication onLogout={handleLogout} />;
        }
    };
    
    return (
        <>
            {renderCurrentState()}
            <UpgradeModal />
        </>
    );
}

const App: React.FC = () => {
  return (
    <ProContextProvider>
      <div className="min-h-screen bg-gray-900 font-sans">
        <AppContent />
      </div>
    </ProContextProvider>
  );
};

export default App;

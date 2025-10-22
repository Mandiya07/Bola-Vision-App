import React, { useState, useEffect } from 'react';
import type { Player, Team, MatchState, Monetization, CommentaryStyle, CommentaryLanguage, BroadcastStyle, Official, WeatherCondition } from '../types';
import { loadDecryptedState, clearDB } from '../services/storageService';
import { useProContext } from '../context/ProContext';
import { LogoutIcon } from './icons/ControlIcons';

interface SetupScreenProps {
  onSetupComplete: (homeTeam: Team, awayTeam: Team, template: string, monetization: Monetization, commentaryStyle: CommentaryStyle, commentaryLanguage: CommentaryLanguage, broadcastStyles: BroadcastStyle[], matchType: 'league' | 'knockout', officials: Official[], leagueName: string, matchDate: string, matchTimeOfDay: string, venue: string, weather: WeatherCondition, sponsorLogo?: string, adBanner?: string) => void;
  onLoadMatch: (savedState: MatchState) => void;
  onLogout: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete, onLoadMatch, onLogout }) => {
  const [homeTeamName, setHomeTeamName] = useState('Fonteyn FC');
  const [awayTeamName, setAwayTeamName] = useState('Dynamo BC');
  const [homeCoachName, setHomeCoachName] = useState('Coach A');
  const [awayCoachName, setAwayCoachName] = useState('Coach B');
  const [homeFormation, setHomeFormation] = useState('4-3-3');
  const [awayFormation, setAwayFormation] = useState('4-4-2');
  const [homeTeamColor, setHomeTeamColor] = useState('#3b82f6'); // Default Blue
  const [awayTeamColor, setAwayTeamColor] = useState('#ef4444'); // Default Red
  const [homeTeamLogo, setHomeTeamLogo] = useState('');
  const [awayTeamLogo, setAwayTeamLogo] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [adBanner, setAdBanner] = useState('');
  const [officials, setOfficials] = useState({ referee: '', ar1: '', ar2: '', fourth: '' });
  const [leagueName, setLeagueName] = useState('Community League');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchTimeOfDay, setMatchTimeOfDay] = useState('15:00');
  const [venue, setVenue] = useState('Community Arena');
  const [weather, setWeather] = useState<WeatherCondition>('Clear');
  const emptyStats = { goals: 0, assists: 0, shots: 0, passes: 0, tackles: 0, saves: 0 };

  const [homePlayers, setHomePlayers] = useState<Player[]>([
    { number: 9, name: 'Mamba', role: 'Forward', photo: '', stats: { ...emptyStats } },
    { number: 10, name: 'Leo', role: 'Midfielder', photo: '', stats: { ...emptyStats } },
    { number: 11, name: 'Flick', role: 'Forward', photo: '', stats: { ...emptyStats } },
  ]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([
    { number: 7, name: 'Roni', role: 'Forward', photo: '', stats: { ...emptyStats } },
    { number: 1, name: 'Keeper', role: 'Goalkeeper', photo: '', stats: { ...emptyStats } },
    { number: 22, name: 'Bolt', role: 'Defender', photo: '', stats: { ...emptyStats } },
  ]);

  const [newHomePlayerName, setNewHomePlayerName] = useState('');
  const [newHomePlayerNumber, setNewHomePlayerNumber] = useState('');
  const [newHomePlayerRole, setNewHomePlayerRole] = useState<Player['role']>('Forward');
  const [homePlayerError, setHomePlayerError] = useState('');
  const [newAwayPlayerName, setNewAwayPlayerName] = useState('');
  const [newAwayPlayerNumber, setNewAwayPlayerNumber] = useState('');
  const [newAwayPlayerRole, setNewAwayPlayerRole] = useState<Player['role']>('Forward');
  const [awayPlayerError, setAwayPlayerError] = useState('');
  
  const [savedMatch, setSavedMatch] = useState<MatchState | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const { isPro, showUpgradeModal } = useProContext();

  const [monetizationModel, setMonetizationModel] = useState<Monetization['model']>('free');
  const [ppvPrice, setPpvPrice] = useState(2.99);
  
  const [commentaryStyle, setCommentaryStyle] = useState<CommentaryStyle>('professional');
  const [commentaryLanguage, setCommentaryLanguage] = useState<CommentaryLanguage>('english');
  const [selectedBroadcastStyles, setSelectedBroadcastStyles] = useState<BroadcastStyle[]>([]);
  const [matchType, setMatchType] = useState<'league' | 'knockout'>('league');

  const [activeTab, setActiveTab] = useState<'teams' | 'match' | 'broadcast'>('teams');

  useEffect(() => {
    const checkForSavedMatch = async () => {
      try {
        const match = await loadDecryptedState();
        if (match) {
          setSavedMatch(match);
        } else {
          setShowSetup(true);
        }
      } catch (error) {
        console.error("Error loading match:", error);
        setShowSetup(true); // Default to setup screen on error
      } finally {
        setIsLoading(false);
      }
    };
    checkForSavedMatch();
  }, []);
  
  const handleStartNew = async () => {
    await clearDB();
    setSavedMatch(null);
    setShowSetup(true);
  };

  const handleLoad = () => {
    if (savedMatch) {
      onLoadMatch(savedMatch);
    }
  };

  const handleAddPlayer = (team: 'home' | 'away') => {
    if (team === 'home') {
        setHomePlayerError(''); // Clear previous error
        if (homePlayers.length >= 15) {
            setHomePlayerError('Maximum of 15 players per team.');
            return;
        }
        const trimmedName = newHomePlayerName.trim();
        if (!trimmedName) {
            setHomePlayerError('Player name cannot be empty.');
            return;
        }
        const num = parseInt(newHomePlayerNumber, 10);
        if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
            setHomePlayerError('Number must be a positive integer.');
            return;
        }
        if (homePlayers.some(p => p.number === num)) {
            setHomePlayerError(`Player number ${num} is already taken.`);
            return;
        }
        
        setHomePlayers([...homePlayers, { name: trimmedName, number: num, role: newHomePlayerRole, photo: '', stats: { ...emptyStats } }].sort((a,b) => a.number - b.number));
        setNewHomePlayerName('');
        setNewHomePlayerNumber('');
    } else { // away team
        setAwayPlayerError(''); // Clear previous error
        if (awayPlayers.length >= 15) {
            setAwayPlayerError('Maximum of 15 players per team.');
            return;
        }
        const trimmedName = newAwayPlayerName.trim();
        if (!trimmedName) {
            setAwayPlayerError('Player name cannot be empty.');
            return;
        }
        const num = parseInt(newAwayPlayerNumber, 10);
        if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
            setAwayPlayerError('Number must be a positive integer.');
            return;
        }
        if (awayPlayers.some(p => p.number === num)) {
            setAwayPlayerError(`Player number ${num} is already taken.`);
            return;
        }
        
        setAwayPlayers([...awayPlayers, { name: trimmedName, number: num, role: newAwayPlayerRole, photo: '', stats: { ...emptyStats } }].sort((a,b) => a.number - b.number));
        setNewAwayPlayerName('');
        setNewAwayPlayerNumber('');
    }
  };

  const handleRemovePlayer = (team: 'home' | 'away', playerNumber: number) => {
    if (team === 'home') {
        setHomePlayers(homePlayers.filter(p => p.number !== playerNumber));
    } else {
        setAwayPlayers(awayPlayers.filter(p => p.number !== playerNumber));
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setter(result);
        };
        reader.readAsDataURL(file);
      }
    };
    
  const handlePlayerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, team: 'home' | 'away', playerNumber: number) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (team === 'home') {
              setHomePlayers(homePlayers.map(p => p.number === playerNumber ? { ...p, photo: result } : p));
          } else {
              setAwayPlayers(awayPlayers.map(p => p.number === playerNumber ? { ...p, photo: result } : p));
          }
        };
        reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await clearDB(); // Clear any old state when a new match is configured

    const allOfficials: Official[] = [
        { name: officials.referee, role: 'Referee' },
        { name: officials.ar1, role: 'Assistant Referee 1' },
        { name: officials.ar2, role: 'Assistant Referee 2' },
        { name: officials.fourth, role: 'Fourth Official' },
    ];
    const officialsArray = allOfficials.filter(o => o.name.trim() !== '');

    const homeTeam: Team = {
      name: homeTeamName,
      coachName: homeCoachName,
      formation: homeFormation,
      players: homePlayers,
      color: homeTeamColor,
      logo: homeTeamLogo,
    };
    const awayTeam: Team = {
      name: awayTeamName,
      coachName: awayCoachName,
      formation: awayFormation,
      players: awayPlayers,
      color: awayTeamColor,
      logo: awayTeamLogo,
    };
    const monetization: Monetization = {
      model: isPro ? monetizationModel : 'free',
      price: isPro && monetizationModel === 'ppv' ? ppvPrice : undefined,
    };
    onSetupComplete(homeTeam, awayTeam, selectedTemplate, monetization, commentaryStyle, commentaryLanguage, selectedBroadcastStyles, matchType, officialsArray, leagueName, matchDate, matchTimeOfDay, venue, weather, sponsorLogo, adBanner);
  };
  
  const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];
  const roles: Player['role'][] = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  const weatherOptions: WeatherCondition[] = ['Clear', 'Cloudy', 'Rain', 'Snow', 'Windy'];
  
  const templates = [
      { id: 'default', name: 'Classic', isPro: false, image: 'https://i.imgur.com/L4N2XCL.png' },
      { id: 'minimal', name: 'Minimal', isPro: true, image: 'https://i.imgur.com/Fqk3qYh.png' },
      { id: 'broadcast', name: 'Broadcast', isPro: true, image: 'https://i.imgur.com/gK98h8v.png' },
  ];

  const commentaryStyles: { id: CommentaryStyle, name: string }[] = [
    { id: 'professional', name: 'Professional' },
    { id: 'fan', name: 'Fan View' },
    { id: 'youth', name: 'Youth' },
    { id: 'comic', name: 'Comic' },
  ];

  const commentaryLanguages: { id: CommentaryLanguage, name: string }[] = [
    { id: 'english', name: 'English' },
    { id: 'spanish', name: 'Spanish' },
    { id: 'french', name: 'French' },
    { id: 'swahili', name: 'Swahili' },
    { id: 'zulu', name: 'Zulu' },
  ];

  const broadcastStyleOptions: { id: BroadcastStyle; name: string; description: string; isPro: boolean }[] = [
      {
          id: 'playerStats',
          name: 'Dynamic Player Stats',
          description: 'Show player stats pop-ups during key moments.',
          isPro: true,
      },
      {
          id: 'winProbability',
          name: 'Live Win Probability',
          description: 'Display a real-time graph of each team\'s chance to win.',
          isPro: true,
      },
      {
          id: 'interactivePolls',
          name: 'Interactive Polls',
          description: 'Engage viewers with live polls for MOTM, best goal, etc.',
          isPro: true,
      }
  ];
  
  const handleTemplateSelect = (templateId: string, isProTemplate: boolean) => {
      if (isProTemplate && !isPro) {
          showUpgradeModal();
      } else {
          setSelectedTemplate(templateId);
      }
  };

  const handleBroadcastStyleToggle = (styleId: BroadcastStyle) => {
    if (!isPro) {
        showUpgradeModal();
        return;
    }
    setSelectedBroadcastStyles(prev =>
        prev.includes(styleId)
            ? prev.filter(s => s !== styleId)
            : [...prev, styleId]
    );
  };
  
  const handleMonetizationSelect = (model: 'ppv' | 'subscription') => {
    if (!isPro) {
        showUpgradeModal();
    } else {
        setMonetizationModel(model);
    }
  };

  const handleStyleSelect = (style: CommentaryStyle) => {
    if (!isPro) {
        showUpgradeModal();
    } else {
        setCommentaryStyle(style);
    }
  };

  const handleLanguageSelect = (lang: CommentaryLanguage) => {
    if (!isPro) {
        showUpgradeModal();
    } else {
        setCommentaryLanguage(lang);
    }
  };

  const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 md:px-6 py-3 font-semibold text-sm md:text-base border-b-4 transition-colors focus:outline-none ${
        isActive
          ? 'border-green-500 text-white'
          : 'border-transparent text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white mt-4">Checking for saved data...</p>
        </div>
    );
  }

  if (!showSetup && savedMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 animate-fade-in">
        <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-8 text-center relative">
            <div className="absolute top-4 right-4">
                <button onClick={onLogout} className="p-2 bg-gray-700 hover:bg-red-600 rounded-full transition-colors group" title="Logout">
                    <LogoutIcon className="w-6 h-6"/>
                </button>
            </div>
          <h1 className="text-5xl font-bold mb-2" style={{ color: '#00e676' }}>BolaVision</h1>
          <p className="text-gray-400 italic mb-6">“Your Game, Our Vision.”</p>
          <h1 className="text-3xl font-bold text-white mb-4">Saved Match Found!</h1>
          <p className="text-gray-300 mb-2 truncate">
            {savedMatch.homeTeam.name} vs {savedMatch.awayTeam.name}
          </p>
          <p className="text-lg font-bold text-yellow-400 mb-6">
            {savedMatch.homeStats.goals} - {savedMatch.awayStats.goals} ({Math.floor(savedMatch.matchTime / 60)}' min)
          </p>
          <button onClick={handleLoad} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 mb-4">
            Load Match
          </button>
          <button onClick={handleStartNew} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">
            Start a New Match
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-xl p-8 animate-fade-in relative">
        <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            <div className="text-right">
                <p className={`font-bold text-sm ${isPro ? 'text-yellow-400' : 'text-gray-300'}`}>{isPro ? 'PRO' : 'GUEST'}</p>
                <p className="text-xs text-gray-400">{isPro ? 'pro@bolavision.com' : 'Not Signed In'}</p>
            </div>
            <button onClick={onLogout} className="p-2 bg-gray-700 hover:bg-red-600 rounded-full transition-colors group" title="Logout">
                <LogoutIcon className="w-6 h-6"/>
            </button>
        </div>
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold" style={{ color: '#00e676' }}>BolaVision</h1>
            <p className="text-gray-400 italic mt-2">“Your Game, Our Vision.”</p>
        </div>
        <h1 className="text-4xl font-bold text-center text-white mb-8 border-t border-gray-700 pt-6">Match Setup</h1>
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center border-b border-gray-700 mb-8">
            <TabButton label="Teams & Players" isActive={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
            <TabButton label="Match & Officials" isActive={activeTab === 'match'} onClick={() => setActiveTab('match')} />
            <TabButton label="Broadcast & Style" isActive={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} />
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'teams' && (
              <div className="animate-fade-in-fast">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Home Team */}
                  <div className="flex flex-col gap-4 bg-gray-700 p-6 rounded-lg">
                    <h2 className="text-2xl font-semibold text-center" style={{ color: homeTeamColor }}>Home Team</h2>
                    <div>
                      <label htmlFor="homeTeamName" className="block text-sm font-medium text-gray-300 mb-1">Team Name</label>
                      <input type="text" id="homeTeamName" value={homeTeamName} onChange={(e) => setHomeTeamName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': homeTeamColor} as React.CSSProperties} required />
                    </div>
                    <div>
                      <label htmlFor="homeCoachName" className="block text-sm font-medium text-gray-300 mb-1">Coach Name</label>
                      <input type="text" id="homeCoachName" value={homeCoachName} onChange={(e) => setHomeCoachName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': homeTeamColor} as React.CSSProperties} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="homeTeamColor" className="block text-sm font-medium text-gray-300 mb-1">Team Color</label>
                        <input type="color" id="homeTeamColor" value={homeTeamColor} onChange={(e) => setHomeTeamColor(e.target.value)} className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer" />
                      </div>
                      <div>
                        <label htmlFor="homeFormation" className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
                        <select id="homeFormation" value={homeFormation} onChange={(e) => setHomeFormation(e.target.value)} className="w-full h-10 bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': homeTeamColor} as React.CSSProperties}>
                          {formations.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Team Logo</label>
                      <div className="flex items-center gap-4">
                        <label htmlFor="homeTeamLogoInput" className="cursor-pointer bg-gray-800 border border-gray-600 rounded-md p-2 flex-grow text-center text-gray-400 hover:bg-gray-900 transition">
                          {homeTeamLogo ? (
                            <img src={homeTeamLogo} alt="Home Team Logo" className="w-16 h-16 object-contain mx-auto" />
                          ) : (
                            <span>Upload Logo</span>
                          )}
                        </label>
                        <input id="homeTeamLogoInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setHomeTeamLogo)} />
                        {homeTeamLogo && <button type="button" onClick={() => setHomeTeamLogo('')} className="text-red-400 hover:text-red-600 font-bold">&times; Remove</button>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mt-2 mb-2">Player Roster</h3>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2 rounded bg-gray-800/50 p-2">
                          {homePlayers.length === 0 && <p className="text-gray-400 text-sm text-center">No players added.</p>}
                          {homePlayers.map(player => (
                              <div key={player.number} className="flex items-center justify-between bg-gray-900 p-2 rounded text-sm">
                                  <div className="flex items-center gap-2">
                                      <label htmlFor={`photo-upload-home-${player.number}`} className="cursor-pointer group relative">
                                          {player.photo ? (
                                              <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover bg-gray-700" />
                                          ) : (
                                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                              </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm12 3a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                                              </svg>
                                          </div>
                                      </label>
                                      <input id={`photo-upload-home-${player.number}`} type="file" accept="image/*" className="hidden" onChange={(e) => handlePlayerPhotoUpload(e, 'home', player.number)} />
                                      <span className="font-mono w-8 text-center" style={{ color: homeTeamColor }}>#{player.number}</span>
                                      <span className="truncate flex-1">{player.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs w-16 text-right">{player.role}</span>
                                    <button type="button" onClick={() => handleRemovePlayer('home', player.number)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none ml-2">&times;</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                          <input type="number" placeholder="No." value={newHomePlayerNumber} onChange={(e) => { setNewHomePlayerNumber(e.target.value); setHomePlayerError(''); }} className="w-16 bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': homeTeamColor} as React.CSSProperties} />
                          <input type="text" placeholder="Player Name" value={newHomePlayerName} onChange={(e) => { setNewHomePlayerName(e.target.value); setHomePlayerError(''); }} className="flex-1 bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': homeTeamColor} as React.CSSProperties} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <select value={newHomePlayerRole} onChange={(e) => setNewHomePlayerRole(e.target.value as Player['role'])} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': homeTeamColor} as React.CSSProperties}>
                              {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button type="button" onClick={() => handleAddPlayer('home')} className="text-white font-bold py-2 px-3 rounded-md text-sm transition" style={{ backgroundColor: homeTeamColor }}>Add</button>
                      </div>
                      <div className="h-5 mt-1">{homePlayerError && <p className="text-red-400 text-xs text-center">{homePlayerError}</p>}</div>
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col gap-4 bg-gray-700 p-6 rounded-lg">
                    <h2 className="text-2xl font-semibold text-center" style={{ color: awayTeamColor }}>Away Team</h2>
                    <div>
                      <label htmlFor="awayTeamName" className="block text-sm font-medium text-gray-300 mb-1">Team Name</label>
                      <input type="text" id="awayTeamName" value={awayTeamName} onChange={(e) => setAwayTeamName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': awayTeamColor} as React.CSSProperties} required />
                    </div>
                    <div>
                      <label htmlFor="awayCoachName" className="block text-sm font-medium text-gray-300 mb-1">Coach Name</label>
                      <input type="text" id="awayCoachName" value={awayCoachName} onChange={(e) => setAwayCoachName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': awayTeamColor} as React.CSSProperties} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="awayTeamColor" className="block text-sm font-medium text-gray-300 mb-1">Team Color</label>
                        <input type="color" id="awayTeamColor" value={awayTeamColor} onChange={(e) => setAwayTeamColor(e.target.value)} className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer" />
                      </div>
                      <div>
                        <label htmlFor="awayFormation" className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
                        <select id="awayFormation" value={awayFormation} onChange={(e) => setAwayFormation(e.target.value)} className="w-full h-10 bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': awayTeamColor} as React.CSSProperties}>
                          {formations.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Team Logo</label>
                      <div className="flex items-center gap-4">
                        <label htmlFor="awayTeamLogoInput" className="cursor-pointer bg-gray-800 border border-gray-600 rounded-md p-2 flex-grow text-center text-gray-400 hover:bg-gray-900 transition">
                          {awayTeamLogo ? (
                            <img src={awayTeamLogo} alt="Away Team Logo" className="w-16 h-16 object-contain mx-auto" />
                          ) : (
                            <span>Upload Logo</span>
                          )}
                        </label>
                        <input id="awayTeamLogoInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAwayTeamLogo)} />
                        {awayTeamLogo && <button type="button" onClick={() => setAwayTeamLogo('')} className="text-red-400 hover:text-red-600 font-bold">&times; Remove</button>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mt-2 mb-2">Player Roster</h3>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2 rounded bg-gray-800/50 p-2">
                          {awayPlayers.length === 0 && <p className="text-gray-400 text-sm text-center">No players added.</p>}
                          {awayPlayers.map(player => (
                              <div key={player.number} className="flex items-center justify-between bg-gray-900 p-2 rounded text-sm">
                                  <div className="flex items-center gap-2">
                                      <label htmlFor={`photo-upload-away-${player.number}`} className="cursor-pointer group relative">
                                          {player.photo ? (
                                              <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover bg-gray-700" />
                                          ) : (
                                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                              </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm12 3a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                                              </svg>
                                          </div>
                                      </label>
                                      <input id={`photo-upload-away-${player.number}`} type="file" accept="image/*" className="hidden" onChange={(e) => handlePlayerPhotoUpload(e, 'away', player.number)} />
                                      <span className="font-mono w-8 text-center" style={{ color: awayTeamColor }}>#{player.number}</span>
                                      <span className="truncate flex-1">{player.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="text-gray-400 text-xs w-16 text-right">{player.role}</span>
                                      <button type="button" onClick={() => handleRemovePlayer('away', player.number)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none ml-2">&times;</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                          <input type="number" placeholder="No." value={newAwayPlayerNumber} onChange={(e) => { setNewAwayPlayerNumber(e.target.value); setAwayPlayerError(''); }} className="w-16 bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': awayTeamColor} as React.CSSProperties} />
                          <input type="text" placeholder="Player Name" value={newAwayPlayerName} onChange={(e) => { setNewAwayPlayerName(e.target.value); setAwayPlayerError(''); }} className="flex-1 bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': awayTeamColor} as React.CSSProperties} />
                      </div>
                      <div className="flex gap-2 mt-2">
                          <select value={newAwayPlayerRole} onChange={(e) => setNewAwayPlayerRole(e.target.value as Player['role'])} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2" style={{'--tw-ring-color': awayTeamColor} as React.CSSProperties}>
                              {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button type="button" onClick={() => handleAddPlayer('away')} className="text-white font-bold py-2 px-3 rounded-md text-sm transition" style={{backgroundColor: awayTeamColor}}>Add</button>
                      </div>
                      <div className="h-5 mt-1">{awayPlayerError && <p className="text-red-400 text-xs text-center">{awayPlayerError}</p>}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'match' && (
              <div className="space-y-6 animate-fade-in-fast">
                 <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-white mb-4">Match Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">League / Competition</label>
                      <input type="text" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Venue / Stadium</label>
                      <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Match Date</label>
                      <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Kick-off Time</label>
                      <input type="time" value={matchTimeOfDay} onChange={(e) => setMatchTimeOfDay(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Weather Conditions</label>
                       <select value={weather} onChange={(e) => setWeather(e.target.value as WeatherCondition)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400">
                          {weatherOptions.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                 <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-white mb-4">Match Officials</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Referee</label>
                        <input type="text" value={officials.referee} onChange={(e) => setOfficials(prev => ({...prev, referee: e.target.value}))} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Asst. Referee 1</label>
                        <input type="text" value={officials.ar1} onChange={(e) => setOfficials(prev => ({...prev, ar1: e.target.value}))} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Asst. Referee 2</label>
                        <input type="text" value={officials.ar2} onChange={(e) => setOfficials(prev => ({...prev, ar2: e.target.value}))} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Fourth Official</label>
                        <input type="text" value={officials.fourth} onChange={(e) => setOfficials(prev => ({...prev, fourth: e.target.value}))} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-400" />
                      </div>
                  </div>
                 </div>

                <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-white mb-4">Match Type</h2>
                   <div className="grid grid-cols-2 gap-4">
                      <button
                          type="button"
                          onClick={() => setMatchType('league')}
                          className={`p-4 rounded-lg text-center font-bold transition ${matchType === 'league' ? 'bg-blue-600 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                      >
                          League
                          <p className="text-xs font-normal text-gray-300 mt-1">Standard match, can end in a draw.</p>
                      </button>
                      <button
                          type="button"
                          onClick={() => setMatchType('knockout')}
                          className={`p-4 rounded-lg text-center font-bold transition ${matchType === 'knockout' ? 'bg-green-600 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                      >
                          Knockout / Cup
                           <p className="text-xs font-normal text-gray-300 mt-1">Goes to extra time & penalties if drawn.</p>
                      </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'broadcast' && (
              <div className="space-y-6 animate-fade-in-fast">
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-yellow-400 mb-4">Sponsorship & Ads</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Match Sponsor Logo</label>
                      <div className="flex items-center gap-4">
                        <label htmlFor="sponsorLogoInput" className="cursor-pointer bg-gray-800 border border-gray-600 rounded-md p-2 flex-grow text-center text-gray-400 hover:bg-gray-900 transition">
                          {sponsorLogo ? (
                            <img src={sponsorLogo} alt="Sponsor Logo" className="w-24 h-16 object-contain mx-auto" />
                          ) : (
                            <span>Upload Logo (e.g., 200x100)</span>
                          )}
                        </label>
                        <input id="sponsorLogoInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setSponsorLogo)} />
                        {sponsorLogo && <button type="button" onClick={() => setSponsorLogo('')} className="text-red-400 hover:text-red-600 font-bold">&times; Remove</button>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Replay Ad Banner</label>
                      <div className="flex items-center gap-4">
                        <label htmlFor="adBannerInput" className="cursor-pointer bg-gray-800 border border-gray-600 rounded-md p-2 flex-grow text-center text-gray-400 hover:bg-gray-900 transition">
                          {adBanner ? (
                            <img src={adBanner} alt="Ad Banner" className="w-24 h-16 object-contain mx-auto" />
                          ) : (
                            <span>Upload Banner (e.g., 300x150)</span>
                          )}
                        </label>
                        <input id="adBannerInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAdBanner)} />
                        {adBanner && <button type="button" onClick={() => setAdBanner('')} className="text-red-400 hover:text-red-600 font-bold">&times; Remove</button>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-yellow-400 mb-4">Monetization 🏆</h2>
                  <p className="text-center text-gray-300 mb-4">Enable Pay-Per-View or Subscription access for this stream. This is a PRO feature.</p>
                  <div className="grid grid-cols-3 gap-4">
                      <button
                          type="button"
                          onClick={() => setMonetizationModel('free')}
                          className={`p-4 rounded-lg text-center font-bold transition ${monetizationModel === 'free' ? 'bg-gray-500 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                      >
                          Free to Watch
                      </button>
                      <button
                          type="button"
                          onClick={() => handleMonetizationSelect('ppv')}
                          className={`p-4 rounded-lg text-center font-bold transition relative ${monetizationModel === 'ppv' && isPro ? 'bg-green-600 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                      >
                          Pay-Per-View
                          {!isPro && <span className="absolute top-1 right-1 text-xs">🏆</span>}
                      </button>
                      <button
                          type="button"
                          onClick={() => handleMonetizationSelect('subscription')}
                          className={`p-4 rounded-lg text-center font-bold transition relative ${monetizationModel === 'subscription' && isPro ? 'bg-blue-600 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                      >
                          Subscription
                          {!isPro && <span className="absolute top-1 right-1 text-xs">🏆</span>}
                      </button>
                  </div>
                  {monetizationModel === 'ppv' && isPro && (
                      <div className="mt-4 animate-fade-in-fast">
                          <label htmlFor="ppvPrice" className="block text-sm font-medium text-gray-300 mb-1 text-center">Set PPV Price (USD)</label>
                          <div className="flex items-center justify-center">
                              <span className="text-gray-400 text-lg mr-2">$</span>
                              <input
                                  type="number"
                                  id="ppvPrice"
                                  value={ppvPrice}
                                  onChange={(e) => setPpvPrice(parseFloat(e.target.value) || 0)}
                                  step="0.01"
                                  min="0.99"
                                  className="w-32 bg-gray-800 border border-gray-600 rounded-md p-2 text-white text-center text-lg font-bold focus:ring-2 focus:ring-green-500"
                              />
                          </div>
                      </div>
                  )}
                </div>
                
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-yellow-400 mb-4">Commentary Settings 🏆</h2>
                  <p className="text-center text-gray-300 mb-4">Choose the style and language for the AI commentator. This is a PRO feature.</p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2 text-center">Commentary Style</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {commentaryStyles.map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => handleStyleSelect(style.id)}
                          className={`p-3 rounded-lg text-center font-bold transition text-sm relative ${commentaryStyle === style.id && isPro ? 'bg-cyan-500 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                        >
                          {style.name}
                          {!isPro && <span className="absolute top-1 right-1 text-xs">🏆</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 text-center">Language</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {commentaryLanguages.map(lang => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => handleLanguageSelect(lang.id)}
                          className={`p-3 rounded-lg text-center font-bold transition text-sm relative ${commentaryLanguage === lang.id && isPro ? 'bg-cyan-500 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-900'}`}
                        >
                          {lang.name}
                          {!isPro && <span className="absolute top-1 right-1 text-xs">🏆</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-yellow-400 mb-4">Scoreboard Template</h2>
                  <p className="text-center text-gray-300 mb-4">Choose a scoreboard template for your match.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {templates.map(template => (
                          <div 
                              key={template.id} 
                              className={`relative border-4 rounded-lg cursor-pointer transition-all ${selectedTemplate === template.id ? 'border-yellow-400 scale-105' : 'border-gray-600 hover:border-gray-500'}`}
                              onClick={() => handleTemplateSelect(template.id, template.isPro)}
                          >
                              <img src={template.image} alt={`${template.name} template`} className="w-full h-auto rounded-md" />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center">
                                  <span className="font-bold">{template.name}</span>
                              </div>
                              {template.isPro && !isPro && (
                                  <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span>🏆</span>
                                      <span>PRO</span>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
                </div>
                
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h2 className="text-2xl font-semibold text-center text-yellow-400 mb-4">Broadcast Enhancements 🏆</h2>
                  <p className="text-center text-gray-300 mb-4">Add professional, AI-driven overlays to your stream. These are PRO features.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {broadcastStyleOptions.map(style => (
                          <div
                              key={style.id}
                              onClick={() => handleBroadcastStyleToggle(style.id)}
                              className={`relative p-4 rounded-lg cursor-pointer transition-all border-2 ${selectedBroadcastStyles.includes(style.id) && isPro ? 'bg-blue-600 border-white' : 'bg-gray-800 border-gray-600 hover:border-gray-500'} ${!isPro ? 'opacity-70' : ''}`}
                          >
                              <h3 className="font-bold text-white">{style.name}</h3>
                              <p className="text-sm text-gray-300 mt-1">{style.description}</p>
                              {!isPro && (
                                  <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span>🏆</span>
                                      <span>PRO</span>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8">
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={homePlayers.length === 0 || awayPlayers.length === 0}>
              Start Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;
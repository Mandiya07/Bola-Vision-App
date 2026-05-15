
import React, { useState, useEffect } from 'react';
import type { Player, Team, MatchState, Monetization, CommentaryStyle, CommentaryLanguage, BroadcastStyle, Official, WeatherCondition } from '../types';
import { loadDecryptedState, clearDB, getSavedVideosList, getDecryptedBlobById, deleteVideo } from '../services/storageService';
import { useProContext } from '../context/ProContext';
import { LogoutIcon, PlayIcon, TrashIcon } from './icons/ControlIcons';

interface SetupScreenProps {
  onSetupComplete: (homeTeam: Team, awayTeam: Team, template: string, monetization: Monetization, commentaryStyle: CommentaryStyle, commentaryLanguage: CommentaryLanguage, broadcastStyles: BroadcastStyle[], matchType: 'league' | 'knockout', officials: Official[], leagueName: string, matchDate: string, matchTimeOfDay: string, venue: string, weather: WeatherCondition, sponsorLogo?: string, adBanner?: string) => void;
  onLoadMatch: (savedState: MatchState) => void;
  onLogout: () => void;
}

// Preview Component for Scoreboard Templates
const TemplatePreview: React.FC<{ id: string }> = ({ id }) => {
  const homeColor = '#3b82f6';
  const awayColor = '#ef4444';

  if (id === 'minimal') {
    return (
        <div className="flex items-center gap-2 glass-panel border-white/10 px-3 py-1.5 rounded-full text-white font-mono shadow-lg transform scale-110">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]"></div>
                <span className="font-display font-black text-sm">2</span>
            </div>
            <div className="flex flex-col items-center px-1">
                <span className="text-[8px] font-display font-bold text-neon-yellow">45:00</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="font-display font-black text-sm">1</span>
                <div className="w-3 h-3 rounded-full bg-neon-emerald shadow-[0_0_8px_rgba(16,255,145,0.5)]"></div>
            </div>
        </div>
    );
  }

  if (id === 'broadcast') {
    return (
        <div className="flex flex-col items-center transform scale-110">
            <div className="text-[8px] font-display font-black text-white/60 bg-slate-950/80 px-2 rounded-t mb-[-1px] z-10 tracking-widest uppercase">LEAGUE</div>
            <div className="flex items-end shadow-2xl">
                <div className="flex items-center p-1 rounded-l border-l border-y border-white/10" style={{ background: `linear-gradient(90deg, ${homeColor}40 0%, transparent 100%)` }}>
                    <span className="text-[10px] font-display font-black text-white px-2 tracking-tighter">HOME</span>
                </div>
                <div className="glass-panel border-white/20 flex items-center px-3 py-1 text-xl font-display font-black text-white">
                    <span>2</span><span className="text-neon-cyan mx-1">:</span><span>1</span>
                </div>
                <div className="flex items-center p-1 rounded-r border-r border-y border-white/10" style={{ background: `linear-gradient(-90deg, ${awayColor}40 0%, transparent 100%)` }}>
                    <span className="text-[10px] font-display font-black text-white px-2 tracking-tighter">AWAY</span>
                </div>
            </div>
            <div className="mt-1 glass-panel border-neon-cyan/30 px-3 rounded-full text-[8px] font-display font-bold text-neon-cyan flex items-center gap-1.5 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_5px_rgba(0,243,255,1)]"></div>
                45:00
            </div>
        </div>
    );
  }

  if (id === 'retro') {
    return (
        <div className="flex items-center gap-2 bg-slate-900 border-2 border-neon-emerald/30 px-3 py-1.5 rounded text-neon-emerald font-mono shadow-lg transform scale-110">
            <span className="font-bold text-xs tracking-tighter">HM</span>
            <span className="font-black text-lg tracking-widest">02-01</span>
            <span className="font-bold text-xs tracking-tighter">AW</span>
            <span className="text-[8px] opacity-70">45:00</span>
        </div>
    );
  }

  // Default / Classic
  return (
    <div className="flex flex-col gap-0.5 font-display select-none transform scale-110">
        <div className="flex items-center justify-between glass-panel border-white/10 text-white/40 text-[8px] font-black uppercase tracking-[0.3em] px-2 py-1 rounded-t border-b-0 w-32">
            <span>PREMIER</span>
            <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_5px_rgba(0,243,255,1)]"></div>
        </div>
        <div className="flex h-8 shadow-2xl rounded-b overflow-hidden border border-white/10">
            <div className="flex-1 flex items-center justify-end bg-slate-900/90 pl-2 pr-1 gap-1 relative border-l-2" style={{ borderColor: homeColor }}>
                <span className="text-white/80 font-display font-bold text-[10px] tracking-tighter">HOME</span>
            </div>
            <div className="flex flex-col items-center justify-center glass-panel border-x border-y-0 border-white/10 px-2">
                <div className="flex items-center gap-1 text-sm font-display font-black text-white leading-none">
                    <span>2</span><span className="text-white/20">-</span><span>1</span>
                </div>
                <div className="text-[6px] font-display font-bold text-neon-emerald tracking-widest">45:00</div>
            </div>
            <div className="flex-1 flex items-center justify-start bg-slate-900/90 pl-1 pr-2 gap-1 relative border-r-2" style={{ borderColor: awayColor }}>
                <span className="text-white/80 font-display font-bold text-[10px] tracking-tighter">AWAY</span>
            </div>
        </div>
    </div>
  );
};

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
  
  const [savedVideos, setSavedVideos] = useState<{ id: string; name: string }[]>([]);
  const [videoToPlay, setVideoToPlay] = useState<{ name: string, url: string } | null>(null);


  useEffect(() => {
    const checkForSavedData = async () => {
      try {
        const [match, videos] = await Promise.all([
          loadDecryptedState(),
          getSavedVideosList()
        ]);
        
        setSavedVideos(videos);

        if (match) {
          setSavedMatch(match);
        } else if (videos.length === 0) {
          // Only go to setup if there's no match AND no videos
          setShowSetup(true);
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
        setShowSetup(true); // Default to setup screen on error
      } finally {
        setIsLoading(false);
      }
    };
    checkForSavedData();
  }, []);
  
  const handleStartNew = async () => {
    await clearDB();
    setSavedMatch(null);
    setSavedVideos([]);
    setShowSetup(true);
  };

  const handleLoad = () => {
    if (savedMatch) {
      onLoadMatch(savedMatch);
    }
  };

  const handlePlayVideo = async (video: { id: string; name: string }) => {
    try {
        const blob = await getDecryptedBlobById(video.id);
        if (blob) {
            const url = URL.createObjectURL(blob);
            setVideoToPlay({ name: video.name, url });
        } else {
            alert('Could not load video. It might have been deleted or corrupted.');
        }
    } catch(e) {
        console.error("Error playing video:", e);
        alert('An error occurred while trying to play the video.');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this recording?')) {
        try {
            await deleteVideo(videoId);
            setSavedVideos(videos => videos.filter(v => v.id !== videoId));
        } catch(e) {
            console.error("Error deleting video:", e);
            alert('Failed to delete video.');
        }
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
    
  const handlePlayerPhotoRemove = (team: 'home' | 'away', playerNumber: number) => {
      if (team === 'home') {
          setHomePlayers(homePlayers.map(p => p.number === playerNumber ? { ...p, photo: '' } : p));
      } else {
          setAwayPlayers(awayPlayers.map(p => p.number === playerNumber ? { ...p, photo: '' } : p));
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
      { id: 'default', name: 'Classic', isPro: false },
      { id: 'minimal', name: 'Minimal', isPro: true },
      { id: 'broadcast', name: 'Broadcast', isPro: true },
      { id: 'retro', name: 'Retro', isPro: false },
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
      className={`relative px-4 md:px-8 py-4 font-display font-black text-xs md:text-sm uppercase tracking-[0.3em] transition-all focus:outline-none group ${
        isActive
          ? 'text-neon-cyan'
          : 'text-white/30 hover:text-white/60'
      }`}
    >
      {label}
      <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-neon-cyan transition-all duration-300 ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 group-hover:opacity-30 group-hover:scale-x-50'}`} />
      {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-neon-cyan/20 blur-md rounded-full" />}
    </button>
  );

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-cyan/10 blur-[120px] rounded-full" />
              <div className="scanline opacity-20" />
            </div>
            <div className="relative">
              <div className="w-24 h-24 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin shadow-[0_0_20px_rgba(0,243,255,0.2)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-neon-emerald/20 border-b-neon-emerald rounded-full animate-spin-slow"></div>
              </div>
            </div>
            <p className="text-neon-cyan font-display font-black uppercase tracking-[0.5em] mt-8 animate-pulse">Initializing Tactical Core...</p>
        </div>
    );
  }

  if (!showSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-emerald/5 blur-[100px] rounded-full" />
          <div className="scanline opacity-10" />
        </div>

        {videoToPlay && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-4" onClick={() => setVideoToPlay(null)}>
                <div className="w-full max-w-5xl glass-panel border-white/10 p-4 rounded-[2rem] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <div className="absolute top-4 right-4 z-10">
                      <button onClick={() => setVideoToPlay(null)} className="p-2 glass-panel border-white/10 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <video key={videoToPlay.url} src={videoToPlay.url} controls autoPlay className="w-full rounded-2xl shadow-2xl" onEnded={() => setVideoToPlay(null)} />
                    <div className="mt-4 flex items-center justify-between px-4">
                      <p className="text-white font-display font-bold uppercase tracking-widest truncate">{videoToPlay.name}</p>
                      <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.3em]">Tactical Playback v2.0</p>
                    </div>
                </div>
            </div>
        )}
        <div className="w-full max-w-md glass-panel border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] p-10 text-center relative z-10 rounded-[3rem]">
            <div className="absolute top-6 right-6">
                <button onClick={onLogout} className="p-3 glass-panel border-white/10 bg-white/5 hover:bg-neon-yellow/20 hover:border-neon-yellow/50 rounded-full transition-all group" title="Logout">
                    <LogoutIcon className="w-6 h-6 text-white/50 group-hover:text-neon-yellow transition-colors"/>
                </button>
            </div>
          <div className="mb-8">
            <h1 className="text-6xl font-display font-black text-neon-cyan uppercase tracking-tighter italic leading-none">BolaVision</h1>
            <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.6em] mt-2">Neural Tactical Interface</p>
          </div>
          
          {savedMatch ? (
            <div className="space-y-6 animate-fade-in">
                <div className="py-6 border-y border-white/5">
                  <h2 className="text-xs font-display font-bold text-white/40 uppercase tracking-[0.4em] mb-4">Active Session Detected</h2>
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-right flex-1">
                      <p className="text-lg font-display font-black text-white uppercase truncate">{savedMatch.homeTeam.name}</p>
                      <div className="h-1 w-full bg-white/5 mt-1 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-cyan" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div className="glass-panel border-white/10 px-4 py-2 rounded-2xl">
                      <span className="text-3xl font-display font-black text-white">{savedMatch.homeStats.goals}</span>
                      <span className="text-white/20 mx-2 text-xl">-</span>
                      <span className="text-3xl font-display font-black text-white">{savedMatch.awayStats.goals}</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-lg font-display font-black text-white uppercase truncate">{savedMatch.awayTeam.name}</p>
                      <div className="h-1 w-full bg-white/5 mt-1 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-emerald" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-display font-bold text-neon-yellow uppercase tracking-[0.3em] mt-4">Match Time: {Math.floor(savedMatch.matchTime / 60)}' MIN</p>
                </div>

                <div className="space-y-3">
                  <button onClick={handleLoad} className="w-full glass-panel border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 text-neon-cyan font-display font-black py-4 px-6 rounded-2xl text-lg uppercase tracking-[0.2em] transition-all hover:scale-105 hover:border-neon-cyan shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                      Resume Session
                  </button>
                  <button onClick={handleStartNew} className="w-full glass-panel border-white/10 bg-white/5 hover:bg-neon-yellow/10 hover:text-neon-yellow text-white/50 font-display font-bold py-3 px-6 rounded-2xl uppercase tracking-widest transition-all">
                      Terminate & New Match
                  </button>
                </div>
            </div>
          ) : (
             <button onClick={() => setShowSetup(true)} className="w-full glass-panel border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 text-neon-cyan font-display font-black py-5 px-6 rounded-3xl text-xl uppercase tracking-[0.3em] transition-all hover:scale-105 hover:border-neon-cyan shadow-[0_0_40px_rgba(0,243,255,0.1)]">
                Initialize New Match
            </button>
          )}
        </div>

        {savedVideos.length > 0 && (
            <div className="w-full max-w-md glass-panel border-white/10 shadow-2xl p-8 mt-8 animate-fade-in-up rounded-[2.5rem] relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-display font-bold text-white/40 uppercase tracking-[0.5em]">Tactical Archives</h2>
                  <span className="text-[10px] font-display font-bold text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded border border-neon-cyan/30">{savedVideos.length} UNITS</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide pr-1">
                    {savedVideos.map(video => (
                        <div key={video.id} className="glass-panel border-white/5 bg-white/5 p-3 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
                            <div className="flex flex-col flex-1 min-w-0 mr-4">
                              <span className="text-sm font-display font-bold text-white/80 group-hover:text-white transition-colors truncate uppercase tracking-tight">{video.name}</span>
                              <span className="text-[8px] font-display font-bold text-white/20 uppercase tracking-widest mt-0.5">MP4 // Tactical Feed</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handlePlayVideo(video)} className="p-2 glass-panel border-neon-cyan/30 bg-neon-cyan/10 hover:bg-neon-cyan/20 rounded-xl text-neon-cyan transition-all" title="Play recording">
                                    <PlayIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteVideo(video.id)} className="p-2 glass-panel border-neon-yellow/30 bg-neon-yellow/10 hover:bg-neon-yellow/20 rounded-xl text-neon-yellow transition-all" title="Delete recording">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.05)_0%,transparent_50%)]" />
        <div className="scanline opacity-10" />
      </div>

      <div className="w-full max-w-5xl glass-panel border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-8 md:p-12 animate-fade-in relative z-10 rounded-[3rem]">
        <div className="absolute top-6 right-6 flex items-center gap-4 z-20">
            <div className="text-right">
                <p className={`font-display font-black text-[10px] tracking-[0.2em] ${isPro ? 'text-neon-yellow' : 'text-white/30'}`}>{isPro ? 'ELITE ACCESS' : 'GUEST MODE'}</p>
                <p className="text-[8px] font-display font-bold text-white/20 uppercase tracking-widest">{isPro ? 'pro@bolavision.ai' : 'Unauthorized'}</p>
            </div>
            <button onClick={onLogout} className="p-3 glass-panel border-white/10 bg-white/5 hover:bg-neon-yellow/20 hover:border-neon-yellow/50 rounded-full transition-all group" title="Logout">
                <LogoutIcon className="w-5 h-5 text-white/40 group-hover:text-neon-yellow transition-colors"/>
            </button>
        </div>

        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter italic leading-none">BolaVision</h1>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/20" />
              <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.6em]">Neural Tactical Interface v4.0</p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/20" />
            </div>
        </div>

        <div className="relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <h1 className="text-2xl md:text-3xl font-display font-black text-center text-white uppercase tracking-[0.3em] italic mb-10 mt-8">Mission Setup</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center border-b border-white/5 mb-12">
            <TabButton label="Squad Manifest" isActive={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
            <TabButton label="Tactical Parameters" isActive={activeTab === 'match'} onClick={() => setActiveTab('match')} />
            <TabButton label="Broadcast Protocol" isActive={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} />
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'teams' && (
              <div className="space-y-12 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Home Team */}
                  <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan/50" />
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-display font-black text-white uppercase tracking-widest italic">Home Squad</h2>
                      <div className="w-10 h-10 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan font-display font-black">H</div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center gap-2 w-28 flex-shrink-0">
                            <label htmlFor="homeTeamLogoInput" className="cursor-pointer glass-panel border-2 border-dashed border-white/10 rounded-2xl w-28 h-28 flex items-center justify-center text-center text-white/30 hover:bg-white/5 hover:border-neon-cyan transition-all group/logo">
                              {homeTeamLogo ? (
                                <img src={homeTeamLogo} alt="Home Team Logo" className="w-full h-full object-contain p-2" />
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <svg className="w-6 h-6 opacity-30 group-hover/logo:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[8px] font-display font-bold uppercase tracking-widest">Upload Logo</span>
                                </div>
                              )}
                            </label>
                            <input id="homeTeamLogoInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setHomeTeamLogo)} />
                            {homeTeamLogo && (
                                <button type="button" onClick={() => setHomeTeamLogo('')} className="text-neon-yellow hover:text-white text-[8px] font-display font-bold uppercase tracking-widest transition-colors">Remove</button>
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                              <label htmlFor="homeTeamName" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Team Designation</label>
                              <input type="text" id="homeTeamName" value={homeTeamName} onChange={(e) => setHomeTeamName(e.target.value)} 
                                className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold uppercase tracking-widest focus:border-neon-cyan transition-all outline-none" required />
                            </div>
                            <div className="space-y-1">
                              <label htmlFor="homeCoachName" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Tactical Lead</label>
                              <input type="text" id="homeCoachName" value={homeCoachName} onChange={(e) => setHomeCoachName(e.target.value)} 
                                className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold uppercase tracking-widest focus:border-neon-cyan transition-all outline-none" />
                            </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="homeTeamColor" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Primary Color</label>
                          <div className="flex items-center gap-3 glass-panel border-white/10 bg-white/5 p-2 rounded-xl">
                            <input type="color" id="homeTeamColor" value={homeTeamColor} onChange={(e) => setHomeTeamColor(e.target.value)} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                            <span className="font-mono text-[10px] text-white/60 uppercase">{homeTeamColor}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="homeFormation" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Tactical Grid</label>
                          <select id="homeFormation" value={homeFormation} onChange={(e) => setHomeFormation(e.target.value)} 
                            className="w-full h-14 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold focus:border-neon-cyan transition-all outline-none appearance-none cursor-pointer">
                            {formations.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-display font-bold text-white/60 uppercase tracking-widest">Active Roster</h3>
                          <span className="text-[10px] font-mono text-neon-cyan">{homePlayers.length} UNITS</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                          {homePlayers.length === 0 && <p className="text-white/20 text-[10px] font-display font-bold uppercase tracking-widest text-center py-4">No units deployed</p>}
                          {homePlayers.map(player => (
                            <div key={player.number} className="flex items-center justify-between glass-panel border-white/5 bg-white/5 p-2 px-4 rounded-xl group/item hover:border-neon-cyan/30 transition-all">
                              <div className="flex items-center gap-3">
                                {player.photo ? (
                                    <div className="relative group/photo">
                                        <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.preventDefault(); handlePlayerPhotoRemove('home', player.number); }}
                                            className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white opacity-0 group-hover/photo:opacity-100 transition-opacity z-10"
                                        >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label htmlFor={`photo-upload-home-${player.number}`} className="cursor-pointer group/photo relative">
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover/photo:text-neon-cyan transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        </div>
                                        <input id={`photo-upload-home-${player.number}`} type="file" accept="image/*" className="hidden" onChange={(e) => handlePlayerPhotoUpload(e, 'home', player.number)} />
                                    </label>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-mono font-bold text-neon-cyan tracking-tighter">#{player.number}</span>
                                    <span className="text-sm font-display font-black text-white/80 uppercase tracking-tight truncate max-w-[120px]">{player.name}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[8px] font-display font-bold text-white/30 uppercase tracking-widest">{player.role}</span>
                                <button type="button" onClick={() => handleRemovePlayer('home', player.number)} className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-neon-yellow/20 rounded-lg text-neon-yellow transition-all">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-6 grid grid-cols-12 gap-2">
                          <input type="number" placeholder="#" value={newHomePlayerNumber} onChange={(e) => setNewHomePlayerNumber(e.target.value)} className="col-span-2 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-neon-cyan transition-all font-mono" />
                          <input type="text" placeholder="Unit Name" value={newHomePlayerName} onChange={(e) => setNewHomePlayerName(e.target.value)} className="col-span-4 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-neon-cyan transition-all font-display font-bold uppercase" />
                          <select value={newHomePlayerRole} onChange={e => setNewHomePlayerRole(e.target.value as Player['role'])} className="col-span-4 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-[10px] text-white outline-none focus:border-neon-cyan transition-all font-display font-bold uppercase appearance-none cursor-pointer">
                            {roles.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                          </select>
                          <button type="button" onClick={() => handleAddPlayer('home')} className="col-span-2 glass-panel border-neon-cyan/30 bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan flex items-center justify-center rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        </div>
                        {homePlayerError && <p className="text-neon-yellow text-[8px] font-display font-bold uppercase tracking-widest mt-2 ml-1">{homePlayerError}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-emerald/50" />
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-display font-black text-white uppercase tracking-widest italic">Away Squad</h2>
                      <div className="w-10 h-10 rounded-full bg-neon-emerald/10 border border-neon-emerald/30 flex items-center justify-center text-neon-emerald font-display font-black">A</div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center gap-2 w-28 flex-shrink-0">
                            <label htmlFor="awayTeamLogoInput" className="cursor-pointer glass-panel border-2 border-dashed border-white/10 rounded-2xl w-28 h-28 flex items-center justify-center text-center text-white/30 hover:bg-white/5 hover:border-neon-emerald transition-all group/logo">
                              {awayTeamLogo ? (
                                <img src={awayTeamLogo} alt="Away Team Logo" className="w-full h-full object-contain p-2" />
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <svg className="w-6 h-6 opacity-30 group-hover/logo:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[8px] font-display font-bold uppercase tracking-widest">Upload Logo</span>
                                </div>
                              )}
                            </label>
                            <input id="awayTeamLogoInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAwayTeamLogo)} />
                            {awayTeamLogo && (
                                <button type="button" onClick={() => setAwayTeamLogo('')} className="text-neon-yellow hover:text-white text-[8px] font-display font-bold uppercase tracking-widest transition-colors">Remove</button>
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                              <label htmlFor="awayTeamName" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Team Designation</label>
                              <input type="text" id="awayTeamName" value={awayTeamName} onChange={(e) => setAwayTeamName(e.target.value)} 
                                className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none" required />
                            </div>
                            <div className="space-y-1">
                              <label htmlFor="awayCoachName" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Tactical Lead</label>
                              <input type="text" id="awayCoachName" value={awayCoachName} onChange={(e) => setAwayCoachName(e.target.value)} 
                                className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none" />
                            </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="awayTeamColor" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Primary Color</label>
                          <div className="flex items-center gap-3 glass-panel border-white/10 bg-white/5 p-2 rounded-xl">
                            <input type="color" id="awayTeamColor" value={awayTeamColor} onChange={(e) => setAwayTeamColor(e.target.value)} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                            <span className="font-mono text-[10px] text-white/60 uppercase">{awayTeamColor}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="awayFormation" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Tactical Grid</label>
                          <select id="awayFormation" value={awayFormation} onChange={(e) => setAwayFormation(e.target.value)} 
                            className="w-full h-14 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold focus:border-neon-emerald transition-all outline-none appearance-none cursor-pointer">
                            {formations.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-display font-bold text-white/60 uppercase tracking-widest">Active Roster</h3>
                          <span className="text-[10px] font-mono text-neon-emerald">{awayPlayers.length} UNITS</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                          {awayPlayers.length === 0 && <p className="text-white/20 text-[10px] font-display font-bold uppercase tracking-widest text-center py-4">No units deployed</p>}
                          {awayPlayers.map(player => (
                            <div key={player.number} className="flex items-center justify-between glass-panel border-white/5 bg-white/5 p-2 px-4 rounded-xl group/item hover:border-neon-emerald/30 transition-all">
                              <div className="flex items-center gap-3">
                                {player.photo ? (
                                    <div className="relative group/photo">
                                        <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.preventDefault(); handlePlayerPhotoRemove('away', player.number); }}
                                            className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white opacity-0 group-hover/photo:opacity-100 transition-opacity z-10"
                                        >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label htmlFor={`photo-upload-away-${player.number}`} className="cursor-pointer group/photo relative">
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover/photo:text-neon-emerald transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        </div>
                                        <input id={`photo-upload-away-${player.number}`} type="file" accept="image/*" className="hidden" onChange={(e) => handlePlayerPhotoUpload(e, 'away', player.number)} />
                                    </label>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-mono font-bold text-neon-emerald tracking-tighter">#{player.number}</span>
                                    <span className="text-sm font-display font-black text-white/80 uppercase tracking-tight truncate max-w-[120px]">{player.name}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[8px] font-display font-bold text-white/30 uppercase tracking-widest">{player.role}</span>
                                <button type="button" onClick={() => handleRemovePlayer('away', player.number)} className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-neon-yellow/20 rounded-lg text-neon-yellow transition-all">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-6 grid grid-cols-12 gap-2">
                          <input type="number" placeholder="#" value={newAwayPlayerNumber} onChange={(e) => setNewAwayPlayerNumber(e.target.value)} className="col-span-2 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-neon-emerald transition-all font-mono" />
                          <input type="text" placeholder="Unit Name" value={newAwayPlayerName} onChange={(e) => setNewAwayPlayerName(e.target.value)} className="col-span-4 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-neon-emerald transition-all font-display font-bold uppercase" />
                          <select value={newAwayPlayerRole} onChange={e => setNewAwayPlayerRole(e.target.value as Player['role'])} className="col-span-4 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-[10px] text-white outline-none focus:border-neon-emerald transition-all font-display font-bold uppercase appearance-none cursor-pointer">
                            {roles.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                          </select>
                          <button type="button" onClick={() => handleAddPlayer('away')} className="col-span-2 glass-panel border-neon-emerald/30 bg-neon-emerald/10 hover:bg-neon-emerald/20 text-neon-emerald flex items-center justify-center rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        </div>
                        {awayPlayerError && <p className="text-neon-yellow text-[8px] font-display font-bold uppercase tracking-widest mt-2 ml-1">{awayPlayerError}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'match' && (
              <div className="animate-fade-in space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan/50" />
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest italic mb-8">Match Parameters</h3>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label htmlFor="leagueName" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">League Designation</label>
                        <input type="text" id="leagueName" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} 
                          className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-cyan transition-all outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="venue" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Tactical Venue</label>
                        <input type="text" id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} 
                          className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-cyan transition-all outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="matchDate" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Deployment Date</label>
                          <input type="date" id="matchDate" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} 
                            className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-mono text-xs focus:border-neon-cyan transition-all outline-none appearance-none" />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="matchTime" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Sync Time</label>
                          <input type="time" id="matchTime" value={matchTimeOfDay} onChange={(e) => setMatchTimeOfDay(e.target.value)} 
                            className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-mono text-xs focus:border-neon-cyan transition-all outline-none appearance-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="weather" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Atmospheric Condition</label>
                          <select id="weather" value={weather} onChange={(e) => setWeather(e.target.value as WeatherCondition)} 
                            className="w-full h-14 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold focus:border-neon-cyan transition-all outline-none appearance-none cursor-pointer">
                            {weatherOptions.map(w => <option key={w} value={w} className="bg-slate-900">{w}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="matchType" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Operation Type</label>
                          <select id="matchType" value={matchType} onChange={(e) => setMatchType(e.target.value as 'league' | 'knockout')} 
                            className="w-full h-14 glass-panel border-white/10 bg-white/5 rounded-xl p-3 text-white font-display font-bold focus:border-neon-cyan transition-all outline-none appearance-none cursor-pointer">
                            <option value="league" className="bg-slate-900">LEAGUE</option>
                            <option value="knockout" className="bg-slate-900">KNOCKOUT</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-emerald/50" />
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest italic mb-8">Field Officials</h3>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label htmlFor="referee" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Chief Arbiter</label>
                        <input type="text" id="referee" value={officials.referee} onChange={(e) => setOfficials(o => ({ ...o, referee: e.target.value }))} 
                          className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="ar1" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Arbiter Alpha</label>
                          <input type="text" id="ar1" value={officials.ar1} onChange={(e) => setOfficials(o => ({ ...o, ar1: e.target.value }))} 
                            className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="ar2" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Arbiter Beta</label>
                          <input type="text" id="ar2" value={officials.ar2} onChange={(e) => setOfficials(o => ({ ...o, ar2: e.target.value }))} 
                            className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="fourth" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Reserve Arbiter</label>
                        <input type="text" id="fourth" value={officials.fourth} onChange={(e) => setOfficials(o => ({ ...o, fourth: e.target.value }))} 
                          className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'broadcast' && (
              <div className="animate-fade-in space-y-10">
                <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan/50" />
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest italic">Scoreboard Interface</h3>
                    <span className="text-[10px] font-mono text-neon-cyan uppercase tracking-widest">Select Visual Overlay</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {templates.map(template => (
                      <div key={template.id} onClick={() => handleTemplateSelect(template.id, template.isPro)}
                        className={`relative glass-panel border-2 rounded-2xl overflow-hidden cursor-pointer transition-all group ${selectedTemplate === template.id ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_30px_rgba(0,255,255,0.2)]' : 'border-white/5 hover:border-white/20 bg-white/5'}`}>
                        
                        <div className="h-40 w-full relative flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black group-hover:from-slate-800 transition-all">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5" />
                          </div>
                          
                          <div className="scale-75 origin-center transition-transform group-hover:scale-90 relative z-10">
                            <TemplatePreview id={template.id} />
                          </div>
                        </div>

                        <div className="p-4 flex items-center justify-between border-t border-white/5 bg-black/40">
                          <span className="text-xs font-display font-bold text-white uppercase tracking-widest">{template.name}</span>
                          {template.isPro && (
                            <span className="text-[8px] font-display font-black bg-neon-yellow/20 text-neon-yellow px-2 py-1 rounded-md border border-neon-yellow/30">PRO</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-emerald/50" />
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest italic mb-8">AI Commentary Engine</h3>
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                          Narrative Style {!isPro && <span className="text-neon-yellow">🏆</span>}
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {commentaryStyles.map(style => (
                            <button key={style.id} type="button" onClick={() => handleStyleSelect(style.id)}
                              className={`px-5 py-2.5 text-[10px] font-display font-bold uppercase tracking-widest rounded-xl transition-all border ${commentaryStyle === style.id ? 'bg-neon-emerald/20 text-neon-emerald border-neon-emerald/50 shadow-[0_0_20px_rgba(16,255,145,0.1)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white/60'}`}>
                              {style.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label htmlFor="commentaryLanguage" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                          Output Language {!isPro && <span className="text-neon-yellow">🏆</span>}
                        </label>
                        <select id="commentaryLanguage" value={commentaryLanguage} onChange={(e) => handleLanguageSelect(e.target.value as CommentaryLanguage)}
                          className="w-full h-14 glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-emerald transition-all outline-none appearance-none cursor-pointer">
                          {commentaryLanguages.map(lang => <option key={lang.id} value={lang.id} className="bg-slate-900">{lang.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                          Broadcast Overlays {!isPro && <span className="text-neon-yellow">🏆</span>}
                        </label>
                        <div className="space-y-3">
                          {broadcastStyleOptions.map(style => (
                            <div key={style.id} onClick={() => handleBroadcastStyleToggle(style.id)}
                              className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 border ${selectedBroadcastStyles.includes(style.id) ? 'bg-neon-emerald/10 border-neon-emerald/50 shadow-[0_0_20px_rgba(16,255,145,0.05)]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${selectedBroadcastStyles.includes(style.id) ? 'bg-neon-emerald border-neon-emerald text-black' : 'border-white/20'}`}>
                                {selectedBroadcastStyles.includes(style.id) && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <div>
                                <p className="text-sm font-display font-black text-white uppercase tracking-widest">{style.name}</p>
                                <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">{style.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-yellow/50" />
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest italic mb-8">Monetization & Sponsorship {!isPro && <span className="text-neon-yellow">🏆</span>}</h3>
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Monetization Model</label>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setMonetizationModel('free')} 
                            className={`flex-1 text-center p-4 rounded-xl font-display font-bold uppercase tracking-widest transition-all border ${monetizationModel === 'free' ? 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/50 shadow-[0_0_20px_rgba(255,255,0,0.1)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}>
                            Free
                          </button>
                          <button type="button" onClick={() => handleMonetizationSelect('ppv')} 
                            className={`flex-1 text-center p-4 rounded-xl font-display font-bold uppercase tracking-widest transition-all border ${monetizationModel === 'ppv' ? 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/50 shadow-[0_0_20px_rgba(255,255,0,0.1)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}>
                            Pay-Per-View
                          </button>
                        </div>
                        {monetizationModel === 'ppv' && isPro && (
                          <div className="mt-4 animate-fade-in">
                            <label htmlFor="ppvPrice" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Access Fee ($)</label>
                            <input type="number" id="ppvPrice" value={ppvPrice} onChange={e => setPpvPrice(parseFloat(e.target.value))} step="0.01" min="0" 
                              className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-mono text-sm focus:border-neon-yellow transition-all outline-none" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label htmlFor="sponsorLogo" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Sponsor Identity URL</label>
                        <input type="text" id="sponsorLogo" value={sponsorLogo} onChange={(e) => setSponsorLogo(e.target.value)} placeholder="https://example.com/logo.png" 
                          className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-yellow transition-all outline-none" disabled={!isPro} />
                        {sponsorLogo && (
                          <div className="mt-4 p-4 glass-panel border-white/5 bg-white/5 rounded-2xl flex items-center justify-center">
                            <img src={sponsorLogo} alt="Sponsor Preview" className="max-h-20 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label htmlFor="adBanner" className="text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.3em] ml-1">Ad Banner URL</label>
                        <input type="text" id="adBanner" value={adBanner} onChange={(e) => setAdBanner(e.target.value)} placeholder="https://example.com/ad.png" 
                          className="w-full glass-panel border-white/10 bg-white/5 rounded-xl p-4 text-white font-display font-bold uppercase tracking-widest focus:border-neon-yellow transition-all outline-none" disabled={!isPro} />
                        {adBanner && (
                          <div className="mt-4 p-4 glass-panel border-white/5 bg-white/5 rounded-2xl flex items-center justify-center">
                            <img src={adBanner} alt="Ad Preview" className="max-h-24 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
          <div className="mt-12 pt-12 border-t border-white/5 text-center">
            <button type="submit" className="group relative px-16 py-6 bg-neon-cyan text-black font-display font-black uppercase tracking-[0.4em] italic rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,255,255,0.3)] hover:shadow-[0_0_100px_rgba(0,255,255,0.5)]">
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <span className="relative z-10 flex items-center gap-4">
                Initiate Match Protocol
                <PlayIcon className="w-7 h-7" />
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;
